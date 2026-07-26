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


// ============ 下载音质 ============
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


// ============ 同时下载任务数 ============
const useMaxDownloadActive = (num: number) => {
  const n = useSettingValue('download.maxDownloadNum')
  const isActive = useMemo(() => n == num, [n, num])
  return isActive
}

const MaxDownloadItem = ({ num }: { num: number }) => {
  const isActive = useMaxDownloadActive(num)
  return <CheckBox marginRight={8} check={isActive} label={String(num)} onChange={() => { updateSetting({ 'download.maxDownloadNum': num }) }} need />
}

const DownloadMaxNum = memo(() => {
  const t = useI18n()

  return (
    <SubTitle title={t('setting_download_max_num') || '同时下载任务数'}>
      <View style={styles.list}>
        {[1, 2, 3, 4, 5, 6].map(n => <MaxDownloadItem num={n} key={n} />)}
      </View>
    </SubTitle>
  )
})


// ============ 文件命名方式 ============
type FileNameType = LX.AppSetting['download.fileName']

const useFileNameActive = (id: FileNameType) => {
  const f = useSettingValue('download.fileName')
  const isActive = useMemo(() => f == id, [f, id])
  return isActive
}

const FileNameItem = ({ id, name }: { id: FileNameType, name: string }) => {
  const isActive = useFileNameActive(id)
  return <CheckBox marginRight={8} check={isActive} label={name} onChange={() => { updateSetting({ 'download.fileName': id }) }} need />
}

const DownloadFileName = memo(() => {
  const t = useI18n()

  return (
    <SubTitle title={t('setting_download_name') || '文件命名方式'}>
      <View style={styles.list}>
        <FileNameItem id="歌名 - 歌手" name={t('setting_download_name1') || '歌曲名 - 艺术家'} />
      </View>
      <View style={styles.list}>
        <FileNameItem id="歌手 - 歌名" name={t('setting_download_name2') || '艺术家 - 歌曲名'} />
      </View>
      <View style={styles.list}>
        <FileNameItem id="歌名" name={t('setting_download_name3') || '歌曲名'} />
      </View>
    </SubTitle>
  )
})


// ============ 歌词编码格式 ============
type LrcFormat = LX.AppSetting['download.lrcFormat']

const useLrcFormatActive = (id: LrcFormat) => {
  const f = useSettingValue('download.lrcFormat')
  const isActive = useMemo(() => f == id, [f, id])
  return isActive
}

const LrcFormatItem = ({ id, name }: { id: LrcFormat, name: string }) => {
  const isActive = useLrcFormatActive(id)
  return <CheckBox marginRight={8} check={isActive} label={name} onChange={() => { updateSetting({ 'download.lrcFormat': id }) }} need />
}

const DownloadLrcFormat = memo(() => {
  const t = useI18n()

  return (
    <SubTitle title={t('setting_download_lyric_format') || '下载的歌词文件编码格式'}>
      <View style={styles.list}>
        <LrcFormatItem id="utf8" name={t('setting_download_lyric_format_utf8') || 'UTF-8'} />
        <LrcFormatItem id="gbk" name={t('setting_download_lyric_format_gbk') || 'GBK'} />
      </View>
    </SubTitle>
  )
})


// ============ 歌词下载方式（移动端特有，快捷切换） ============
type LyricType = LX.AppSetting['download.lyricType']

const useLyricTypeActive = (id: LyricType) => {
  const lyricType = useSettingValue('download.lyricType')
  const isActive = useMemo(() => lyricType == id, [lyricType, id])
  return isActive
}

