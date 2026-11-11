const api = require('../../utils/api')

const PAGE_SIZE = 20

Page({
  data: {
    quotes: [],
    total: 0,
    page: 1,
    hasMore: true,
    loading: true,
    loadingMore: false,
    error: ''
  },

  onLoad(options) {
    this.keyword = (options && options.q) || ''
    this.loadFirst()
  },

  onPullDownRefresh() {
    this.loadFirst().then(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    this.loadMore()
  },

  loadFirst() {
    this.setData({ loading: true, error: '', page: 1, hasMore: true })
    return api.getPage('quotes', 1, PAGE_SIZE, this.keyword ? { q: this.keyword } : {})
      .then(res => {
        this.setData({
          quotes: res.items,
          total: res.total,
          page: 1,
          hasMore: res.hasMore,
          loading: false
        })
      })
      .catch(err => {
        this.setData({ loading: false, error: err.message || '加载失败' })
      })
  },

  loadMore() {
    const { hasMore, loading, loadingMore, page } = this.data
    if (!hasMore || loading || loadingMore) return

    const nextPage = page + 1
    this.setData({ loadingMore: true })
    return api.getPage('quotes', nextPage, PAGE_SIZE, this.keyword ? { q: this.keyword } : {})
      .then(res => {
        this.setData({
          quotes: this.data.quotes.concat(res.items),
          page: nextPage,
          hasMore: res.hasMore,
          loadingMore: false
        })
      })
      .catch(err => {
        this.setData({ loadingMore: false })
        wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      })
  },

  onRetry() {
    this.loadFirst()
  },

  onShareAppMessage() {
    return { title: '我的思考 · 鲁力铭', path: '/pages/quotes/quotes' }
  }
})
