import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { View, FlatList, TouchableOpacity, Modal, Pressable, TextInput } from 'react-native'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import { subscribe, getTasks, removeTask, clearCompleted, retryTask, pauseTask, resumeTask, type DownloadTask } from '@/core/download/manager'
import { confirmDialog } from '@/utils/tools'

type FilterType = 'all' | 'downloading' | 'paused' | 'error' | 'completed'

const FILTER_TABS: FilterType[] = ['all', 'downloading', 'paused', 'error', 'completed']

// 音质标签
const useQualityLabel = (task: DownloadTask): { text: string, type: 'lossless' | 'high' | 'std' } => {
  return useMemo(() => {
    const q = task.quality
    if (q === 'flac24bit') return { text: '24bit', type: 'lossless' }
    if (q === 'flac' || q === 'ape') return { text: 'FLAC', type: 'lossless' }
    if (q === '320k') return { text: '320k', type: 'high' }
    if (q === '192k') return { text: '192k', type: 'high' }
    return { text: '128k', type: 'std' }
  }, [task.quality])
}

const styles = createStyle({
  container: {
    flex: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
  },
  tabsScroll: {
    flex: 1,
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  tabText: {
    fontSize: 13,
  },
  tabBadge: {
    fontSize: 10,
    marginTop: 2,
    opacity: 0.7,
  },
  activeTabUnderline: {
    height: 2,
    borderRadius: 1,
    marginTop: 4,
    width: '60%',
  },
  searchIconBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  list: {
    flex: 1,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.03)',
  },
  itemNum: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
    paddingHorizontal: 8,
  },
  itemName: {
    fontSize: 14,
    marginBottom: 2,
  },
  itemSinger: {
    fontSize: 12,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  itemStatus: {
    alignItems: 'flex-end',
    minWidth: 50,
  },
  itemStatusText: {
    fontSize: 11,
  },
  progressBar: {
    height: 2,
    borderRadius: 1,
    marginTop: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1,
  },
  actionBtn: {
    paddingLeft: 8,
    paddingVertical: 4,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  clearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  qualityTag: {
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginRight: 6,
  },
  qualityTagText: {
    fontSize: 10,
    lineHeight: 14,
  },
  // 搜索弹窗样式
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
  },
  modalSearchBar: {
    marginTop: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  modalCloseBtn: {
    marginLeft: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  modalList: {
    flex: 1,
  },
})

const TaskItem = ({ task, onRemove, onRetry, onPause, onResume }: {
  task: DownloadTask,
  onRemove: (id: string) => void,
  onRetry: (id: string) => void,
  onPause: (id: string) => void,
  onResume: (id: string) => void,
}) => {
  const theme = useTheme()
  const t = useI18n()

  // 空值保护
  const musicInfo = task.musicInfo
  const safeName = musicInfo?.name || (t('unknown') || '未知')
  const safeSinger = musicInfo?.singer || ''
  const safeProgress = task.progress ?? 0
  const safeError = task.error || ''

  // 音质标签
  const qualityInfo = useQualityLabel(task)

  // 状态图标和文本
  const statusDisplay = useMemo(() => {
    switch (task.status) {
      case 'downloading':
        return {
          icon: null,
          text: `${(safeProgress * 100).toFixed(0)}%`,
          color: theme['c-primary-font'],
        }
      case 'waiting':
        return {
          icon: null,
          text: t('waiting') || '等待中',
          color: theme['c-400'],
        }
      case 'paused':
        return {
          icon: 'pause',
          text: t('paused') || '已暂停',
          color: theme['c-500'],
        }
      case 'completed':
        return {
          icon: null,
          text: t('completed') || '下载成功',
          color: '#27ae60',
        }
      case 'error':
        return {
          icon: 'close',
          text: safeError || (t('download_error') || '出错'),
          color: '#e74c3c',
        }
      default:
        return {
          icon: null,
          text: '',
          color: theme['c-400'],
        }
    }
  }, [task.status, safeProgress, safeError, theme, t])

  // 音质标签颜色
  const qualityColors = useMemo(() => {
    switch (qualityInfo.type) {
      case 'lossless':
        return { bg: 'rgba(39, 174, 96, 0.15)', text: '#27ae60' }
      case 'high':
        return { bg: 'rgba(41, 128, 185, 0.15)', text: '#2980b9' }
      default:
        return { bg: 'rgba(0,0,0,0.06)', text: theme['c-500'] }
    }
  }, [qualityInfo, theme])

  return (
    <View style={styles.listItem}>
      {/* 序号 / 播放图标 */}
      <View style={styles.itemNum}>
        {task.status === 'completed' ? (
          <Icon name="music_time" size={14} color="#27ae60" />
        ) : task.status === 'error' ? (
          <Icon name="close" size={13} color="#e74c3c" />
        ) : task.status === 'paused' ? (
          <Icon name="pause" size={13} color={theme['c-500']} />
        ) : (
          <Text size={12} color={theme['c-400']}>{'♪'}</Text>
        )}
      </View>

      {/* 歌曲信息 */}
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={1} color={theme['c-font']}>{safeName}</Text>
        <View style={styles.itemMeta}>
          {/* 音质标签 */}
          <View style={{ ...styles.qualityTag, backgroundColor: qualityColors.bg }}>
            <Text style={styles.qualityTagText} color={qualityColors.text as any}>{qualityInfo.text}</Text>
          </View>
          {/* 歌手 */}
          <Text size={12} color={theme['c-500']} numberOfLines={1} style={{ flex: 1 }}>{safeSinger}</Text>
        </View>
        {/* 进度条 */}
        {task.status === 'downloading' && safeProgress > 0 ? (
          <View style={{ ...styles.progressBar, backgroundColor: theme['c-200'] }}>
            <View style={{ ...styles.progressFill, width: `${safeProgress * 100}%`, backgroundColor: theme['c-primary-background'] }} />
          </View>
        ) : null}
      </View>

      {/* 状态 & 操作 */}
      <View style={styles.itemStatus}>
        {task.status === 'downloading' ? (
          <Text style={styles.itemStatusText} color={statusDisplay.color}>
            {task.speed || statusDisplay.text}
          </Text>
        ) : (
          <Text style={styles.itemStatusText} color={statusDisplay.color} numberOfLines={1}>
            {statusDisplay.icon && <Icon name={statusDisplay.icon} size={10} color={statusDisplay.color} />}
            {statusDisplay.text}
          </Text>
        )}
      </View>

      {/* 操作按钮 */}
      {task.status === 'error' ? (
        <TouchableOpacity style={styles.actionBtn} onPress={() => onRetry(task.id)}>
          <Icon name="refresh" size={16} color={theme['c-500']} />
        </TouchableOpacity>
      ) : task.status === 'downloading' || task.status === 'waiting' ? (
        <TouchableOpacity style={styles.actionBtn} onPress={() => onPause(task.id)}>
          <Icon name="pause" size={16} color={theme['c-500']} />
        </TouchableOpacity>
      ) : task.status === 'paused' ? (
        <TouchableOpacity style={styles.actionBtn} onPress={() => onResume(task.id)}>
          <Icon name="play" size={16} color={theme['c-500']} />
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity style={styles.actionBtn} onPress={() => onRemove(task.id)}>
        <Icon name="delete" size={16} color={theme['c-500']} />
      </TouchableOpacity>
    </View>
  )
}

export default () => {
  const t = useI18n()
  const theme = useTheme()
  const [taskList, setTaskList] = useState<DownloadTask[]>([])
  const [filter, setFilter] = useState<FilterType>('downloading')
  const [searchText, setSearchText] = useState('')
  const [searchModalVisible, setSearchModalVisible] = useState(false)
  const searchInputRef = useRef<TextInput>(null)

  useEffect(() => {
    const unsub = subscribe((tasks) => {
      setTaskList([...tasks])
    })
    setTaskList(getTasks())
    return unsub
  }, [])

  // 计算各分类数量
  const counts = useMemo(() => ({
    all: taskList.length,
    downloading: taskList.filter(t => t.status === 'downloading' || t.status === 'waiting').length,
    paused: taskList.filter(t => t.status === 'paused').length,
    error: taskList.filter(t => t.status === 'error').length,
    completed: taskList.filter(t => t.status === 'completed').length,
  }), [taskList])

  // 过滤+搜索
  const filteredTasks = useMemo(() => {
    let list = taskList
    switch (filter) {
      case 'downloading':
        list = list.filter(t => t.status === 'downloading' || t.status === 'waiting')
        break
      case 'paused':
        list = list.filter(t => t.status === 'paused')
        break
      case 'error':
        list = list.filter(t => t.status === 'error')
        break
      case 'completed':
        list = list.filter(t => t.status === 'completed')
        break
    }
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase()
      list = list.filter(t =>
        t.musicInfo.name.toLowerCase().includes(q) ||
        t.musicInfo.singer.toLowerCase().includes(q)
      )
    }
    return list
  }, [taskList, filter, searchText])

  const handleClear = useCallback(() => {
    const hasCompleted = taskList.some(t => t.status === 'completed' || t.status === 'error')
    if (!hasCompleted) return
    void confirmDialog({
      message: t('clear_completed_tasks_tip') || '确认清除已完成的下载任务？',
      confirmButtonText: t('confirm_button_text') || '确认',
      cancelButtonText: t('cancel_button_text_2') || '取消',
    }).then(confirm => {
      if (confirm) clearCompleted()
    })
  }, [taskList, t])

  const handleRemove = useCallback((id: string) => { removeTask(id) }, [])
  const handleRetry = useCallback((id: string) => { retryTask(id) }, [])
  const handlePause = useCallback((id: string) => { pauseTask(id) }, [])
  const handleResume = useCallback((id: string) => { resumeTask(id) }, [])

  const hasClearable = taskList.some(t => t.status === 'completed' || t.status === 'error')

  const filterLabels: Record<FilterType, string> = {
    all: t('download_all') || '全部',
    downloading: t('download_downloading') || '正在下载',
    paused: t('paused') || '已暂停',
    error: t('download_error') || '出错',
    completed: t('download_completed') || '下载成功',
  }

  // 打开搜索弹窗
  const handleOpenSearch = () => {
    setSearchModalVisible(true)
    // 延迟聚焦，等 Modal 动画完成
    setTimeout(() => {
      searchInputRef.current?.focus()
    }, 300)
  }

  // 关闭搜索弹窗
  const handleCloseSearch = () => {
    setSearchModalVisible(false)
    setSearchText('')
  }

  return (
    <View style={{ ...styles.container, backgroundColor: theme['c-content-background'] }}>
      {/* 标签页 + 搜索图标 */}
      <View style={{ ...styles.tabsContainer, borderBottomColor: theme['c-100'] }}>
        <View style={styles.tabsScroll}>
          {FILTER_TABS.map(tab => (
            <TouchableOpacity
              key={tab}
              style={styles.tab}
              onPress={() => setFilter(tab)}
            >
              <Text
                style={styles.tabText}
                color={filter === tab ? theme['c-primary-font'] : theme['c-400']}
              >
                {filterLabels[tab]}
              </Text>
              <Text style={styles.tabBadge} color={filter === tab ? theme['c-primary-font'] : theme['c-400']}>
                {counts[tab]}
              </Text>
              {filter === tab ? (
                <View style={{ ...styles.activeTabUnderline, backgroundColor: theme['c-primary'] }} />
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
        {/* 搜索图标 */}
        <TouchableOpacity
          style={styles.searchIconBtn}
          onPress={handleOpenSearch}
        >
          <Icon name="search-2" size={20} color={theme['c-font']} />
        </TouchableOpacity>
      </View>

      {/* 操作栏 */}
      {(filter === 'all' || filter === 'completed' || filter === 'error') && hasClearable ? (
        <View style={{ ...styles.headerRow, borderBottomColor: theme['c-100'] }}>
          <View />
          <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
            <Text size={13} color={theme['c-primary-font']}>{t('clear_completed_tasks_tip') || '清除已完成'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* 列表 */}
      {filteredTasks.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="download-2" size={48} color={theme['c-300']} />
          <Text style={styles.emptyText} color={theme['c-400']}>
            {searchText.trim() ? (t('download_search_empty') || '未找到匹配的下载任务') : (t('no_download_tasks') || '暂无下载任务')}
          </Text>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={filteredTasks}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TaskItem
              task={item}
              onRemove={handleRemove}
              onRetry={handleRetry}
              onPause={handlePause}
              onResume={handleResume}
            />
          )}
        />
      )}

      {/* 搜索弹窗 Modal */}
      <Modal
        visible={searchModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={handleCloseSearch}
      >
        <Pressable style={styles.modalOverlay} onPress={handleCloseSearch}>
          {/* 阻止点击搜索框时关闭弹窗 */}
          <Pressable onPress={() => {}}>
            <View style={{ ...styles.modalSearchBar, backgroundColor: theme['c-content-background'], borderBottomColor: theme['c-100'] }}>
              <TextInput
                ref={searchInputRef}
                style={{
                  ...styles.modalSearchInput,
                  color: theme['c-font'],
                  backgroundColor: theme['c-primary-input-background'] || 'rgba(0,0,0,0.05)',
                }}
                placeholder={t('download_search_placeholder') || '搜索已下载的歌曲'}
                placeholderTextColor={theme['c-400']}
                value={searchText}
                onChangeText={setSearchText}
                autoFocus={false}
                returnKeyType="search"
              />
              <TouchableOpacity style={styles.modalCloseBtn} onPress={handleCloseSearch}>
                <Text size={14} color={theme['c-primary-font']}>{t('cancel_button_text_2') || '取消'}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}
