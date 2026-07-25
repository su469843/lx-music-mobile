/**
 * 下载管理器
 * 负责将在线音乐下载到设备本地存储
 * 支持音质选择、歌词下载（嵌入/单独.lrc）、封面保存
 */
import { temporaryDirectoryPath, downloadFile as fsDownloadFile, stopDownload } from '@/utils/fs'
import { mkdir, existsFile, moveFile, writeFile } from '@/utils/fs'
import { getMusicUrl as getOnlineMusicUrl } from '@/core/music/online'
import { getLyricInfo, getPicPath } from '@/core/music'
import { formatMusicName } from '@/utils/tools'
import settingState from '@/store/setting/state'
import { log } from '@/utils/log'
import { Alert } from 'react-native'

export interface DownloadTask {
  id: string
  musicInfo: LX.Music.MusicInfoOnline
  status: 'waiting' | 'downloading' | 'completed' | 'error'
  progress: number
  speed: string
  downloaded: number
  total: number
  error?: string
  jobId: number | null
  quality: LX.Quality
  /** 下载完成后的后续任务状态 */
  postActions: {
    lrc: 'pending' | 'done' | 'skipped'
    cover: 'pending' | 'done' | 'skipped'
  }
  /** 搜索用字段 */
  name: string
  singer: string
}

type Listener = (tasks: DownloadTask[]) => void

const listeners: Set<Listener> = new Set()
let tasks: DownloadTask[] = []
let maxConcurrent = 3

const notify = () => {
  const snapshot = [...tasks]
  for (const listener of listeners) {
    listener(snapshot)
  }
}

export const subscribe = (listener: Listener) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const getTasks = () => [...tasks]

const getSaveDir = async (): Promise<string> => {
  const baseDir = settingState.setting['download.savePath'] || `${temporaryDirectoryPath}/lx-music-downloads`
  await mkdir(baseDir)
  return baseDir
}

const getFileExt = (musicInfo: LX.Music.MusicInfoOnline, quality?: LX.Quality): LX.Download.FileExt => {
  const _qualitys = musicInfo.meta._qualitys
  // 根据选中的音质决定扩展名
  if (quality) {
    if (quality === 'flac24bit' || quality === 'flac') return 'flac'
    if (quality === 'ape') return 'ape'
    if (quality === 'wav') return 'wav'
    return 'mp3'
  }
  // 回退逻辑
  if ((_qualitys as any).flac24bit) return 'flac'
  if ((_qualitys as any).flac) return 'flac'
  if ((_qualitys as any).ape) return 'ape'
  if ((_qualitys as any).wav) return 'wav'
  return 'mp3'
}

const buildFileName = (musicInfo: LX.Music.MusicInfoOnline, ext: string): string => {
  const pattern = settingState.setting['download.fileName'] || '歌名 - 歌手'
  return `${formatMusicName(pattern, musicInfo.name, musicInfo.singer)}.${ext}`
}

const buildLrcFileName = (musicFileName: string): string => {
  const dotIdx = musicFileName.lastIndexOf('.')
  const baseName = dotIdx > 0 ? musicFileName.substring(0, dotIdx) : musicFileName
  return `${baseName}.lrc`
}

const buildCoverFileName = (musicFileName: string): string => {
  const dotIdx = musicFileName.lastIndexOf('.')
  const baseName = dotIdx > 0 ? musicFileName.substring(0, dotIdx) : musicFileName
  return `${baseName}.jpg`
}

/**
 * 下载歌词文件 (.lrc)
 */
