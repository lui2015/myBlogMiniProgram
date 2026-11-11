const api = require('../../utils/api')
const { resolveFields } = require('../../utils/util')

Page({
  data: {
    softwares: [],
    loading: true,
    error: '',
    detail: null
  },

  onLoad(options) {
    this.focusId = options.id || ''
    this.load()
  },

  onPullDownRefresh() {
    this.load().then(() => wx.stopPullDownRefresh())
  },

  load() {
    this.setData({ loading: true, error: '' })
    return api.getList('softwares')
      .then(res => {
        const softwares = resolveFields(res.items, ['image'])
        this.setData({ softwares, loading: false })
        // 从首页点击某张卡片进入时，自动展开对应详情
        if (this.focusId) {
          const hit = softwares.filter(item => item.id === this.focusId)[0]
          if (hit) this.setData({ detail: hit })
          this.focusId = ''
        }
      })
      .catch(err => {
        this.setData({ loading: false, error: err.message || '加载失败' })
      })
  },

  onRetry() {
    this.load()
  },

  onCardTap(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.softwares.filter(soft => soft.id === id)[0]
    if (item) this.setData({ detail: item })
  },

  closeDetail() {
    this.setData({ detail: null })
  },

  noop() {},

  copyUrl() {
    const url = this.data.detail && this.data.detail.url
    if (!url) return
    wx.setClipboardData({
      data: url,
      success: () => wx.showToast({ title: '地址已复制', icon: 'none' })
    })
  },

  previewCover() {
    const url = this.data.detail && this.data.detail.image
    if (url) wx.previewImage({ current: url, urls: [url] })
  },

  onShareAppMessage() {
    return { title: '软件作品 · 鲁力铭', path: '/pages/softwares/softwares' }
  }
})
