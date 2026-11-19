const api = require('../../utils/api')
const { resolveFields, resolveUrl } = require('../../utils/util')
const categories = require('../../utils/categories')

const MAX_ROWS = 5
// 列表上方的内容类型切换，与分类导览、全站搜索共用同一份配置
const TYPE_TABS = categories.CATEGORIES.map(item => ({
  key: item.key,
  name: item.name,
  icon: item.icon,
  en: item.en,
  unit: item.unit,
  section: item.section,
  path: item.path
}))

function text(value) {
  return String(value == null ? '' : value).trim()
}

function joinParts(parts) {
  return parts.map(text).filter(Boolean).join(' · ')
}

function withQuery(base, keyword) {
  if (!keyword) return base
  return `${base}${base.indexOf('?') >= 0 ? '&' : '?'}q=${encodeURIComponent(keyword)}`
}

// 各类作品的字段不同，统一成 { id, title, subtitle, path }
function rowFor(key, item, index) {
  const id = text(item.id) || `row_${index}`
  const enc = encodeURIComponent(id)
  if (key === 'article') {
    return {
      id, title: text(item.title) || '未命名文章',
      subtitle: joinParts([item.category, item.date, item.excerpt]),
      path: `/pages/detail/detail?id=${enc}`
    }
  }
  if (key === 'album') {
    const count = (item.photos && item.photos.length) || item.count || 0
    const first = Array.isArray(item.photos) ? item.photos[0] : null
    const firstSrc = typeof first === 'string' ? first : (first && (first.src || first.url || first.cover))
    return {
      id, title: text(item.name) || '未命名相册',
      subtitle: `${count} 张照片`,
      path: `/pages/album/album?id=${enc}`,
      thumb: resolveUrl(item.cover || firstSrc)
    }
  }
  if (key === 'software') {
    return {
      id, title: text(item.name) || '未命名作品',
      subtitle: text(item.description),
      path: `/pages/softwares/softwares?id=${enc}`,
      thumb: resolveUrl(item.image)
    }
  }
  if (key === 'skill') {
    return {
      id, title: text(item.name) || '未命名技能',
      subtitle: text(item.description),
      path: ''
    }
  }
  if (key === 'poem') {
    const lines = String(item.content || '')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
    return {
      id, title: text(item.title) || '无题',
      subtitle: joinParts([item.dynasty ? `[${item.dynasty}]` : '', item.author, item.date]),
      lines,
      poem: true,
      path: ''
    }
  }
  const line = text(item.text)
  return {
    id, title: line || '未命名思考',
    subtitle: text(item.author),
    quote: true,
    path: ''
  }
}

