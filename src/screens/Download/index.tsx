import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native'
import { useGlobalColor } from '@/hooks/useTheme'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'
import { downloadMusic, pauseDownload, cancelDownload } from '@/core/download'
import { Icon } from '@/components/common/Icon'
import { useNavigationComponentDidAppear } from '@/navigation'
import { useTheme } from '@/store/theme/hook'
import { createHeaderStyle } from '@/utils/tools'

interface DownloadItem extends LX.Music.MusicInfo {
  progress: number
  status: 'pending' | 'downloading' | 'paused' | 'error' | 'completed'
  statusText: string
  filePath?: string
}

const DownloadScreen = ({ componentId }: { componentId: string }) => {
  const theme = useTheme()
  const t = useI18n()
  const [downloadList, setDownloadList] = useState<DownloadItem[]>([])
  
  useNavigationComponentDidAppear(() => {
    // 页面显示时的逻辑
  }, componentId)
  
  useEffect(() => {
    const handleDownloadUpdate = (info: Partial<DownloadItem> & { id: string }) => {
      setDownloadList(prev => {
        const index = prev.findIndex(item => item.id === info.id)
        if (index === -1) return prev
        
        const newList = [...prev]
        newList[index] = { ...newList[index], ...info }
        return newList
      })
    }
    
    global.app_event.on('downloadUpdate', handleDownloadUpdate)
    
    return () => {
      global.app_event.off('downloadUpdate', handleDownloadUpdate)
    }
  }, [])
  
  const handlePauseResume = useCallback((item: DownloadItem) => {
    if (item.status === 'downloading') {
      pauseDownload(item.id)
    } else if (item.status === 'paused' || item.status === 'error') {
      downloadMusic(item)
    }
  }, [])
  
  const handleCancel = useCallback((id: string) => {
    cancelDownload(id)
    setDownloadList(prev => prev.filter(item => item.id !== id))
  }, [])
  
  const renderItem = ({ item }: { item: DownloadItem }) => {
    return (
      <View style={styles.item}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.itemArtist} numberOfLines={1}>{item.singer}</Text>
          <Text style={styles.itemStatus}>{item.statusText}</Text>
          {item.status === 'downloading' && (
            <View style={styles.progressBar}>
              <View style={[styles.progress, { width: `${item.progress}%` }]} />
            </View>
          )}
        </View>
        <View style={styles.itemActions}>
          {(item.status === 'downloading' || item.status === 'paused' || item.status === 'error') && (
            <TouchableOpacity onPress={() => handlePauseResume(item)}>
              <Icon name={item.status === 'downloading' ? 'pause' : 'play'} size={24} />
            </TouchableOpacity>
          )}
          {item.status !== 'completed' && (
            <TouchableOpacity onPress={() => handleCancel(item.id)}>
              <Icon name="close" size={24} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    )
  }
  
  return (
    <View style={styles.container}>
      <FlatList
        data={downloadList}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('download_empty')}</Text>
          </View>
        }
      />
    </View>
  )
}

const styles = createStyle({
  container: {
    flex: 1,
  },
  item: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemArtist: {
    fontSize: 14,
    marginTop: 4,
    opacity: 0.7,
  },
  itemStatus: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.5,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 2,
    marginTop: 8,
  },
  progress: {
    height: '100%',
    backgroundColor: '#1890ff',
    borderRadius: 2,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.5,
  },
})

export default DownloadScreen 