import { memo, useMemo, useRef } from 'react'
import { StyleSheet, View, TouchableOpacity } from 'react-native'

import Section from '../../components/Section'
import SubTitle from '../../components/SubTitle'
import CheckBoxItem from '../../components/CheckBoxItem'
import CheckBox from '@/components/common/CheckBox'
import ChoosePath, { type ChoosePathType } from '@/components/common/ChoosePath'
import Text from '@/components/common/Text'
import { useSettingValue } from '@/store/setting/hook'
import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { TRY_QUALITYS_LIST } from '@/core/music/utils'


// 默认下载音质
const useQualityActive = (id: LX.Quality) => {
  const q = useSettingValue('download.quality')
  const isActive = useMemo(() => q == id, [q, id])
  return isActive
}

const QualityItem = ({ id, name }: {
  id: LX.Quality
  name: string
}) => {
  const isActive = useQualityActive(id)
  return <CheckBox marginRight={8} check={isActive} label={name} onChange={() => { updateSetting({ 'download.quality': id }) }} need />
}

const DownloadQuality = memo(() => {
  const t = useI18n()
  const playQualityList = useMemo(() => {
    return [...TRY_QUALITYS_LIST, '128k'].reverse() as LX.Quality[]
  }, [])

  return (
    <SubTitle title={t('setting_download_quality')}>
      <View style={styles.list}>
        {playQualityList.map(q => <QualityItem name={q} id={q} key={q} />)}
      </View>
    </SubTitle>
  )
})

// 下载歌词
type LyricType = 'none' | 'embed' | 'lrc' | 'both'

const useLyricTypeActive = (id: LyricType) => {
  const lyricType = useSettingValue('download.lyricType')
  const isActive = useMemo(() => lyricType == id, [lyricType, id])
  return isActive
}

const LyricTypeItem = ({ id, name }: {
  id: LyricType
  name: string
}) => {
  const isActive = useLyricTypeActive(id)
  return <CheckBox marginRight={8} check={isActive} label={name} onChange={() => { updateSetting({ 'download.lyricType': id }) }} need />
}

const DownloadLyricType = memo(() => {
  const t = useI18n()

  return (
    <SubTitle title={t('setting_download_lyric_type')}>
      <View style={styles.list}>
        <LyricTypeItem id="none" name={t('setting_download_lyric_type_none')} />
        <LyricTypeItem id="embed" name={t('setting_download_lyric_type_embed')} />
        <LyricTypeItem id="lrc" name={t('setting_download_lyric_type_lrc')} />
        <LyricTypeItem id="both" name={t('setting_download_lyric_type_both')} />
      </View>
    </SubTitle>
  )
})


export default memo(() => {
  const t = useI18n()
  const theme = useTheme()
  const savePath = useSettingValue('download.savePath')
  const isShowQualityPicker = useSettingValue('download.isShowQualityPicker')
  const isEmbedCover = useSettingValue('download.isEmbedCover')
  const choosePathRef = useRef<ChoosePathType>(null)

  const handleChoosePath = () => {
    choosePathRef.current?.show({
      title: t('setting_download_save_path') || '选择下载目录',
      dirOnly: true,
    })
  }

  const handlePathConfirm = (path: string) => {
    updateSetting({ 'download.savePath': path })
  }

  return (
    <Section title={t('setting_download')}>
      {/* 下载目录 — 使用内置文件选择器 */}
      <SubTitle title={t('setting_download_save_path')}>
        <View style={styles.pathRow}>
          <View style={{ ...styles.pathDisplay, backgroundColor: theme['c-primary-input-background'] || 'rgba(0,0,0,0.05)' }}>
            <Text
              style={styles.pathText}
              color={theme['c-500']}
              numberOfLines={2}
            >
              {savePath || (t('setting_download_save_path_placeholder') || '默认：缓存目录/LxMusicDownloads')}
            </Text>
          </View>
          <TouchableOpacity
            style={{ ...styles.pathBtn, backgroundColor: theme['c-primary-background'] }}
            onPress={handleChoosePath}
          >
            <Text size={13} color={theme['c-primary-font'] || '#fff'}>{t('change_position') || '选择'}</Text>
          </TouchableOpacity>
        </View>
      </SubTitle>

      <ChoosePath ref={choosePathRef} onConfirm={handlePathConfirm} />

      <DownloadQuality />
      <CheckBoxItem check={isShowQualityPicker} onChange={value => { updateSetting({ 'download.isShowQualityPicker': value }) }} label={t('setting_download_show_quality_picker')} />
      <DownloadLyricType />
      <CheckBoxItem check={isEmbedCover} onChange={value => { updateSetting({ 'download.isEmbedCover': value }) }} label={t('setting_download_embed_cover')} />
    </Section>
  )
})

const styles = StyleSheet.create({
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  pathRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pathDisplay: {
    flex: 1,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginRight: 8,
  },
  pathText: {
    fontSize: 12,
    lineHeight: 16,
  },
  pathBtn: {
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
})
