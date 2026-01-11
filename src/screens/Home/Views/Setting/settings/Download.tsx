import { forwardRef, useImperativeHandle, useState } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import { useSettingValue, updateSetting } from '@/store/setting/hook'
import CheckBoxItem from '@/components/common/CheckBoxItem'
import InputItem from '@/components/common/InputItem'
import ChoosePath from '@/components/common/ChoosePath'

export interface DownloadType {
  setActiveId: (id: string) => void
}

const Download = forwardRef<DownloadType, {}>((props, ref) => {
  const t = useI18n()
  const theme = useTheme()
  const savePath = useSettingValue('download.savePath')
  const enableLyric = useSettingValue('download.enableLyric')

  const handlePathChange = (path: string) => {
    updateSetting({ 'download.savePath': path })
  }

  const handleLyricToggle = (enable: boolean) => {
    updateSetting({ 'download.enableLyric': enable })
  }

  useImperativeHandle(ref, () => ({
    setActiveId(id) {
      // 可以在这里处理页面切换逻辑
    },
  }))

  return (
    <View style={styles.container}>
      <Text style={styles.title} color={theme['c-850']}>{t('setting_download_title', '下载设置')}</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle} color={theme['c-650']}>{t('setting_download_path', '下载路径')}</Text>
        <ChoosePath
          value={savePath}
          onChange={handlePathChange}
          placeholder={t('setting_download_path_placeholder', '选择下载路径')}
        />
      </View>

      <View style={styles.section}>
        <CheckBoxItem
          check={enableLyric}
          label={t('setting_download_lyric', '下载歌词文件')}
          onChange={handleLyricToggle}
        />
      </View>
    </View>
  )
})

const styles = createStyle({
  container: {
    flex: 1,
    padding: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 10,
  },
})

export default Download