const downloadLrcFile = async (task: DownloadTask, saveDir: string, finalPath: string): Promise<void> => {
  try {
    const lyricInfo = await getLyricInfo({
      musicInfo: task.musicInfo,
      isRefresh: false,
    })
    const lrcContent = lyricInfo.lyric
    if (!lrcContent) {
      task.postActions.lrc = 'skipped'
      return
    }
    const lrcPath = `${saveDir}/${buildLrcFileName(finalPath.split('/').pop() || '')}`
    await writeFile(lrcPath, lrcContent, 'utf8')
    task.postActions.lrc = 'done'
  } catch (err) {
    task.postActions.lrc = 'skipped'
    log.error(`[download] 下载歌词失败: ${task.musicInfo.name} - ${task.musicInfo.singer}, 错误: ${(err as Error)?.message || '未知'}`)
  }
}

/**
 * 下载封面图片
 */
const downloadCoverFile = async (task: DownloadTask, saveDir: string, finalPath: string): Promise<void> => {
  try {
    const picUrl = await getPicPath({
      musicInfo: task.musicInfo,
      isRefresh: false,
    })
    if (!picUrl) {
      task.postActions.cover = 'skipped'
      return
    }
    const coverPath = `${saveDir}/${buildCoverFileName(finalPath.split('/').pop() || '')}`
    const { promise } = fsDownloadFile(picUrl, coverPath, {
      connectionTimeout: 15000,
      readTimeout: 15000,
    })
    const result = await promise
    if (result.statusCode === 200) {
      task.postActions.cover = 'done'
    } else {
      task.postActions.cover = 'skipped'
    }
  } catch (err) {
    task.postActions.cover = 'skipped'
    log.error(`[download] 下载封面失败: ${task.musicInfo.name} - ${task.musicInfo.singer}, 错误: ${(err as Error)?.message || '未知'}`)
  }
}

/**
 * 处理下载完成后的后续工作（歌词、封面）
 */
const handlePostDownload = async (task: DownloadTask, saveDir: string, finalPath: string): Promise<void> => {
  const lyricType = settingState.setting['download.lyricType']
  const isEmbedCover = settingState.setting['download.isEmbedCover']

  // 下载歌词
  if (lyricType === 'lrc' || lyricType === 'both') {
    await downloadLrcFile(task, saveDir, finalPath)
  } else {
    task.postActions.lrc = 'skipped'
  }

  // 下载封面（因为无法直接嵌入音频文件，所以存为同名的 .jpg 文件）
  if (isEmbedCover) {
    await downloadCoverFile(task, saveDir, finalPath)
  } else {
    task.postActions.cover = 'skipped'
  }
}

/**
 * 获取歌曲可用音质列表（含大小）
 */
export const getAvailableQualities = (musicInfo: LX.Music.MusicInfoOnline): LX.Music.MusicQualityType[] => {
  return musicInfo.meta.qualitys || []
}

const startOneDownload = async (task: DownloadTask) => {
  try {
    task.status = 'downloading'
    notify()

    // 1. 获取音乐下载 URL（传入指定音质）
    const url = await getOnlineMusicUrl({
      musicInfo: task.musicInfo,
      quality: task.quality,
      isRefresh: false,
    })

    // 2. 准备保存路径
    const ext = getFileExt(task.musicInfo, task.quality)
    const fileName = buildFileName(task.musicInfo, ext)
    const saveDir = await getSaveDir()
    const tempPath = `${saveDir}/.${fileName}.tmp`
    const finalPath = `${saveDir}/${fileName}`

    // 检查是否已存在
    const exists = await existsFile(finalPath)
    if (exists) {
      task.status = 'completed'
      task.progress = 1
      notify()
      // 后续操作（歌词、封面）
      await handlePostDownload(task, saveDir, finalPath)
      notify()
      return
    }

    // 3. 执行下载
    const { jobId, promise } = fsDownloadFile(url, tempPath, {
      progressInterval: 250,
      progress: (res) => {
        task.progress = res.bytesWritten / res.contentLength
        task.downloaded = res.bytesWritten
        task.total = res.contentLength
        const speedBytes = res.bytesWritten - task.downloaded
        const speedKB = speedBytes / 1024
        task.speed = speedKB > 1024
          ? `${(speedKB / 1024).toFixed(1)} MB/s`
          : `${speedKB.toFixed(0)} KB/s`
        notify()
      },
      connectionTimeout: 30000,
      readTimeout: 30000,
    })

    task.jobId = jobId

    const result = await promise
    if (result.statusCode === 200) {
      // 4. 下载完成，移动到最终路径
      await moveFile(tempPath, finalPath)
      task.status = 'completed'
      task.progress = 1
    } else {
      throw new Error(`HTTP ${result.statusCode}`)
    }

    notify()

    // 5. 后续操作（歌词、封面）- 不阻塞主流程
    await handlePostDownload(task, saveDir, finalPath)
  } catch (err: any) {
    task.status = 'error'
    task.error = err.message || String(err)
    log.error(`[download] 下载失败: ${task.musicInfo.name} - ${task.musicInfo.singer}, 音质: ${task.quality}, 错误: ${err.message || String(err)}`)
  }
  notify()
}

