import { Platform, PermissionsAndroid } from 'react-native'

/**
 * 请求存储权限
 */
export const requestStoragePermission = async(): Promise<boolean> => {
  if (Platform.OS !== 'android') return true
  
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      {
        title: "存储权限",
        message: "LX Music需要存储权限来下载音乐",
        buttonNeutral: "稍后询问",
        buttonNegative: "取消",
        buttonPositive: "确定"
      }
    )
    return granted === PermissionsAndroid.RESULTS.GRANTED
  } catch (err) {
    console.warn(err)
    return false
  }
} 