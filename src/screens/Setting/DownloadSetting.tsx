import React, { useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useGlobalColor } from '@/hooks/useTheme'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'
import { useSettingValue } from '@/store/setting/hook'
import { setSetting } from '@/core/common'
import { getDownloadDir } from '@/core/download'
import { showToast } from '@/utils/tools'

const DownloadSetting = () => {
  const t = useI18n()
  const theme = useGlobalColor()
  const downloadQuality = useSettingValue('download.quality') || '320k'
  const [downloadPath, setDownloadPath] = useState('')
  
  const handleQualityChange = useCallback((quality: LX.Quality) => {
    setSetting('download.quality', quality)
  }, [])
  
  const checkDownloadPath = useCallback(async() => {
    try {
      const path = await getDownloadDir()
      setDownloadPath(path)
    } catch (err: any) {
      showToast(err.message)
    }
  }, [])
  
  React.useEffect(() => {
    checkDownloadPath()
  }, [checkDownloadPath])
  
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{t('download_quality')}</Text>
      <View style={styles.qualityContainer}>
        {(['128k', '320k', 'flac', 'flac24bit'] as const).map(quality => (
          <TouchableOpacity
            key={quality}
            style={[
              styles.qualityItem,
              downloadQuality === quality && { backgroundColor: theme['c-primary-light-100-alpha-900'] }
            ]}
            onPress={() => handleQualityChange(quality)}
          >
            <Text
              style={[
                styles.qualityText,
                downloadQuality === quality && { color: theme['c-primary-font'] }
              ]}
            >
              {quality}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <Text style={styles.sectionTitle}>{t('download_path')}</Text>
      <Text style={styles.pathText}>{downloadPath}</Text>
    </View>
  )
}

const styles = createStyle({
  container: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 15,
  },
  qualityContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  qualityItem: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  qualityText: {
    fontSize: 14,
  },
  pathText: {
    fontSize: 14,
    opacity: 0.7,
  },
})

export default DownloadSetting 