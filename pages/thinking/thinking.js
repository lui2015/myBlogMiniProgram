const thinkingApi = require('../../utils/thinkingApi')

const PAGE_SIZE = 20

// 分类 id 速查表统一由数据模块维护，接口不可用时用于显示兜底
const FALLBACK_CATEGORIES = thinkingApi.CATEGORIES

const DIFFICULTIES = [
  { value: 0, name: '全部难度' },
  { value: 1, name: '⭐ 入门' },
  { value: 2, name: '⭐⭐ 进阶' },
  { value: 3, name: '⭐⭐⭐ 高阶' }
]

function stars(value) {
  const level = Math.min(3, Math.max(1, Number(value) || 1))
  return new Array(level + 1).join('⭐')
}

function decorate(model, catMap, favs) {
  const category = catMap[model.category] || {}
  return {
    slug: model.slug || '',
    icon: model.icon || '🧠',
    title: model.title || '',
    subtitle: model.subtitle || '',
    categoryName: category.name || '思维模型',
    stars: stars(model.difficulty),
    quote: model.memorySentence || model.keyInsight || '',
    tags: Array.isArray(model.tags) ? model.tags.slice(0, 3) : [],
    fav: favs.indexOf(model.slug) >= 0
  }
}

Page({
  data: {
    loading: true,
    errorMsg: '',
    statsLine: '',
    today: '',
    daily: null,
    keyword: '',
    category: 'all',
    difficulty: 0,
    difficulties: DIFFICULTIES,
    tabs: [],
    list: [],
    total: 0,
    hasMore: false
  },

  onLoad() {
    this.allModels = []
    this.filtered = []
    this.catList = []
    this.catMap = {}
    this.serverResults = null
    this.serverKeyword = ''
    this.searchSeq = 0
    this.loadBase(false)
  },

  onShow() {
    if (!this.allModels || !this.allModels.length) return
    const day = thinkingApi.todayStr(new Date())
    if (this.day && this.day !== day) {
      this.day = day
      this.setData({ today: day.replace(/-/g, '.') })
      this.pickDaily(false)
    }
    // 详情页可能刚改过收藏，切回来时同步
    this.buildTabs()
    this.applyFilter()
  },

  onUnload() {
    clearTimeout(this.searchTimer)
  },

  loadBase(force) {
    if (!this.allModels || !this.allModels.length) this.setData({ loading: true, errorMsg: '' })
    return Promise.all([
      thinkingApi.getCategories(force).catch(() => null),
      thinkingApi.getStats(force).catch(() => null),
      thinkingApi.getAllModels(force).catch(() => null)
    ]).then(([categories, stats, models]) => {
      const offline = thinkingApi.getOfflineModels()
      const all = (models && models.length) ? models : offline
      if (!all.length) {
        this.setData({ loading: false, errorMsg: '暂时读不到思维模型数据，请检查网络后重试。' })
        return
      }
      this.allModels = all
      this.catList = (categories && categories.length) ? categories : FALLBACK_CATEGORIES
      this.catMap = {}
      this.catList.forEach(item => { this.catMap[item.id] = item })

      const totalModels = (stats && stats.totalModels) || all.length
      const totalCategories = (stats && stats.totalCategories) || this.catList.length
      const totalTags = (stats && stats.totalTags) || 0
      this.day = thinkingApi.todayStr(new Date())
      this.setData({
        loading: false,
        errorMsg: '',
        today: this.day.replace(/-/g, '.'),
        statsLine: `${totalModels} 个模型 · ${totalCategories} 大分类${totalTags ? ` · ${totalTags} 个标签` : ''}`
      })
      this.buildTabs()
      this.pickDaily(false)
      this.applyFilter()
    }).catch(err => {
      this.setData({ loading: false, errorMsg: (err && err.message) || '数据加载失败，请稍后重试。' })
    })
  },

  buildTabs() {
    const tabs = [{ id: 'all', name: '全部', icon: '✦', count: this.allModels.length }]
    this.catList.forEach(item => {
      tabs.push({ id: item.id, name: item.name, icon: item.icon || '◈', count: item.count || 0 })
    })
    tabs.push({ id: 'fav', name: '我的收藏', icon: '⭐', count: thinkingApi.getFavorites().length })
    this.setData({ tabs })
  },

  pickDaily(random) {
    if (!this.allModels.length) return
    let model
    if (random) {
      const current = this.data.daily
      const pool = this.allModels.filter(item => !current || item.slug !== current.slug)
      model = pool[Math.floor(Math.random() * pool.length)] || this.allModels[0]
    } else {
      model = thinkingApi.dailyModel(this.allModels, new Date())
    }
    if (!model) return
    this.setData({
      daily: {
        slug: model.slug,
        icon: model.icon || '🧠',
        title: model.title || '',
        subtitle: model.subtitle || '',
        categoryName: (this.catMap[model.category] || {}).name || '思维模型',
        stars: stars(model.difficulty),
        quote: model.memorySentence || model.keyInsight || ''
      }
    })
  },

  // 在线时用服务端 q 搜索（覆盖介绍等精简列表没有的字段），失败退回本机缓存过滤
  applyFilter() {
    const keyword = (this.data.keyword || '').trim()
    const useServer = !!(keyword && this.serverResults && this.serverKeyword === keyword)
    const base = useServer ? this.serverResults : (this.allModels || [])
    const kw = keyword.toLowerCase()
    const favs = thinkingApi.getFavorites()
    const category = this.data.category
    const difficulty = Number(this.data.difficulty)

    const filtered = base.filter(model => {
      if (category === 'fav' && favs.indexOf(model.slug) < 0) return false
      if (category !== 'all' && category !== 'fav' && model.category !== category) return false
      if (difficulty && Number(model.difficulty) !== difficulty) return false
      if (kw && !useServer) {
        const hay = [
          model.title, model.subtitle, model.keyInsight, model.memorySentence,
          model.slug, (model.tags || []).join(' ')
        ].join(' ').toLowerCase()
        if (hay.indexOf(kw) < 0) return false
      }
      return true
    })

    this.filtered = filtered
    const shown = Math.min(PAGE_SIZE, filtered.length)
    this.setData({
      list: filtered.slice(0, shown).map(item => decorate(item, this.catMap, favs)),
      total: filtered.length,
      hasMore: filtered.length > shown
    })
  },

  loadMore() {
    if (!this.data.hasMore || !this.filtered) return
    const next = Math.min(this.data.list.length + PAGE_SIZE, this.filtered.length)
    const favs = thinkingApi.getFavorites()
    this.setData({
      list: this.filtered.slice(0, next).map(item => decorate(item, this.catMap, favs)),
      hasMore: next < this.filtered.length
    })
  },

  onSearchInput(e) {
    const input = e.detail.value || ''
    const keyword = input.trim()
    // 回写原始输入值，避免中文输入法组合过程中被改写
    this.setData({ keyword: input })
    clearTimeout(this.searchTimer)
    this.searchSeq += 1
    const seq = this.searchSeq
    if (!keyword) {
      this.serverResults = null
      this.serverKeyword = ''
      this.applyFilter()
      return
    }
    this.searchTimer = setTimeout(() => {
      thinkingApi.searchModels(keyword).then(list => {
        if (seq !== this.searchSeq || (this.data.keyword || '').trim() !== keyword) return
        this.serverResults = list
        this.serverKeyword = keyword
        this.applyFilter()
      }).catch(() => {
        if (seq !== this.searchSeq || (this.data.keyword || '').trim() !== keyword) return
        this.serverResults = null
        this.serverKeyword = ''
        this.applyFilter()
      })
    }, 300)
  },

  clearSearch() {
    clearTimeout(this.searchTimer)
    this.searchSeq += 1
    this.serverResults = null
    this.serverKeyword = ''
    this.setData({ keyword: '' })
    this.applyFilter()
  },

  onCategory(e) {
    this.setData({ category: e.currentTarget.dataset.id })
    this.applyFilter()
  },

  onDifficulty(e) {
    this.setData({ difficulty: Number(e.currentTarget.dataset.value) })
    this.applyFilter()
  },

  openModel(e) {
    const slug = e.currentTarget.dataset.slug
    if (slug) wx.navigateTo({ url: `/pages/thinkingDetail/thinkingDetail?slug=${slug}` })
  },

  openDaily() {
    const slug = this.data.daily && this.data.daily.slug
    if (slug) wx.navigateTo({ url: `/pages/thinkingDetail/thinkingDetail?slug=${slug}` })
  },

  shuffleDaily() {
    this.pickDaily(true)
  },

  retry() {
    this.loadBase(true)
  },

  onPullDownRefresh() {
    this.loadBase(true).then(
      () => wx.stopPullDownRefresh(),
      () => wx.stopPullDownRefresh()
    )
  },

  onReachBottom() {
    this.loadMore()
  },

  onShareAppMessage() {
    return { title: '思维模型库 · 191 个模型 · 鲁力铭', path: '/pages/thinking/thinking' }
  }
})
