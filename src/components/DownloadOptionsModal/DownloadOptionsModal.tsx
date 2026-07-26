import { useState, useMemo, useRef, useImperativeHandle, forwardRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
} from 'react-native'
import Modal from 'react-native-modal'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { useSettingValue } from '@/store/setting/hook'
import { updateSetting } from '@/core/common'
import { addDownload, getAvailableQualities } from '@/core/download/manager'
import { toast } from '@/utils/tools'
import CheckBox from '../common/CheckBox'
import { Icon } from '../common/Icon'
import { createStyle } from '@/utils/tools'

export interface DownloadOptionsInfo {
  musicInfo: LX.Music.MusicInfoOnline
  selectedList?: LX.Music.MusicInfoOnline[]
}

export interface DownloadOptionsModalType {
  show: (info: DownloadOptionsInfo) => void
}

export interface DownloadOptionsModalProps {
  onDownloadComplete?: () => void
}

const QUALITY_LABELS: Record<string, string> = {
  '128k': '128k',
  '192k': '192k',
  '320k': '320k',
  'flac': 'FLAC',
  'flac24bit': 'FLAC 24bit',
  'ape': 'APE',
  'wav': 'WAV',
}

const LYRIC_TYPE_OPTIONS = [
  { id: 'none', labelKey: 'setting_download_lyric_type_none' },
  { id: 'embed', labelKey: 'setting_download_lyric_type_embed' },
  { id: 'lrc', labelKey: 'setting_download_lyric_type_lrc' },
  { id: 'both', labelKey: 'setting_download_lyric_type_both' },
]

const FOLDER_STRUCTURE_OPTIONS = [
  { id: 'flat', labelKey: 'setting_download_folder_structure_flat' },
  { id: 'singer', labelKey: 'setting_download_folder_structure_singer' },
  { id: 'album', labelKey: 'setting_download_folder_structure_album' },
  { id: 'singer_album', labelKey: 'setting_download_folder_structure_singer_album' },
]

