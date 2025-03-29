import { downloadMusic } from '@/core/download'

// 在菜单选项中添加下载选项
const menuOptions = [
  // ... 现有选项 ...
  {
    name: t('download_song'),
    icon: 'download',
    action: () => {
      downloadMusic(musicInfo)
      toast(t('download_added'))
    },
  },
  // ... 其他选项 ...
] 