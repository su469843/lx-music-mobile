import { downloadFile } from '@/utils/fs'
import { Alert } from 'react-native'
import { toast } from '@/utils/tools'
import { getLyricInfo } from '@/core/music'
import { writeFile } from '@/utils/fs'
import settingState from '@/store/setting/state'

export const handleDownload = async (musicInfo: LX.Music.MusicInfoOnline, quality: LX.Quality, url: string) => {
  try {
    // 生成文件名
    const fileName = `${musicInfo.name} - ${musicInfo.singer}`.replace(/[\\/:*?"<>|]/g, '_')
    
    // 根据音质确定文件扩展名
    let ext = 'mp3'
    if (quality === 'flac' || quality === 'flac24bit') {
      ext = 'flac'
    }
    
    const fullFileName = `${fileName}.${ext}`
    
    // 从设置中获取下载路径
    const downloadPath = settingState.setting['download.savePath']
    
    // 创建下载任务
    const { jobId, promise } = downloadFile(url, `${downloadPath}/${fullFileName}`, {
      progressDivider: 1,
      begin: (res) => {
        console.log('下载开始:', res)
        toast('开始下载...')
      },
      progress: (res) => {
        const progress = Math.round((res.bytesWritten / res.contentLength) * 100)
        console.log(`下载进度: ${progress}%`)
        // TODO: 更新下载列表中的进度
      },
    })
    
    // 等待下载完成
    await promise
    
    toast('下载完成!')
    
    // 如果设置了下载歌词，则下载歌词文件
    if (settingState.setting['download.enableLyric']) {
      try {
        const lyricInfo = await getLyricInfo({ musicInfo })
        if (lyricInfo.lyric) {
          const lyricFileName = `${fileName}.lrc`
          const lyricFilePath = `${downloadPath}/${lyricFileName}`
          await writeFile(lyricFilePath, lyricInfo.lyric, 'utf8')
          toast('歌词下载完成!')
        }
      } catch (lyricError) {
        console.error('歌词下载失败:', lyricError)
        toast('歌词下载失败')
      }
    }
    
    // TODO: 添加到下载列表
    // downloadListActions.addDownloadItem({
    //   id: musicInfo.id,
    //   musicInfo,
    //   quality,
    //   url,
    //   fileName: fullFileName,
    //   filePath: `${downloadPath}/${fullFileName}`,
    //   status: 'completed',
    //   progress: 100,
    // })
    
  } catch (error) {
    console.error('下载失败:', error)
    toast('下载失败')
  }
}