export default forwardRef<DownloadOptionsModalType, DownloadOptionsModalProps>(
  ({ onDownloadComplete }, ref) => {
    const t = useI18n()
    const theme = useTheme()
    const [visible, setVisible] = useState(false)
    const [info, setInfo] = useState<DownloadOptionsInfo | null>(null)
    const [selectedQuality, setSelectedQuality] = useState<LX.Quality>('')
    const [selectedLyricType, setSelectedLyricType] = useState<'none' | 'embed' | 'lrc' | 'both'>('lrc')
    const [isEmbedCover, setIsEmbedCover] = useState(true)
    const [selectedFolderStructure, setSelectedFolderStructure] = useState<'flat' | 'singer' | 'album' | 'singer_album'>('flat')
    const [isLoading, setIsLoading] = useState(false)

    const defaultQuality = useSettingValue('download.quality')
    const defaultLyricType = useSettingValue('download.lyricType')
    const defaultIsEmbedCover = useSettingValue('download.isEmbedCover')
    const defaultFolderStructure = useSettingValue('download.folderStructure')

    const availableQualities = useMemo(() => {
      if (!info?.musicInfo) return []
      return getAvailableQualities(info.musicInfo)
    }, [info?.musicInfo])

    useImperativeHandle(ref, () => ({
      show(downloadInfo: DownloadOptionsInfo) {
        const musicInfo = downloadInfo.musicInfo
        
        // 重置为默认设置
        setSelectedQuality(defaultQuality || '128k')
        setSelectedLyricType((defaultLyricType as 'none' | 'embed' | 'lrc' | 'both') || 'lrc')
        setIsEmbedCover(defaultIsEmbedCover ?? true)
        setSelectedFolderStructure((defaultFolderStructure as 'flat' | 'singer' | 'album' | 'singer_album') || 'flat')
        
        // 如果没有可用音质，使用默认音质
        const qualities = getAvailableQualities(musicInfo)
        if (qualities.length > 0 && !qualities.find(q => q.type === defaultQuality)) {
          setSelectedQuality(qualities[0].type)
        }
        
        setInfo(downloadInfo)
        setVisible(true)
      },
    }))

    const handleDownload = async () => {
      if (!info || isLoading) return
      
      setIsLoading(true)
      const musicList = info.selectedList?.length ? info.selectedList : [info.musicInfo]
      let successCount = 0
      let errorMessages: string[] = []

      try {
        for (const music of musicList) {
          if (music.source === 'local') {
            toast(t('download_local_music_not_supported') || '本地音乐无需下载')
            continue
          }
          
          try {
            // 临时更新设置以应用到下载
            const prevLyricType = useSettingValue('download.lyricType')
            const prevIsEmbedCover = useSettingValue('download.isEmbedCover')
            const prevFolderStructure = useSettingValue('download.folderStructure')
            
            await updateSetting({
              'download.lyricType': selectedLyricType,
              'download.isEmbedCover': isEmbedCover,
              'download.folderStructure': selectedFolderStructure,
            })
            
            await addDownload(music, selectedQuality)
            successCount++
            
            // 恢复设置
            await updateSetting({
              'download.lyricType': prevLyricType,
              'download.isEmbedCover': prevIsEmbedCover,
              'download.folderStructure': prevFolderStructure,
            })
          } catch (e: any) {
            if (e.message !== 'cancelled') {
              errorMessages.push(`${music.name}: ${e.message || t('download_failed') || '下载失败'}`)
            }
          }
        }
        
        if (successCount > 0) {
          toast(`${t('download_added') || '已添加下载任务'} (${successCount})`)
          onDownloadComplete?.()
        }
        
        if (errorMessages.length > 0) {
          // 显示错误信息
          Alert.alert(t('download_failed') || '下载失败', errorMessages.join('\n'))
        }
      } finally {
        setIsLoading(false)
        setVisible(false)
      }
    }

    const handleCancel = () => {
      setVisible(false)
    }

    if (!visible || !info) return null

    const musicInfo = info.musicInfo
    const isMultiple = info.selectedList && info.selectedList.length > 1

    return (
      <Modal
        isVisible={visible}
        onBackdropPress={handleCancel}
        onBackButtonPress={handleCancel}
        backdropOpacity={0.5}
        backdropTransitionInTiming={200}
        backdropTransitionOutTiming={200}
        animationInTiming={300}
        animationOutTiming={200}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        style={styles.modal}
      >
        <View style={[styles.container, { backgroundColor: theme['c-page-background'] }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme['c-font'] }]}>
              {t('download_options') || '下载选项'}
            </Text>
            <TouchableOpacity onPress={handleCancel} style={styles.closeBtn}>
              <Icon name="close" size={24} color={theme['c-font']} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
            {/* 歌曲信息 */}
            <View style={styles.musicInfo}>
              {musicInfo.meta?.coverImgUrl && (
                <Image
                  source={{ uri: musicInfo.meta.coverImgUrl }}
                  style={styles.coverImage}
                  resizeMode="cover"
                />
              )}
              <View style={styles.musicInfoText}>
                <Text style={[styles.musicName, { color: theme['c-font'] }]} numberOfLines={1}>
                  {musicInfo.name}
                </Text>
                <Text style={[styles.musicSinger, { color: theme['c-sub-font'] }]} numberOfLines={1}>
                  {musicInfo.singer}
                </Text>
                {musicInfo.meta?.albumName && (
                  <Text style={[styles.musicAlbum, { color: theme['c-sub-font'] }]} numberOfLines={1}>
                    {musicInfo.meta.albumName}
                  </Text>
                )}
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: theme['c-divider'] }]} />

            {/* 音质选择 */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme['c-font'] }]}>
                {t('setting_download_quality') || '下载音质'}
              </Text>
              <View style={styles.optionGrid}>
                {availableQualities.map((q) => (
                  <TouchableOpacity
                    key={q.type}
                    onPress={() => setSelectedQuality(q.type)}
                    style={[
                      styles.qualityBtn,
                      selectedQuality === q.type && styles.qualityBtnActive,
                      { backgroundColor: selectedQuality === q.type ? theme['c-primary'] : theme['c-primary-input-background'] },
                      { borderColor: selectedQuality === q.type ? theme['c-primary'] : theme['c-divider'] },
                    ]}
                  >
                    <Text
                      style={[
                        styles.qualityBtnText,
                        { color: selectedQuality === q.type ? '#fff' : theme['c-font'] },
                      ]}
                    >
                      {QUALITY_LABELS[q.type] || q.type}
                      {q.size && <Text style={styles.qualitySize}> ({q.size})</Text>}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: theme['c-divider'] }]} />

            {/* 歌词选项 */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme['c-font'] }]}>
                {t('setting_download_lyric_type') || '下载歌词'}
              </Text>
              <View style={styles.optionList}>
                {LYRIC_TYPE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => setSelectedLyricType(opt.id as 'none' | 'embed' | 'lrc' | 'both')}
                    style={styles.optionItem}
                  >
                    <CheckBox
                      check={selectedLyricType === opt.id}
                      onChange={() => setSelectedLyricType(opt.id as 'none' | 'embed' | 'lrc' | 'both')}
                    />
                    <Text style={[styles.optionLabel, { color: theme['c-font'] }]}>
                      {t(opt.labelKey)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: theme['c-divider'] }]} />

            {/* 封面选项 */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme['c-font'] }]}>
                {t('setting_download_embed_cover') || '嵌入封面'}
              </Text>
              <TouchableOpacity
                onPress={() => setIsEmbedCover(!isEmbedCover)}
                style={styles.optionItem}
              >
                <CheckBox
                  check={isEmbedCover}
                  onChange={() => setIsEmbedCover(!isEmbedCover)}
                />
                <Text style={[styles.optionLabel, { color: theme['c-font'] }]}>
                  {t('setting_download_embed_cover_desc') || '将封面嵌入音频文件（如不支持则保存为同名.jpg）'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.divider, { backgroundColor: theme['c-divider'] }]} />

            {/* 文件夹结构 */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme['c-font'] }]}>
                {t('setting_download_folder_structure') || '文件夹结构'}
              </Text>
              <View style={styles.optionList}>
                {FOLDER_STRUCTURE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => setSelectedFolderStructure(opt.id as 'flat' | 'singer' | 'album' | 'singer_album')}
                    style={styles.optionItem}
                  >
                    <CheckBox
                      check={selectedFolderStructure === opt.id}
                    />
                    <Text style={[styles.optionLabel, { color: theme['c-font'] }]}>
                      {t(opt.labelKey)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* 底部按钮 */}
          <View style={[styles.bottomBar, { backgroundColor: theme['c-page-background'] }]}>
            <TouchableOpacity
              onPress={handleCancel}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelBtnText} color={theme['c-sub-font']}>
                {t('cancel') || '取消'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDownload}
              disabled={isLoading}
              style={[
                styles.downloadBtn,
                { backgroundColor: theme['c-primary'] },
                isLoading && styles.downloadBtnDisabled,
              ]}
            >
              {isLoading ? (
                <Text style={styles.downloadBtnTextLoading}>{t('downloading') || '下载中...'}</Text>
              ) : (
                <Text style={styles.downloadBtnText}>
                  {t('download') || '下载'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    )
  }
)

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    justifyContent: 'flex-end',
    margin: 0,
  },
  container: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    maxHeight: '60%',
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  musicInfo: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  coverImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  musicInfoText: {
    flex: 1,
    justifyContent: 'center',
  },
  musicName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  musicSinger: {
    fontSize: 14,
    marginBottom: 2,
  },
  musicAlbum: {
    fontSize: 12,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  qualityBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
  },
  qualityBtnActive: {
    borderWidth: 2,
  },
  qualityBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
  qualitySize: {
    fontSize: 11,
    fontWeight: 'normal',
    opacity: 0.8,
  },
  optionList: {
    gap: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  optionLabel: {
    fontSize: 15,
    marginLeft: 8,
    flex: 1,
  },
  bottomBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '500',
  },
  downloadBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadBtnDisabled: {
    opacity: 0.6,
  },
  downloadBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  downloadBtnTextLoading: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
})
