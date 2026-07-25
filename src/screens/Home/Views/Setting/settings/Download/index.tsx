import { memo, useMemo } from 'react'
import { StyleSheet, View } from 'react-native'

import Section from '../../components/Section'
import SubTitle from '../../components/SubTitle'
import CheckBoxItem from '../../components/CheckBoxItem'
import InputItem, { type InputItemProps } from '../../components/InputItem'
import CheckBox from '@/components/common/CheckBox'
import { useSettingValue } from '@/store/setting/hook'
import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
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
  const savePath = useSettingValue('download.savePath')
  const isShowQualityPicker = useSettingValue('download.isShowQualityPicker')
  const isEmbedCover = useSettingValue('download.isEmbedCover')

  const setSavePath: InputItemProps['onChanged'] = (value, callback) => {
    callback(value)
    updateSetting({ 'download.savePath': value })
  }

  return (
    <Section title={t('setting_download')}>
      <InputItem
        value={savePath}
        label={t('setting_download_save_path')}
        placeholder={t('setting_download_save_path_placeholder')}
        onChanged={setSavePath}
      />
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
})