/**
 * 添加下载任务（带音质选择）
 */
export const addDownload = async (musicInfo: LX.Music.MusicInfoOnline, quality?: LX.Quality) => {
  // 检查是否已在列表中
  const existing = tasks.find(t => t.musicInfo.id === musicInfo.id)
  if (existing) {
    if (existing.status === 'completed') {
      throw new Error(global.i18n?.t?.('download_already_completed') || '该歌曲已下载完成')
    }
    if (existing.status === 'downloading' || existing.status === 'waiting') {
      throw new Error(global.i18n?.t?.('download_already_in_progress') || '该歌曲正在下载中')
    }
    // 如果是 error 状态，覆盖
    const idx = tasks.indexOf(existing)
    tasks.splice(idx, 1)
  }

  const targetQuality = quality || settingState.setting['download.quality'] || '128k'

  const task: DownloadTask = {
    id: `${musicInfo.id}_${Date.now()}`,
    musicInfo,
    status: 'waiting',
    progress: 0,
    speed: '0 KB/s',
    downloaded: 0,
    total: 0,
    jobId: null,
    quality: targetQuality,
    postActions: {
      lrc: 'pending',
      cover: 'pending',
    },
    name: musicInfo.name,
    singer: musicInfo.singer,
  }
  tasks.push(task)
  notify()

  // 检查并发数
  const runningCount = tasks.filter(t => t.status === 'downloading').length
  if (runningCount < maxConcurrent) {
    // 异步启动下载
    startOneDownload(task).catch(() => {})
  }
}

