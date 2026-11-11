const api = require('../../utils/api')
const { resolveFields } = require('../../utils/util')

Page({
  data: {
    videos: [],
    categories: ['全部'],
    currentCategory: '全部',
    playingUrl: '',
    total: 0,
    loading: true,
    error: ''
  },

  onLoad(options) {
    this.allVideos = []
    this.keyword = (options && options.q) || ''
    this.load()
  },

  onPullDownRefresh() {
    this.load().then(() => wx.stopPullDownRefresh())
  },

  load() {
    this.setData({ loading: true, error: '' })
    return api.getList('videos', this.keyword ? { q: this.keyword } : {})
      .then(res => {
        this.allVideos = resolveFields(res.items, ['cover', 'src'])
        const categories = ['全部']
        this.allVideos.forEach(video => {
          if (video.category && categories.indexOf(video.category) === -1) {
            categories.push(video.category)
          }
        })
        this.setData({ categories, total: res.total, loading: false })
        this.applyFilter()
      })
      .catch(err => {
        this.setData({ loading: false, error: err.message || '加载失败' })
      })
  },

  applyFilter() {
    const { currentCategory } = this.data
    const videos = currentCategory === '全部'
      ? this.allVideos
      : this.allVideos.filter(video => video.category === currentCategory)
    this.setData({ videos })
  },

  onCategoryTap(e) {
    this.setData({ currentCategory: e.currentTarget.dataset.category })
    this.applyFilter()
  },

  onCardTap(e) {
    const id = e.currentTarget.dataset.id
    const video = this.allVideos.filter(item => item.id === id)[0]
    if (!video) return

    if (video.src) {
      this.setData({ playingUrl: video.src })
      return
    }

    // 站点数据里视频 src 为空，降级为预览封面
    wx.showToast({ title: '视频源暂未配置', icon: 'none' })
    if (video.cover) {
      const covers = this.data.videos.map(item => item.cover).filter(Boolean)
      wx.previewImage({ current: video.cover, urls: covers })
    }
  },

  closePlayer() {
    this.setData({ playingUrl: '' })
  },

  onRetry() {
    this.load()
  },

  onShareAppMessage() {
    return { title: '视频 · 鲁力铭', path: '/pages/videos/videos' }
  }
})
