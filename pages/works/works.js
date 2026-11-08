const api = require('../../utils/api')
const { resolveFields } = require('../../utils/util')

Page({
  data: {
    works: [],
    categories: [],
    currentCategory: '全部',
    keyword: '',
    total: 0,
    loading: true,
    error: ''
  },

  onLoad() {
    this.allWorks = []
    this.fetchWorks()
  },

  onPullDownRefresh() {
    this.fetchWorks().then(() => wx.stopPullDownRefresh())
  },

  fetchWorks() {
    const keyword = this.data.keyword.trim()
    this.setData({ loading: true, error: '' })

    // 关键词走服务端 q 参数，分类在前端过滤
    return api.getList('works', keyword ? { q: keyword } : {})
      .then(res => {
        this.allWorks = resolveFields(res.items, ['cover'])
        const categories = ['全部']
        this.allWorks.forEach(work => {
          if (work.category && categories.indexOf(work.category) === -1) {
            categories.push(work.category)
          }
        })
        this.setData({ categories, total: res.total, loading: false })
        this.applyFilter()
      })
      .catch(err => {
        this.setData({
          loading: false,
          error: err.message || '加载失败，请检查网络与合法域名配置'
        })
      })
  },

  applyFilter() {
    const { currentCategory } = this.data
    const works = currentCategory === '全部'
      ? this.allWorks
      : this.allWorks.filter(work => work.category === currentCategory)
    this.setData({ works })
  },

  onCategoryTap(e) {
    this.setData({ currentCategory: e.currentTarget.dataset.category })
    this.applyFilter()
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value })
    clearTimeout(this.searchTimer)
    this.searchTimer = setTimeout(() => this.fetchWorks(), 350)
  },

  clearSearch() {
    clearTimeout(this.searchTimer)
    this.setData({ keyword: '' })
    this.fetchWorks()
  },

  goDetail(e) {
    wx.navigateTo({ url: `/pages/detail/detail?id=${e.currentTarget.dataset.id}` })
  },

  onShareAppMessage() {
    return { title: '文章 · 鲁力铭', path: '/pages/works/works' }
  }
})
