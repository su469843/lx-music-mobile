/**
 * 下载管理器
 * 负责将在线音乐下载到设备本地存储
 */
import { temporaryDirectoryPath, downloadFile as fsDownloadFile, stopDownload } from '@/utils/fs'
import { mkdir, existsFile, moveFile } from '@/utils/fs'
import { getMusicUrl as getOnlineMusicUrl } from '@/core/music/online'
import { formatMusicName } from '@/utils/tools'
import settingState from '@/store/setting/state'

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
}

type Listener = (tasks: DownloadTask[]) => void

const listeners: Set<Listener> = new Set()
let tasks: DownloadTask[] = []

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

const getFileExt = (musicInfo: LX.Music.MusicInfoOnline): LX.Download.FileExt => {
  const quality = musicInfo.meta._qualitys
  if (quality.flac24bit) return 'flac'
  if (quality.flac) return 'flac'
  if (quality.ape) return 'ape'
  if (quality.wav) return 'wav'
  return 'mp3'
}

const buildFileName = (musicInfo: LX.Music.MusicInfoOnline, ext: string): string => {
  const pattern = settingState.setting['download.fileName'] || '歌名 - 歌手'
  return `${formatMusicName(pattern, musicInfo.name, musicInfo.singer)}.${ext}`
}

const startOneDownload = async (task: DownloadTask) => {
  try {
    task.status = 'downloading'
    notify()

    // 1. 获取音乐下载 URL
    const url = await getOnlineMusicUrl({
      musicInfo: task.musicInfo,
      isRefresh: false,
    })

    // 2. 准备保存路径
    const ext = getFileExt(task.musicInfo)
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
      return
    }

    // 3. 执行下载
    const { jobId, promise } = fsDownloadFile(url, tempPath, {
      progressInterval: 250,
      progress: (res) => {
        task.progress = res.bytesWritten / res.contentLength
        task.downloaded = res.bytesWritten
        task.total = res.contentLength
        const speedKB = (res.bytesWritten - task.downloaded) / 1024
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
  } catch (err: any) {
    task.status = 'error'
    task.error = err.message || String(err)
  }
  notify()
}

export const addDownload = async (musicInfo: LX.Music.MusicInfoOnline) => {
  // 检查是否已在列表中
  const existing = tasks.find(t => t.musicInfo.id === musicInfo.id)
  if (existing) {
    if (existing.status === 'completed') {
      throw new Error(global.i18n?.t?.('download_already_completed') || '该歌曲已下载完成')
    }
    if (existing.status === 'downloading' || existing.status === 'waiting') {
      throw new Error(global.i18n?.t?.('download_already_in_progress') || '该歌曲正在下载中')
    }
    // 如果是 error 状态，重新下载
    const idx = tasks.indexOf(existing)
    tasks.splice(idx, 1)
  }

  const task: DownloadTask = {
    id: `${musicInfo.id}_${Date.now()}`,
    musicInfo,
    status: 'waiting',
    progress: 0,
    speed: '0 KB/s',
    downloaded: 0,
    total: 0,
    jobId: null,
  }
  tasks.push(task)
  notify()

  // 异步启动下载
  startOneDownload(task).catch(() => {})
}

export const addDownloadMultiple = (musicList: LX.Music.MusicInfoOnline[]) => {
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
    }
    tasks.push(task)
  }
  notify()

  // 启动等待中的任务（每次同时下载 3 个）
  const runningCount = tasks.filter(t => t.status === 'downloading').length
  const waiting = tasks.filter(t => t.status === 'waiting')
  const maxConcurrent = 3
  const toStart = waiting.slice(0, Math.max(0, maxConcurrent - runningCount))
  for (const task of toStart) {
    startOneDownload(task).catch(() => {})
  }
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
  startOneDownload(task).catch(() => {})
}
