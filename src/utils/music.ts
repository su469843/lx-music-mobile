import { existsFile } from './fs'


export const getDownloadFilePath = async(musicInfo: LX.Download.ListItem, savePath: string) => {
  const fileName = appSetting['download.fileName']
    .replace('歌名', musicInfo.metadata.musicInfo.name)
    .replace('歌手', musicInfo.metadata.musicInfo.singer)
    .replace(/[\\/:*?"<>|]/g, '_') + '.mp3'

  const fullPath = path.join(savePath, fileName)
  await RNFS.mkdir(savePath)
  return fullPath
}

export const getLocalFilePath = async(musicInfo: LX.Music.MusicInfoLocal): Promise<string> => {
  return (await existsFile(musicInfo.meta.filePath)) ? musicInfo.meta.filePath : ''
}
