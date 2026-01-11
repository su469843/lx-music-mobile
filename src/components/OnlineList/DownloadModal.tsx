import { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react'
import { View, TouchableOpacity, Text } from 'react-native'
import Dialog, { type DialogType } from '@/components/common/Dialog'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import { getMusicUrl } from '@/core/music'
import { toast } from '@/utils/tools'

export interface DownloadQualityInfo {
  quality: LX.Quality
  label: string
  size: string
  url?: string
}

export interface DownloadModalProps {
  onDownload: (musicInfo: LX.Music.MusicInfoOnline, quality: LX.Quality, url: string) => void
}

export interface DownloadModalType {
  show: (musicInfo: LX.Music.MusicInfoOnline) => void
}

const qualityLabels: Record<LX.Quality, string> = {
  '128k': '标准音质',
  '192k': '较高音质',
  '320k': '高品音质',
  flac: '无损音质',
  flac24bit: '无损母带',
}

const DownloadModal = forwardRef<DownloadModalType, DownloadModalProps>(({ onDownload }, ref) => {
  const t = useI18n()
  const theme = useTheme()
  const dialogRef = useRef<DialogType>(null)
  const [musicInfo, setMusicInfo] = useState<LX.Music.MusicInfoOnline | null>(null)
  const [qualities, setQualities] = useState<DownloadQualityInfo[]>([])
  const [loading, setLoading] = useState(false)

  useImperativeHandle(ref, () => ({
    show(musicInfo) {
      setMusicInfo(musicInfo)
      setLoading(true)
      loadQualityOptions(musicInfo)
      requestAnimationFrame(() => {
        dialogRef.current?.setVisible(true)
      })
    },
  }))

  const loadQualityOptions = async (musicInfo: LX.Music.MusicInfoOnline) => {
    const availableQualities: DownloadQualityInfo[] = []
    
    // 检查可用的音质
    if (musicInfo.meta._qualitys['128k']) {
      availableQualities.push({
        quality: '128k',
        label: qualityLabels['128k'],
        size: '~3-5MB',
      })
    }
    if (musicInfo.meta._qualitys['192k']) {
      availableQualities.push({
        quality: '192k',
        label: qualityLabels['192k'],
        size: '~4-6MB',
      })
    }
    if (musicInfo.meta._qualitys['320k']) {
      availableQualities.push({
        quality: '320k',
        label: qualityLabels['320k'],
        size: '~6-10MB',
      })
    }
    if (musicInfo.meta._qualitys.flac) {
      availableQualities.push({
        quality: 'flac',
        label: qualityLabels['flac'],
        size: '~20-40MB',
      })
    }
    if (musicInfo.meta._qualitys.flac24bit) {
      availableQualities.push({
        quality: 'flac24bit',
        label: qualityLabels['flac24bit'],
        size: '~50-100MB',
      })
    }

    setQualities(availableQualities)
    setLoading(false)
  }

  const handleQualitySelect = async (qualityInfo: DownloadQualityInfo) => {
    if (!musicInfo) return
    
    try {
      // 获取对应音质的URL
      const url = await getMusicUrl({ musicInfo, quality: qualityInfo.quality })
      if (!url) {
        toast(t('download_get_url_failed', '获取下载链接失败'))
        return
      }
      
      dialogRef.current?.setVisible(false)
      onDownload(musicInfo, qualityInfo.quality, url)
    } catch (error) {
      console.error('获取下载链接失败:', error)
      toast(t('download_get_url_failed', '获取下载链接失败'))
    }
  }

  const handleHide = () => {
    setMusicInfo(null)
    setQualities([])
  }

  return (
    <Dialog ref={dialogRef} onHide={handleHide} title={t('download', '下载')}>
      {musicInfo ? (
        <View style={styles.content}>
          <View style={styles.musicInfo}>
            <Text style={styles.songName} numberOfLines={1} color={theme['c-850']}>
              {musicInfo.name}
            </Text>
            <Text style={styles.artistName} numberOfLines={1} color={theme['c-650']}>
              {musicInfo.singer}
            </Text>
          </View>

          {loading ? (
            <Text style={styles.loadingText} color={theme['c-650']}>
              {t('loading', '加载中...')}
            </Text>
          ) : (
            <View style={styles.qualityList}>
              {qualities.map((quality) => (
                <TouchableOpacity
                  key={quality.quality}
                  style={styles.qualityItem}
                  onPress={() => handleQualitySelect(quality)}
                >
                  <View style={styles.qualityInfo}>
                    <Text style={styles.qualityLabel} color={theme['c-850']}>
                      {quality.label}
                    </Text>
                    <Text style={styles.qualitySize} color={theme['c-650']}>
                      {quality.size}
                    </Text>
                  </View>
                  <Text style={styles.qualityType} color={theme['c-500']}>
                    {quality.quality}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      ) : null}
    </Dialog>
  )
})

const styles = createStyle({
  content: {
    padding: 15,
    minWidth: 280,
  },
  musicInfo: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  songName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 5,
  },
  artistName: {
    fontSize: 14,
  },
  loadingText: {
    textAlign: 'center',
    padding: 20,
    fontSize: 14,
  },
  qualityList: {
    flexDirection: 'column',
  },
  qualityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  qualityInfo: {
    flex: 1,
  },
  qualityLabel: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  qualitySize: {
    fontSize: 12,
  },
  qualityType: {
    fontSize: 12,
    fontWeight: '400',
  },
})

export default DownloadModal