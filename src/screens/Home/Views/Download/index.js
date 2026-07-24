import { useState, useEffect } from 'react'
import { View, FlatList, TouchableOpacity } from 'react-native'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import { subscribe, getTasks, removeTask, clearCompleted, retryTask, type DownloadTask } from '@/core/download/manager'
import { confirmDialog } from '@/utils/tools'

const styles = createStyle({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  list: {
    flex: 1,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
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
    width: 60,
    alignItems: 'flex-end',
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
    paddingLeft: 12,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 10,
  },
})

const TaskItem = ({ task, onRemove, onRetry }: {
  task: DownloadTask,
  onRemove: (id: string) => void,
  onRetry: (id: string) => void,
}) => {
  const theme = useTheme()
  const t = useI18n()

  const statusLabel = task.status === 'downloading'
    ? `${(task.progress * 100).toFixed(0)}%`
    : task.status === 'completed'
      ? '✓'
      : task.status === 'error'
        ? '✗'
        : t('waiting') || '等待'

  return (
    <View style={styles.listItem}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={1} color={theme['c-font']}>{task.musicInfo.name}</Text>
        <Text style={styles.itemSinger} numberOfLines={1} color={theme['c-500']}>{task.musicInfo.singer}</Text>
        {task.status === 'downloading' ? (
          <View style={{ ...styles.progressBar, backgroundColor: theme['c-200'] }}>
            <View style={{ ...styles.progressFill, width: `${task.progress * 100}%`, backgroundColor: theme['c-primary-background'] }} />
          </View>
        ) : null}
        {task.error ? (
          <Text size={11} color={theme['c-danger'] || '#e74c3c'}>{task.error}</Text>
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

  useEffect(() => {
    const unsub = subscribe((tasks) => {
      setTaskList([...tasks])
    })
    setTaskList(getTasks())
    return unsub
  }, [])

  const handleClear = () => {
    const hasCompleted = taskList.some(t => t.status === 'completed' || t.status === 'error')
    if (!hasCompleted) return
    void confirmDialog({
      message: t('clear_completed_tasks_tip') || '确认清除已完成的下载任务？',
      confirmButtonText: t('confirm_button_text') || '确认',
      cancelButtonText: t('cancel_button_text_2') || '取消',
    }).then(confirm => {
      if (confirm) clearCompleted()
    })
  }

  const handleRemove = (id: string) => {
    removeTask(id)
  }

  const handleRetry = (id: string) => {
    retryTask(id)
  }

  const hasClearable = taskList.some(t => t.status === 'completed' || t.status === 'error')

  return (
    <View style={{ ...styles.container, backgroundColor: theme['c-content-background'] }}>
      <View style={{ ...styles.header, backgroundColor: theme['c-content-background'] }}>
        <Text style={{ ...styles.headerTitle, color: theme['c-font'] }}>{t('nav_download')}</Text>
        {hasClearable ? (
          <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
            <Text size={13} color={theme['c-primary-font']}>{t('clear') || '清除已完成'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {taskList.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="download-2" size={48} color={theme['c-300']} />
          <Text style={styles.emptyText} color={theme['c-400']}>{t('no_download_tasks') || '暂无下载任务'}</Text>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={taskList}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TaskItem task={item} onRemove={handleRemove} onRetry={handleRetry} />
          )}
        />
      )}
    </View>
  )
}
