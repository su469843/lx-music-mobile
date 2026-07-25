import { useState, useEffect, useMemo, useCallback } from 'react'
import { View, FlatList, TouchableOpacity } from 'react-native'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import Input from '@/components/common/Input'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import { subscribe, getTasks, removeTask, clearCompleted, retryTask, type DownloadTask } from '@/core/download/manager'
import { confirmDialog } from '@/utils/tools'

type FilterType = 'all' | 'downloading' | 'error' | 'completed'

const FILTER_TABS: FilterType[] = ['all', 'downloading', 'error', 'completed']

const styles = createStyle({
  container: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
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
  itemInfo: {
    flex: 1,
    paddingRight: 10,
  },
  itemName: {
    fontSize: 14,
    marginBottom: 2,
  },
  itemSinger: {
    fontSize: 12,
  },
  itemStatus: {
    alignItems: 'flex-end',
    minWidth: 60,
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
    paddingLeft: 10,
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
})

const TaskItem = ({ task, onRemove, onRetry }: {
  task: DownloadTask,
  onRemove: (id: string) => void,
  onRetry: (id: string) => void,
}) => {
  const theme = useTheme()
  const t = useI18n()

  // 空值保护
  const musicInfo = task.musicInfo
  const safeName = musicInfo?.name || (t('unknown') || '未知')
  const safeSinger = musicInfo?.singer || ''
  const safeProgress = task.progress ?? 0
  const safeError = task.error || ''

  const statusLabel = (() => {
    try {
      return task.status === 'downloading'
        ? `${(safeProgress * 100).toFixed(0)}%`
        : task.status === 'completed' ? '✓'
        : task.status === 'error' ? '✗'
        : (t('waiting') || '等待')
    } catch { return '...' }
  })()

  return (
    <View style={styles.listItem}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={1} color={theme['c-font']}>{safeName}</Text>
        <Text style={styles.itemSinger} numberOfLines={1} color={theme['c-500']}>{safeSinger}</Text>
        {task.status === 'downloading' && safeProgress > 0 ? (
          <View style={{ ...styles.progressBar, backgroundColor: theme['c-200'] }}>
            <View style={{ ...styles.progressFill, width: `${safeProgress * 100}%`, backgroundColor: theme['c-primary-background'] }} />
          </View>
        ) : null}
        {safeError ? (
          <Text size={11} color={theme['c-danger'] || '#e74c3c'}>{safeError}</Text>
        ) : null}
      </View>
      <View style={styles.itemStatus}>
        <Text style={styles.itemStatusText}
          color={
            task.status === 'completed' ? '#27ae60'
            : task.status === 'error' ? '#e74c3c'
            : task.status === 'downloading' ? theme['c-primary-font']
            : theme['c-400']
          }
        >
          {task.status === 'downloading' ? task.speed : statusLabel}
        </Text>
      </View>
      {task.status === 'error' ? (
        <TouchableOpacity style={styles.actionBtn} onPress={() => onRetry(task.id)}>
          <Icon name="refresh" size={16} color={theme['c-500']} />
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
  const [filter, setFilter] = useState<FilterType>('all')
  const [searchText, setSearchText] = useState('')

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
    error: taskList.filter(t => t.status === 'error').length,
    completed: taskList.filter(t => t.status === 'completed').length,
  }), [taskList])

  // 过滤+搜索
  const filteredTasks = useMemo(() => {
    let list = taskList
    // 过滤
    switch (filter) {
      case 'downloading':
        list = list.filter(t => t.status === 'downloading' || t.status === 'waiting')
        break
      case 'error':
        list = list.filter(t => t.status === 'error')
        break
      case 'completed':
        list = list.filter(t => t.status === 'completed')
        break
    }
    // 搜索
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

  const handleRemove = useCallback((id: string) => {
    removeTask(id)
  }, [])

  const handleRetry = useCallback((id: string) => {
    retryTask(id)
  }, [])

  const hasClearable = taskList.some(t => t.status === 'completed' || t.status === 'error')

  const filterLabels: Record<FilterType, string> = {
    all: t('download_all') || '全部',
    downloading: t('download_downloading') || '正在下载',
    error: t('download_error') || '出错',
    completed: t('download_completed') || '下载成功',
  }

  return (
    <View style={{ ...styles.container, backgroundColor: theme['c-content-background'] }}>
      {/* 搜索栏 */}
      <View style={{ ...styles.searchBar, backgroundColor: theme['c-content-background'], borderBottomColor: theme['c-100'] }}>
        <Input
          placeholder={t('download_search_placeholder') || '搜索已下载的歌曲'}
          value={searchText}
          onChangeText={setSearchText}
          onClearText={() => setSearchText('')}
          clearBtn
          style={{ borderWidth: 0, backgroundColor: 'transparent' }}
        />
      </View>

      {/* 标签页 */}
      <View style={{ ...styles.tabsContainer, borderBottomColor: theme['c-100'] }}>
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
            <TaskItem task={item} onRemove={handleRemove} onRetry={handleRetry} />
          )}
        />
      )}
    </View>
  )
}