Page({
  data: {
    guides: categories.withCounts({}),
    works: [],
    types: TYPE_TABS,
    currentType: 'article',
    currentTypeName: '文章',
    currentTypePath: '',
    sectionTitle: 'LATEST ARTICLES',
    typeRows: [],
    typeLoading: false,
    typeError: '',
    keyword: '',
    total: 0,
    loading: true,
    error: '',
    countText: '共 0 篇文章',
    searching: false,
    searchLoading: false,
    searchError: '',
    searchGroups: [],
    searchTotal: 0,
    emptyText: ''
  },

  onLoad() {
    this.allWorks = []
    this.typeCache = {}
    this.scrollTop = 0
    this.searchSeq = 0
    this.fetchWorks()
    this.loadGuides()
  },

  onPageScroll(e) {
    this.scrollTop = e.scrollTop || 0
  },

  onPullDownRefresh() {
    let task
    if (this.data.searching) {
      task = this.searchAll()
    } else if (this.data.currentType === 'article') {
      task = Promise.all([this.fetchWorks(), this.loadGuides()])
    } else {
      // 强制刷新当前类型，避免下拉后仍是缓存
      this.typeCache[this.data.currentType] = null
      task = Promise.all([this.loadTypeRows(this.data.currentType), this.loadGuides()])
    }
    task.then(() => wx.stopPullDownRefresh())
  },

  // 分类条数来自 /api/open 索引，一次请求拿全部模块的数量
  loadGuides() {
    return api.getIndex()
      .then(res => this.setData({
        guides: categories.withCounts(categories.countsFromIndex(res))
      }))
      .catch(err => {
        console.warn('[works] 分类数量加载失败', err)
        this.setData({ guides: categories.withCounts({}) })
      })
  },

  onGuideTap(e) {
    const item = categories.byKey(e.currentTarget.dataset.key)
    if (!item) return
    if (item.tab) return this.scrollToArticles()
    wx.navigateTo({ url: item.path })
  },

  // 文章就在本页，点击「文章」卡片切回文章类型并滚动到下方列表
  scrollToArticles() {
    if (this.data.currentType !== 'article') {
      this.onTypeTap({ currentTarget: { dataset: { key: 'article' } } })
    }
    wx.createSelectorQuery().in(this).select('.article-section').boundingClientRect(rect => {
      if (!rect) return
      wx.pageScrollTo({
        scrollTop: Math.max(0, rect.top + (this.scrollTop || 0) - 20),
        duration: 300
      })
    }).exec()
  },

  fetchWorks() {
    this.setData({ loading: true, error: '' })
    return api.getList('works')
      .then(res => {
        this.allWorks = resolveFields(res.items, ['cover'])
        this.setData({ total: res.total, loading: false })
        this.renderCurrent()
      })
      .catch(err => {
        this.setData({
          loading: false,
          error: err.message || '加载失败，请检查网络与合法域名配置'
        })
      })
  },

  // 文章类型直接展示全量文章，不再按文章内部分类筛选
  showAllWorks() {
    const works = this.allWorks
    this.setData({ works, countText: `共 ${works.length} 篇文章` })
  },

  // 当前内容类型：文章用原有卡片列表，其它类型按接口数据渲染通用行
  renderCurrent() {
    if (this.data.currentType === 'article') {
      this.setData({ typeLoading: false, typeError: '', typeRows: [] })
      this.showAllWorks()
      return Promise.resolve()
    }
    return this.loadTypeRows(this.data.currentType)
  },

  onTypeTap(e) {
    const key = e.currentTarget.dataset.key
    const item = categories.byKey(key)
    if (!item || key === this.data.currentType) return
    this.setData({
      currentType: key,
      currentTypeName: item.name,
      currentTypePath: item.path,
      sectionTitle: `LATEST ${item.en}`,
      typeRows: [],
      typeError: ''
    })
    this.renderCurrent()
  },

  // 按需拉取对应模块，按类型缓存，切换回来不重复请求
  loadTypeRows(key) {
    const item = categories.byKey(key)
    if (!item) return Promise.resolve()
    this.typeCache = this.typeCache || {}
    const cached = this.typeCache[key]
    if (cached) {
      this.showTypeRows(key, cached)
      return Promise.resolve()
    }
    this.setData({ typeLoading: true, typeError: '' })
    return api.getList(item.section, { pageSize: 200 })
      .then(res => {
        const items = Array.isArray(res.items) ? res.items : []
        const entry = { items, total: res.total || items.length }
        this.typeCache[key] = entry
        if (this.data.currentType === key) this.showTypeRows(key, entry)
      })
      .catch(err => {
        if (this.data.currentType === key) {
          this.setData({ typeLoading: false, typeError: err.message || '加载失败，请检查网络与合法域名配置' })
        }
      })
  },

  showTypeRows(key, entry) {
    const item = categories.byKey(key)
    if (!item) return
    const rows = entry.items.map((raw, index) => {
      const row = rowFor(item.key, raw, index)
      return Object.assign({ thumb: '', icon: item.icon }, row, { path: row.path || item.path })
    })
    this.setData({
      typeLoading: false,
      typeRows: rows,
      countText: `共 ${entry.total} ${item.unit} · ${item.name}`
    })
  },

  openTypePage() {
    const path = this.data.currentTypePath
    if (path) wx.navigateTo({ url: path })
  },

  // 缩略图加载失败改为类型图标占位，避免出现破图
  onThumbError(e) {
    const index = Number(e.currentTarget.dataset.index)
    if (!isFinite(index) || index < 0) return
    this.setData({ [`typeRows[${index}].thumb`]: '' })
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value })
    clearTimeout(this.searchTimer)
    if (!e.detail.value.trim()) return this.clearSearch()
    this.searchTimer = setTimeout(() => this.searchAll(), 350)
  },

  clearSearch() {
    clearTimeout(this.searchTimer)
    this.searchSeq = (this.searchSeq || 0) + 1
    this.setData({
      keyword: '',
      searching: false,
      searchLoading: false,
      searchError: '',
      searchGroups: [],
      searchTotal: 0,
      emptyText: ''
    })
    // 清空搜索后回到当前类型；非文章类型直接用缓存，无需再拉文章
    return this.data.currentType === 'article' ? this.fetchWorks() : this.renderCurrent()
  },

  // 全站搜索：并发查 6 类作品，逐类独立失败不影响其它类
  searchAll() {
    const keyword = this.data.keyword.trim()
    if (!keyword) return this.clearSearch()
    const seq = (this.searchSeq || 0) + 1
    this.searchSeq = seq
    this.setData({ searching: true, searchLoading: true, searchError: '' })

    const tasks = categories.CATEGORIES.map(section =>
      api.getList(section.section, { q: keyword, pageSize: 200 })
        .then(res => ({
          section,
          items: Array.isArray(res.items) ? res.items : [],
          total: res.total || 0,
          failed: false
        }))
        .catch(err => {
          console.warn(`[search] ${section.section}`, err)
          return { section, items: [], total: 0, failed: true }
        })
    )

    return Promise.all(tasks).then(list => {
      // 用户输入已变化，丢弃过期结果
      if (seq !== this.searchSeq || this.data.keyword.trim() !== keyword) return
      const groups = list
        .map(entry => this.buildGroup(entry.section, entry.items, entry.total, keyword))
        .filter(group => group.items.length)
      const total = groups.reduce((sum, group) => sum + group.total, 0)
      const allFailed = list.every(entry => entry.failed)
      this.setData({
        searchGroups: groups,
        searchTotal: total,
        searchLoading: false,
        searchError: allFailed ? '搜索服务不可用，请检查网络与合法域名配置' : '',
        emptyText: `没有找到与「${keyword}」相关的作品`,
        countText: `「${keyword}」· ${total} 条结果 · ${groups.length} 类作品`
      })
    })
  },

  buildGroup(section, items, total, keyword) {
    const listPath = withQuery(section.path, keyword)
    const rows = items.slice(0, MAX_ROWS).map((item, i) => {
      const row = rowFor(section.key, item, i)
      return Object.assign({}, row, { path: row.path || listPath })
    })
    return {
      key: section.key,
      name: section.name,
      icon: section.icon,
      total,
      items: rows,
      morePath: listPath
    }
  },

  onResultTap(e) {
    const url = e.currentTarget.dataset.url
    if (url) wx.navigateTo({ url })
  },

  onGroupMore(e) {
    const key = e.currentTarget.dataset.key
    // 文章结果就在本页，清空搜索即可回到完整列表
    if (key === 'article') return this.clearSearch()
    const group = this.data.searchGroups.filter(item => item.key === key)[0]
    if (group && group.morePath) wx.navigateTo({ url: group.morePath })
  },

  onRetry() {
    if (this.data.searching) return this.searchAll()
    if (this.data.currentType === 'article') return this.fetchWorks()
    this.typeCache[this.data.currentType] = null
    return this.loadTypeRows(this.data.currentType)
  },

  goDetail(e) {
    wx.navigateTo({ url: `/pages/detail/detail?id=${e.currentTarget.dataset.id}` })
  },

  onShareAppMessage() {
    return { title: '作品 · 鲁力铭', path: '/pages/works/works' }
  }
})
