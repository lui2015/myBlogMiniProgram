const api = require('../../utils/api')

function safeUrl(value) {
  const url = String(value || '').trim()
  return /^https?:\/\//i.test(url) ? url : ''
}

Page({
  data: {
    items: [],
    total: 0,
    keyword: '',
    loading: true,
    error: ''
  },

  onLoad(options) {
    this.keyword = (options && options.q) || ''
    this.setData({ keyword: this.keyword })
    this.load()
  },

  onPullDownRefresh() {
    this.load().then(() => wx.stopPullDownRefresh())
  },

  load() {
    this.setData({ loading: true, error: '' })
    const params = { pageSize: 200 }
    if (this.keyword) params.q = this.keyword
    return api.getList('myskills', params)
      .then(res => {
        const items = res.items || []
        this.setData({
          items,
          total: Number(res.total) || items.length,
          loading: false
        })
      })
      .catch(err => {
        this.setData({ loading: false, error: err.message || '加载失败' })
      })
  },

  onRetry() {
    this.load()
  },

  onItemTap(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.items.filter(skill => skill.id === id)[0]
    const url = item && safeUrl(item.url)
    if (!url) return
    wx.setClipboardData({
      data: url,
      success: () => wx.showToast({ title: '已复制技能地址', icon: 'none' })
    })
  },

  onShareAppMessage() {
    return { title: '技能作品 · 鲁力铭', path: '/pages/myskills/myskills' }
  }
})
