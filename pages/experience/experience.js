const experienceApi = require('../../utils/experienceApi')

Page({
  data: {
    loading: true,
    errorMsg: '',
    keyword: '',
    category: 'all',
    categories: [],
    tabs: [],
    allItems: [],
    list: [],
    total: 0,
    stale: false
  },

  onLoad() {
    this.remoteHits = {}
    this.searchSeq = 0
    this.loadBase(false)
  },

  onUnload() {
    clearTimeout(this.searchTimer)
  },

  onPullDownRefresh() {
    this.loadBase(true).then(() => wx.stopPullDownRefresh())
  },

  loadBase(force) {
    if (!this.data.allItems.length) this.setData({ loading: true, errorMsg: '' })
    const metaReq = experienceApi.getMeta(force).catch(() => null)
    const listReq = experienceApi.getExperiences(force).catch(() => null)
    return Promise.all([metaReq, listReq]).then(([metaRes, listRes]) => {
      const offline = experienceApi.getOfflineExperiences()
      const categories = (metaRes && metaRes.data && metaRes.data.categories) || offline.categories
      let items
      let total
      if (listRes && listRes.data && Array.isArray(listRes.data.items)) {
        items = listRes.data.items.map(item => experienceApi.normalize(item, categories))
        total = Number(listRes.data.total) || items.length
      } else {
        items = offline.items
        total = offline.total
      }
      if (!items.length) {
        this.setData({ loading: false, errorMsg: '暂时读不到经验数据，请检查网络后重试。' })
        return
      }
      const tabs = [{ id: 'all', name: '全部' }].concat(
        categories.map(item => ({ id: item.id, name: item.name }))
      )
      this.setData({
        loading: false,
        errorMsg: '',
        categories,
        tabs,
        allItems: items,
        total,
        stale: !!(listRes && listRes.stale)
      })
      this.applyFilter()
    }).catch(err => {
      this.setData({
        loading: false,
        errorMsg: (err && err.message) || '数据加载失败，请稍后重试。'
      })
    })
  },

  applyFilter() {
    const allItems = this.data.allItems || []
    const category = this.data.category
    const keyword = String(this.data.keyword || '').trim().toLowerCase()
    const hits = this.remoteHits || {}
    let list = category === 'all'
      ? allItems.slice()
      : allItems.filter(item => item.categoryId === category)
    if (keyword) {
      list = list.filter(item =>
        `${item.title} ${item.summary} ${item.categoryName}`.toLowerCase().indexOf(keyword) >= 0 ||
        !!hits[item.id]
      ).map(item => Object.assign({}, item, { snippet: hits[item.id] || '' }))
    }
    this.setData({
      list: list.map((item, i) => Object.assign({}, item, {
        no: ('0' + (i + 1)).slice(-2)
      }))
    })
  },

  onCategoryTap(e) {
    this.setData({ category: e.currentTarget.dataset.id || 'all' })
    this.applyFilter()
  },

  onSearchInput(e) {
    const keyword = e.detail.value || ''
    this.setData({ keyword })
    clearTimeout(this.searchTimer)
    if (!keyword.trim()) {
      this.searchSeq = (this.searchSeq || 0) + 1
      this.remoteHits = {}
      this.applyFilter()
      return
    }
    this.searchTimer = setTimeout(() => this.searchRemote(keyword.trim()), 350)
  },

  clearSearch() {
    clearTimeout(this.searchTimer)
    this.searchSeq++
    this.remoteHits = {}
    this.setData({ keyword: '' })
    this.applyFilter()
  },

  // 服务端全文检索能命中正文，本机过滤只覆盖标题与简介，两者取并集
  searchRemote(keyword) {
    const seq = (this.searchSeq || 0) + 1
    this.searchSeq = seq
    experienceApi.search(keyword).then(res => {
      if (seq !== this.searchSeq || this.data.keyword.trim() !== keyword) return
      const hits = {}
      const list = res.items || []
      list.forEach(item => { hits[item.id] = item.snippet })
      this.remoteHits = hits
      this.applyFilter()
    }).catch(err => {
      console.warn('[experience] 全文搜索失败', err)
    })
  },

  retry() {
    this.loadBase(true)
  },

  openDetail(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({
      url: `/pages/experienceDetail/experienceDetail?id=${encodeURIComponent(id)}`
    })
  },

  onShareAppMessage() {
    return { title: '经验沉淀 · 鲁力铭', path: '/pages/experience/experience' }
  }
})