const LyricTypeItem = ({ id, name }: { id: LyricType, name: string }) => {
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


// ============ 主组件 ============
export default memo(() => {
  const t = useI18n()
  const theme = useTheme()
  const savePath = useSettingValue('download.savePath')
  const isEnable = useSettingValue('download.enable')
  const isShowQualityPicker = useSettingValue('download.isShowQualityPicker')
  const skipExistFile = useSettingValue('download.skipExistFile')
  const isSavePathGroupByListName = useSettingValue('download.isSavePathGroupByListName')
  const isUseOtherSource = useSettingValue('download.isUseOtherSource')
  const isEmbedPic = useSettingValue('download.isEmbedPic')
  const isEmbedLyric = useSettingValue('download.isEmbedLyric')
  const isEmbedLyricLx = useSettingValue('download.isEmbedLyricLx')
  const isEmbedLyricT = useSettingValue('download.isEmbedLyricT')
  const isEmbedLyricR = useSettingValue('download.isEmbedLyricR')
  const isDownloadLrc = useSettingValue('download.isDownloadLrc')
  const isDownloadLxLrc = useSettingValue('download.isDownloadLxLrc')
  const isDownloadTLrc = useSettingValue('download.isDownloadTLrc')
  const isDownloadRLrc = useSettingValue('download.isDownloadRLrc')
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
      {/* ======== 1. 启用下载功能 ======== */}
      <CheckBoxItem check={isEnable} onChange={value => { updateSetting({ 'download.enable': value }) }} label={t('setting_download_enable') || '启用下载功能'} />

      {/* ======== 2. 跳过同名文件 ======== */}
      <CheckBoxItem check={skipExistFile} onChange={value => { updateSetting({ 'download.skipExistFile': value }) }} label={t('setting_download_skip_exist_file') || '下载目录存在同名文件时跳过下载此任务'} />

      {/* ======== 3. 按列表名分组保存 ======== */}
      <CheckBoxItem check={isSavePathGroupByListName} onChange={value => { updateSetting({ 'download.isSavePathGroupByListName': value }) }} label={t('setting_download_save_group_list_name') || '将文件保存到以对应列表命名的子目录中'} />

      {/* ======== 4. 下载路径 ======== */}
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

      {/* ======== 5. 下载音质（移动端特有） ======== */}
      <DownloadQuality />

      {/* ======== 6. 下载时弹出音质选择（移动端特有） ======== */}
      <CheckBoxItem check={isShowQualityPicker} onChange={value => { updateSetting({ 'download.isShowQualityPicker': value }) }} label={t('setting_download_show_quality_picker')} />

      {/* ======== 7. 同时下载任务数 ======== */}
      <DownloadMaxNum />

      {/* ======== 8. 自动换源下载 ======== */}
      <CheckBoxItem check={isUseOtherSource} onChange={value => { updateSetting({ 'download.isUseOtherSource': value }) }} label={t('setting_download_use_other_source') || '自动换源下载'} />

      {/* ======== 9. 文件命名方式 ======== */}
      <DownloadFileName />

      {/* ======== 10. 嵌入到音频文件中的内容 ======== */}
      <SubTitle title={t('setting_download_data_embed') || '嵌入到音频文件中的内容'}>
        <CheckBoxItem check={isEmbedCover} onChange={value => { updateSetting({ 'download.isEmbedCover': value }) }} label={t('setting_download_embed_cover') || '嵌入封面'} />
        <CheckBoxItem check={isEmbedPic} onChange={value => { updateSetting({ 'download.isEmbedPic': value }) }} label={t('setting_download_embed_pic') || '嵌入封面（元数据）'} />
        <CheckBoxItem check={isEmbedLyric} onChange={value => { updateSetting({ 'download.isEmbedLyric': value }) }} label={t('setting_download_embed_lyric') || '嵌入歌词'} />
        <View style={styles.indentGroup}>
          <CheckBoxItem check={isEmbedLyric && isEmbedLyricT} onChange={value => { updateSetting({ 'download.isEmbedLyricT': value }) }} disabled={!isEmbedLyric} label={t('setting_download_embed_tlyric') || '同时嵌入翻译歌词（如果有）'} />
          <CheckBoxItem check={isEmbedLyric && isEmbedLyricR} onChange={value => { updateSetting({ 'download.isEmbedLyricR': value }) }} disabled={!isEmbedLyric} label={t('setting_download_embed_rlyric') || '同时嵌入罗马音歌词（如果有）'} />
          <CheckBoxItem check={isEmbedLyric && isEmbedLyricLx} onChange={value => { updateSetting({ 'download.isEmbedLyricLx': value }) }} disabled={!isEmbedLyric} label={t('setting_download_embed_lxlyric') || '同时嵌入 LX Music 歌词（如果有）'} />
        </View>
      </SubTitle>

      {/* ======== 11. 歌词下载方式（移动端特有，快捷切换） ======== */}
      <DownloadLyricType />

      {/* ======== 12. 同时下载歌词文件 ======== */}
      <SubTitle title={t('setting_download_lyric_title') || '同时下载歌词文件'}>
        <CheckBoxItem check={isDownloadLrc} onChange={value => { updateSetting({ 'download.isDownloadLrc': value }) }} label={t('setting__is_enable') || '启用'} />
        <View style={styles.indentGroup}>
          <CheckBoxItem check={isDownloadLrc && isDownloadTLrc} onChange={value => { updateSetting({ 'download.isDownloadTLrc': value }) }} disabled={!isDownloadLrc} label={t('setting_download_tlyric') || '同时将翻译歌词写入歌词文件中（如果有）'} />
          <CheckBoxItem check={isDownloadLrc && isDownloadRLrc} onChange={value => { updateSetting({ 'download.isDownloadRLrc': value }) }} disabled={!isDownloadLrc} label={t('setting_download_rlyric') || '同时将罗马音歌词写入歌词文件中（如果有）'} />
          <CheckBoxItem check={isDownloadLrc && isDownloadLxLrc} onChange={value => { updateSetting({ 'download.isDownloadLxLrc': value }) }} disabled={!isDownloadLrc} label={t('setting_download_lxlyric') || '同时将 LX Music 歌词写入歌词文件中（如果有）'} />
        </View>
      </SubTitle>

      {/* ======== 13. 歌词文件编码格式 ======== */}
      <DownloadLrcFormat />
    </Section>
  )
})

const styles = StyleSheet.create({
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  indentGroup: {
    paddingLeft: 15,
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
