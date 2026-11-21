const quotes = require('../../utils/investmentQuotes')

Page({
  data: {
    loading: true,
    error: '',
    offline: false,
    updatedText: '',
    daily: null,
    dailyFav: false,
    masters: [],
    tags: [],
    master: '',
    tag: '',
    keyword: '',
    view: 'all',
    favIds: [],
    favCount: 0,
    list: [],
    total: 0,
    totalCount: 0,
    hasMore: false,
    expandedId: '',
    countText: '共 0 条名言'
  },

  onLoad() {
    this.all = []
    this.filtered = []
    this.favIds = quotes.readFavorites()
    this.load()
  },

  onUnload() {
    clearTimeout(this.searchTimer)
  },

  onPullDownRefresh() {
    this.load(true).then(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (this.data.hasMore) this.appendMore()
  },

  load(force) {
    this.setData({ loading: true, error: '' })
    return quotes.getAll(force)
      .then(res => {
        this.all = res.items
        const daily = quotes.daily(res.items, quotes.todayStr())
        this.setData({
          loading: false,
          offline: !!res.offline,
          updatedText: res.offline ? '当前离线 · 显示上次同步的数据' : `已同步 ${res.items.length} 条`,
          totalCount: res.items.length,
          daily,
          dailyFav: daily ? this.favIds.indexOf(daily.id) >= 0 : false,
          masters: quotes.masters(res.items, 12),
          tags: quotes.tags(res.items, 12),
          favIds: this.favIds,
          favCount: this.favIds.length
        })
        this.applyFilter()
      })
      .catch(err => {
        this.setData({ loading: false, error: err.message || '加载失败，请检查网络与合法域名配置' })
      })
  },

  decorate(item) {
    return Object.assign({}, item, {
      fav: this.favIds.indexOf(item.id) >= 0,
      tagText: item.tags.slice(0, 3).map(tag => `#${tag}`).join(' ')
    })
  },

  applyFilter() {
    const filtered = quotes.filter(this.all, {
      keyword: this.data.keyword,
      master: this.data.master,
      tag: this.data.tag,
      onlyFav: this.data.view === 'fav',
      favIds: this.favIds
    })
    this.filtered = filtered
    const page = filtered.slice(0, quotes.PAGE_SIZE)
    this.setData({
      list: page.map(item => this.decorate(item)),
      total: filtered.length,
      hasMore: filtered.length > page.length,
      expandedId: '',
      countText: `${filtered.length} 条${this.data.view === 'fav' ? '收藏' : '名言'}`
    })
  },

  appendMore() {
    const start = this.data.list.length
    const next = (this.filtered || []).slice(start, start + quotes.PAGE_SIZE)
    if (!next.length) return this.setData({ hasMore: false })
    this.setData({
      list: this.data.list.concat(next.map(item => this.decorate(item))),
      hasMore: start + next.length < this.filtered.length
    })
  },

  onSearchInput(e) {
    this.setData({ keyword: String(e.detail.value || '') })
    clearTimeout(this.searchTimer)
    this.searchTimer = setTimeout(() => this.applyFilter(), 300)
  },

  clearSearch() {
    clearTimeout(this.searchTimer)
    this.setData({ keyword: '' })
    this.applyFilter()
  },

  onMasterTap(e) {
    const value = String(e.currentTarget.dataset.master || '')
    this.setData({ master: value === this.data.master ? '' : value })
    this.applyFilter()
  },

  onTagTap(e) {
    const value = String(e.currentTarget.dataset.tag || '')
    this.setData({ tag: value === this.data.tag ? '' : value })
    this.applyFilter()
  },

  onViewTap(e) {
    const value = e.currentTarget.dataset.view === 'fav' ? 'fav' : 'all'
    if (value === this.data.view) return
    this.setData({ view: value })
    this.applyFilter()
  },

  onCardTap(e) {
    const id = String(e.currentTarget.dataset.id || '')
    this.setData({ expandedId: id === this.data.expandedId ? '' : id })
  },

  onFavTap(e) {
    const id = String(e.currentTarget.dataset.id || '')
    if (!id) return
    this.favIds = quotes.toggleFavorite(id)
    const fav = this.favIds.indexOf(id) >= 0
    this.setData({ favIds: this.favIds, favCount: this.favIds.length })
    if (this.data.daily && this.data.daily.id === id) this.setData({ dailyFav: fav })
    if (this.data.view === 'fav') return this.applyFilter()
    const index = this.data.list.findIndex(item => item.id === id)
    if (index >= 0) this.setData({ [`list[${index}].fav`]: fav })
  },

  onDailyFav() {
    if (this.data.daily) this.onFavTap({ currentTarget: { dataset: { id: this.data.daily.id } } })
  },

  copyQuote(item) {
    if (!item) return
    const lines = [item.cn]
    if (item.en) lines.push(item.en)
    lines.push(`— ${item.master}`)
    if (item.source) lines.push(`出处：${item.source}${item.year ? `（${item.year}）` : ''}`)
    wx.setClipboardData({
      data: lines.join('\n'),
      success: () => wx.showToast({ title: '名言已复制', icon: 'none' })
    })
  },

  onCopyTap(e) {
    const id = String(e.currentTarget.dataset.id || '')
    this.copyQuote((this.all || []).filter(item => item.id === id)[0])
  },

  onDailyCopy() {
    this.copyQuote(this.data.daily)
  },

  onDailyRefresh() {
    const next = quotes.randomPick(this.all, this.data.daily && this.data.daily.id)
    if (!next) return
    this.setData({ daily: next, dailyFav: this.favIds.indexOf(next.id) >= 0 })
  },

  onRetry() {
    this.load(true)
  },

  onShareAppMessage() {
    return { title: '投资名言 · 让大师思想照亮投资道路', path: '/pages/investQuotes/investQuotes' }
  }
})
