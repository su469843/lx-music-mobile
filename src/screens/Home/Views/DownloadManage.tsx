import { forwardRef, useImperativeHandle, useState, useEffect } from 'react'
import { View, Text, FlatList, TouchableOpacity } from 'react-native'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import { useSettingValue } from '@/store/setting/hook'
import { Icon } from '@/components/common/Icon'
import { scaleSizeH } from '@/utils/pixelRatio'

// 模拟下载数据
const mockDownloadList: LX.Download.ListItem[] = [
  {
    id: '1',
    isComplate: false,
    status: 'run',
    statusText: '下载中',
    downloaded: 1024 * 1024 * 2.5,
    total: 1024 * 1024 * 8,
    progress: 31,
    speed: '1.2MB/s',
    metadata: {
      musicInfo: {
        id: 'test1',
        name: '示例歌曲1',
        singer: '歌手A',
        source: 'netease',
        interval: '03:45',
        meta: {
          _qualitys: {
            '128k': true,
            '320k': true,
          },
        },
      },
      url: '',
      quality: '320k',
      ext: 'mp3',
      fileName: '示例歌曲1 - 歌手A.mp3',
      filePath: '/storage/emulated/0/Download/lx-music/示例歌曲1 - 歌手A.mp3',
    },
  },
  {
    id: '2',
    isComplate: true,
    status: 'completed',
    statusText: '已完成',
    downloaded: 1024 * 1024 * 5,
    total: 1024 * 1024 * 5,
    progress: 100,
    speed: '',
    metadata: {
      musicInfo: {
        id: 'test2',
        name: '示例歌曲2',
        singer: '歌手B',
        source: 'netease',
        interval: '04:20',
        meta: {
          _qualitys: {
            flac: true,
          },
        },
      },
      url: '',
      quality: 'flac',
      ext: 'flac',
      fileName: '示例歌曲2 - 歌手B.flac',
      filePath: '/storage/emulated/0/Download/lx-music/示例歌曲2 - 歌手B.flac',
    },
  },
  {
    id: '3',
    isComplate: false,
    status: 'pause',
    statusText: '已暂停',
    downloaded: 1024 * 1024 * 1.8,
    total: 1024 * 1024 * 6,
    progress: 30,
    speed: '',
    metadata: {
      musicInfo: {
        id: 'test3',
        name: '示例歌曲3',
        singer: '歌手C',
        source: 'netease',
        interval: '02:55',
        meta: {
          _qualitys: {
            '192k': true,
          },
        },
      },
      url: '',
      quality: '192k',
      ext: 'mp3',
      fileName: '示例歌曲3 - 歌手C.mp3',
      filePath: '/storage/emulated/0/Download/lx-music/示例歌曲3 - 歌手C.mp3',
    },
  },
]

export interface DownloadManageType {
  setVisible: (visible: boolean) => void
}

const DownloadManage = forwardRef<DownloadManageType, {}>((props, ref) => {
  const t = useI18n()
  const theme = useTheme()
  const [visible, setVisible] = useState(false)
  const [downloadList, setDownloadList] = useState<LX.Download.ListItem[]>(mockDownloadList)

  useImperativeHandle(ref, () => ({
    setVisible(visible) {
      setVisible(visible)
    },
  }))

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusColor = (status: LX.Download.DownloadTaskStatus) => {
    switch (status) {
      case 'run': return theme['c-primary']
      case 'completed': return theme['c-success']
      case 'pause': return theme['c-warning']
      case 'error': return theme['c-error']
      default: return theme['c-500']
    }
  }

  const handleToggleDownload = (item: LX.Download.ListItem) => {
    const newList = downloadList.map(downloadItem => {
      if (downloadItem.id === item.id) {
        if (downloadItem.status === 'run') {
          return { ...downloadItem, status: 'pause', statusText: '已暂停', speed: '' }
        } else if (downloadItem.status === 'pause') {
          return { ...downloadItem, status: 'run', statusText: '下载中', speed: '1.2MB/s' }
        }
      }
      return downloadItem
    })
    setDownloadList(newList)
  }

  const handleDeleteDownload = (item: LX.Download.ListItem) => {
    const newList = downloadList.filter(downloadItem => downloadItem.id !== item.id)
    setDownloadList(newList)
  }

  const renderDownloadItem = ({ item }: { item: LX.Download.ListItem }) => (
    <View style={styles.itemContainer}>
      <View style={styles.itemInfo}>
        <View style={styles.musicInfo}>
          <Text style={styles.songName} numberOfLines={1} color={theme['c-850']}>
            {item.metadata.musicInfo.name}
          </Text>
          <Text style={styles.artistName} numberOfLines={1} color={theme['c-650']}>
            {item.metadata.musicInfo.singer} · {item.metadata.quality}
          </Text>
        </View>
        <View style={styles.statusInfo}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.statusText}
          </Text>
          {item.speed ? (
            <Text style={styles.speedText} color={theme['c-500']}>
              {item.speed}
            </Text>
          ) : null}
        </View>
      </View>
      
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${item.progress}%`,
                backgroundColor: getStatusColor(item.status)
              }
            ]} 
          />
        </View>
        <View style={styles.progressInfo}>
          <Text style={styles.progressText} color={theme['c-500']}>
            {formatFileSize(item.downloaded)} / {formatFileSize(item.total)}
          </Text>
          <Text style={styles.progressPercent} color={theme['c-500']}>
            {item.progress}%
          </Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        {!item.isComplate ? (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleToggleDownload(item)}
          >
            <Icon 
              name={item.status === 'run' ? 'minus-box' : 'home'} 
              size={16} 
              color={theme['c-650']} 
            />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDeleteDownload(item)}
        >
          <Icon name="remove" size={16} color={theme['c-650']} />
        </TouchableOpacity>
      </View>
    </View>
  )

  if (!visible) return null

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} color={theme['c-850']}>
          {t('download_manage_title', '下载管理')}
        </Text>
        <Text style={styles.subtitle} color={theme['c-650']}>
          {downloadList.filter(item => item.status === 'run').length} {t('download_running', '正在下载')}
        </Text>
      </View>
      
      <FlatList
        data={downloadList}
        renderItem={renderDownloadItem}
        keyExtractor={item => item.id}
        style={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
})

const styles = createStyle({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  header: {
    padding: 15,
    paddingBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  list: {
    flex: 1,
    padding: 10,
  },
  itemContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  musicInfo: {
    flex: 1,
    marginRight: 10,
  },
  songName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  artistName: {
    fontSize: 13,
  },
  statusInfo: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  speedText: {
    fontSize: 11,
    marginTop: 2,
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  progressText: {
    fontSize: 11,
  },
  progressPercent: {
    fontSize: 11,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
})

export default DownloadManage