export const addDownloadMultiple = (musicList: LX.Music.MusicInfoOnline[], quality?: LX.Quality) => {
  const targetQuality = quality || settingState.setting['download.quality'] || '128k'
  let added = 0

  for (const musicInfo of musicList) {
    const existing = tasks.find(t => t.musicInfo.id === musicInfo.id && (t.status === 'completed' || t.status === 'downloading' || t.status === 'waiting'))
    if (existing) continue

    const task: DownloadTask = {
      id: `${musicInfo.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      musicInfo,
      status: 'waiting',
      progress: 0,
      speed: '0 KB/s',
      downloaded: 0,
      total: 0,
      jobId: null,
      quality: targetQuality,
      postActions: {
        lrc: 'pending',
        cover: 'pending',
      },
      name: musicInfo.name,
      singer: musicInfo.singer,
    }
    tasks.push(task)
    added++
  }
  if (added === 0) return
  notify()

  // 启动等待中的任务（每次同时下载 maxConcurrent 个）
  const startWaiting = () => {
    const runningCount = tasks.filter(t => t.status === 'downloading').length
    const waiting = tasks.filter(t => t.status === 'waiting')
    const toStart = waiting.slice(0, Math.max(0, maxConcurrent - runningCount))
    for (const task of toStart) {
      startOneDownload(task).catch(() => {})
    }
  }
  startWaiting()
}

export const removeTask = (taskId: string) => {
  const idx = tasks.findIndex(t => t.id === taskId)
  if (idx === -1) return
  const task = tasks[idx]
  if (task.jobId != null) {
    stopDownload(task.jobId)
  }
  tasks.splice(idx, 1)
  notify()
}

export const clearCompleted = () => {
  tasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'error')
  notify()
}

export const retryTask = (taskId: string) => {
  const task = tasks.find(t => t.id === taskId)
  if (!task || (task.status !== 'error')) return
  task.status = 'waiting'
  task.error = undefined
  task.progress = 0
  task.speed = '0 KB/s'
  task.downloaded = 0
  task.total = 0
  notify()

  const runningCount = tasks.filter(t => t.status === 'downloading').length
  if (runningCount < maxConcurrent) {
    startOneDownload(task).catch(() => {})
  }
}

/**
 * 显示音质选择弹窗
 * @param musicInfo - 歌曲信息
 * @param onSelect - 选择后的回调
 * @param onCancel - 取消时的回调
 */
export const showQualityPicker = (
  musicInfo: LX.Music.MusicInfoOnline,
  onSelect: (quality: LX.Quality) => void,
  onCancel?: () => void,
) => {
  const qualities = musicInfo.meta.qualitys || []
  if (qualities.length === 0) {
    // 没有可选音质，使用默认
    const defaultQuality: LX.Quality = settingState.setting['download.quality'] || '128k'
    onSelect(defaultQuality)
    return
  }

  const qualityLabels: Record<string, string> = {
    '128k': '128k',
    '192k': '192k',
    '320k': '320k',
    'flac': 'FLAC',
    'flac24bit': 'FLAC 24bit',
    'ape': 'APE',
    'wav': 'WAV',
  }

  // 构建按钮列表（Alert 最多支持 3 个按钮，所以分组显示）
  const allButtons: Array<{ text: string; quality: LX.Quality }> = qualities.map(q => ({
    text: `${qualityLabels[q.type] || q.type}${q.size ? ` (${q.size})` : ''}`,
    quality: q.type,
  }))

  if (allButtons.length === 0) {
    onSelect(settingState.setting['download.quality'] || '128k')
    return
  }

  // 分组显示：Alert 每个分组最多 2 个选项 + 1个"更多/取消"
  const showGroup = (buttons: Array<{ text: string; quality: LX.Quality }>, groupIndex: number) => {
    const totalGroups = Math.ceil(buttons.length / 2)
    // 当前组的选项
    const groupButtons = buttons.slice(0, 2)
    const remainingButtons = buttons.slice(2)

    // 处理当前组的选项和"更多"按钮
    const alertButtons: Array<{
      text: string
      onPress: () => void
      style?: 'cancel' | 'destructive' | 'default'
    }> = groupButtons.map(b => ({
      text: b.text,
      onPress: () => onSelect(b.quality),
    }))

    if (remainingButtons.length > 0) {
      alertButtons.push({
        text: global.i18n?.t?.('more') || '更多',
        onPress: () => showGroup(remainingButtons, groupIndex + 1),
      })
    }

    alertButtons.push({
      text: global.i18n?.t?.('cancel') || '取消',
      onPress: () => onCancel?.(),
      style: 'cancel',
    })

    Alert.alert(global.i18n?.t?.('download') || '下载', `${musicInfo.name} - ${musicInfo.singer}`, alertButtons)
  }

  showGroup(allButtons, 0)
}

/**
 * 处理下载（根据设置决定是否弹出音质选择）
 * @param musicInfo - 歌曲信息
 */
export const handleDownloadWithQuality = async (musicInfo: LX.Music.MusicInfoOnline): Promise<void> => {
  if (settingState.setting['download.isShowQualityPicker']) {
    return new Promise<void>((resolve, reject) => {
      showQualityPicker(
        musicInfo,
        (quality) => {
          addDownload(musicInfo, quality).then(resolve).catch(reject)
        },
        () => { reject(new Error('cancelled')) },
      )
    })
  }
  return addDownload(musicInfo)
}

export { stopDownload }
