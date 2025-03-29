import RNFS from 'react-native-fs'
import { requestStoragePermission } from './permissions'

/**
 * 下载文件
 * @param url 文件URL
 * @param filePath 保存路径
 * @param progressCallback 进度回调
 * @returns 
 */
export const downloadFile = (
  url: string, 
  filePath: string, 
  progressCallback?: (progress: number) => void
): { promise: Promise<void>, cancelFn: () => void } => {
  // 请求存储权限
  const checkPermission = async() => {
    const hasPermission = await requestStoragePermission()
    if (!hasPermission) throw new Error('没有存储权限')
  }
  
  let downloadTask: RNFS.DownloadResult
  
  const promise = checkPermission().then(() => {
    return new Promise<void>((resolve, reject) => {
      downloadTask = RNFS.downloadFile({
        fromUrl: url,
        toFile: filePath,
        progressDivider: 1,
        progress: (res) => {
          const progress = (res.bytesWritten / res.contentLength) * 100
          progressCallback?.(progress)
        },
        begin: (res) => {
          // 开始下载
        },
      })
      
      downloadTask.promise
        .then(() => resolve())
        .catch(err => reject(err))
    })
  })
  
  return {
    promise,
    cancelFn: () => {
      if (downloadTask) {
        downloadTask.jobId && RNFS.stopDownload(downloadTask.jobId)
      }
    }
  }
} 