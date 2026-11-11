const api = require('../../utils/api')

Page({
  data: {
    poems: [],
    keyword: '',
    total: 0,
    loading: true,
    error: ''
  },

  onLoad(options) {
    // 从「作品」Tab 全站搜索进入时，带上同一个关键词
    if (options && options.q) this.setData({ keyword: options.q })
    this.load()
  },

  onPullDownRefresh() {
    this.load().then(() => wx.stopPullDownRefresh())
  },

  load() {
    const keyword = this.data.keyword.trim()
    this.setData({ loading: true, error: '' })
    return api.getList('poems', keyword ? { q: keyword } : {})
      .then(res => {
        const poems = res.items.map(poem => {
          const lines = String(poem.content || '')
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean)
          return Object.assign({}, poem, { lines })
        })
        this.setData({ poems, total: res.total, loading: false })
      })
      .catch(err => {
        this.setData({ loading: false, error: err.message || '加载失败' })
      })
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value })
    clearTimeout(this.searchTimer)
    this.searchTimer = setTimeout(() => this.load(), 350)
  },

  clearSearch() {
    clearTimeout(this.searchTimer)
    this.setData({ keyword: '' })
    this.load()
  },

  onRetry() {
    this.load()
  },

  onShareAppMessage() {
    return { title: '诗词 · 鲁力铭', path: '/pages/poems/poems' }
  }
})
