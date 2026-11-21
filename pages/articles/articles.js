const api = require('../../utils/api')
const { resolveCoverFields, DEFAULT_COVER } = require('../../utils/util')

// 独立文章列表：全量 works + 服务端 q 全文检索，封面兜底与首页 / 作品 Tab 共用
Page({
  data: {
    works: [],
    keyword: '',
    countText: '共 0 篇文章',
    loading: true,
    error: ''
  },

  onLoad(options) {
    this.seq = 0
    this.keyword = String((options && options.q) || '').trim()
    this.setData({ keyword: this.keyword })
    this.load()
  },

  onUnload() {
    clearTimeout(this.searchTimer)
  },

  onPullDownRefresh() {
    this.load().then(() => wx.stopPullDownRefresh())
  },

  load() {
    const seq = ++this.seq
    const keyword = this.keyword
    const params = { pageSize: 200 }
    if (keyword) params.q = keyword
    this.setData({ loading: true, error: '' })
    return api.getList('works', params)
      .then(res => {
        if (seq !== this.seq) return
        const works = resolveCoverFields(res.items)
        this.setData({
          works,
          loading: false,
          countText: keyword ? `「${keyword}」· ${works.length} 篇结果` : `共 ${works.length} 篇文章`
        })
      })
      .catch(err => {
        if (seq !== this.seq) return
        this.setData({ loading: false, error: err.message || '加载失败' })
      })
  },

  onSearchInput(e) {
    const value = String(e.detail.value || '')
    this.setData({ keyword: value })
    clearTimeout(this.searchTimer)
    this.searchTimer = setTimeout(() => {
      const keyword = value.trim()
      if (keyword === this.keyword) return
      this.keyword = keyword
      this.load()
    }, 350)
  },

  clearSearch() {
    clearTimeout(this.searchTimer)
    this.setData({ keyword: '' })
    if (!this.keyword) return
    this.keyword = ''
    this.load()
  },

  onCoverError(e) {
    const index = Number(e.currentTarget.dataset.index)
    const works = this.data.works || []
    if (!Number.isInteger(index) || index < 0 || index >= works.length) return
    if (works[index].cover === DEFAULT_COVER) return
    this.setData({ [`works[${index}].cover`]: DEFAULT_COVER })
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({ url: `/pages/detail/detail?id=${encodeURIComponent(id)}` })
  },

  onRetry() {
    this.load()
  },

  onShareAppMessage() {
    const q = this.keyword ? `?q=${encodeURIComponent(this.keyword)}` : ''
    return { title: '文章 · 鲁力铭', path: `/pages/articles/articles${q}` }
  }
})
