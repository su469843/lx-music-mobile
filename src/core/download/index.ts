import { getMusic } from '@/core/music'
import { getMusicUrl } from '@/core/music'
import { downloadFile } from '@/utils/download'
import { createDir, exists } from '@/utils/fs'
import { join } from 'path'
import { getDownloadPath } from '@/utils/data'
import { toMD5 } from '@/utils/tools'
import { createTasksTools } from '@/utils/common'
import settingState from '@/store/setting/state'

export interface DownloadMusicInfo extends LX.Music.MusicInfo {
  progress: number
  status: 'pending' | 'downloading' | 'paused' | 'error' | 'completed'
  statusText: string
  filePath?: string
}

const downloadingTasks = new Map<string, {
  promise: Promise<void>
  cancelFn: () => void
}>()

const downloadTasksTools = createTasksTools<string, void>()

/**
 * 获取下载目录
 */
export const getDownloadDir = async() => {
  const downloadPath = await getDownloadPath()
  if (!await exists(downloadPath)) await createDir(downloadPath)
  return downloadPath
}

/**
 * 获取音乐文件名
 */
const getMusicFileName = (musicInfo: LX.Music.MusicInfo, type: LX.Quality): string => {
  return `${musicInfo.name} - ${musicInfo.singer}.${type == 'flac' || type == 'flac24bit' ? 'flac' : 'mp3'}`
}

/**
 * 下载音乐
 */
export const downloadMusic = async(musicInfo: LX.Music.MusicInfo): Promise<void> => {
  const id = musicInfo.id
  if (downloadingTasks.has(id)) return
  
  const type = settingState.setting['download.quality'] || '320k'
  
  try {
    const downloadDir = await getDownloadDir()
    const fileName = getMusicFileName(musicInfo, type as LX.Quality)
    const filePath = join(downloadDir, fileName)
    
    // 检查文件是否已存在
    if (await exists(filePath)) {
      global.app_event.emit('downloadUpdate', {
        id,
        progress: 100,
        status: 'completed',
        statusText: '已下载',
        filePath,
      })
      return
    }
    
    // 获取音乐URL
    const url = await getMusicUrl(musicInfo, type as LX.Quality)
    if (!url) throw new Error('获取音乐URL失败')
    
    // 创建下载任务
    const { promise, cancelFn } = downloadFile(url, filePath, (progress) => {
      global.app_event.emit('downloadUpdate', {
        id,
        progress,
        status: 'downloading',
        statusText: `下载中 ${progress.toFixed(2)}%`,
      })
    })
    
    downloadingTasks.set(id, { promise, cancelFn })
    
    global.app_event.emit('downloadUpdate', {
      id,
      progress: 0,
      status: 'downloading',
      statusText: '下载中 0%',
    })
    
    await promise
    
    global.app_event.emit('downloadUpdate', {
      id,
      progress: 100,
      status: 'completed',
      statusText: '下载完成',
      filePath,
    })
  } catch (err: any) {
    global.app_event.emit('downloadUpdate', {
      id,
      progress: 0,
      status: 'error',
      statusText: `下载失败: ${err.message}`,
    })
  } finally {
    downloadingTasks.delete(id)
  }
}

/**
 * 暂停下载
 */
export const pauseDownload = (id: string): void => {
  const task = downloadingTasks.get(id)
  if (!task) return
  
  task.cancelFn()
  downloadingTasks.delete(id)
  
  global.app_event.emit('downloadUpdate', {
    id,
    status: 'paused',
    statusText: '已暂停',
  })
}

/**
 * 取消下载
 */
export const cancelDownload = (id: string): void => {
  pauseDownload(id)
}

/**
 * 批量下载
 */
export const batchDownloadMusic = async(musicList: LX.Music.MusicInfo[]): Promise<void> => {
  for (const music of musicList) {
    await downloadTasksTools.addTask(music.id, () => downloadMusic(music))
  }
} 