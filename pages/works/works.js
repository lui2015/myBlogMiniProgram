const api = require('../../utils/api')
const { resolveFields } = require('../../utils/util')
const categories = require('../../utils/categories')

const MAX_ROWS = 5

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
    return {
      id, title: text(item.name) || '未命名相册',
      subtitle: `${count} 张照片`,
      path: `/pages/album/album?id=${enc}`
    }
  }
  if (key === 'software') {
    return {
      id, title: text(item.name) || '未命名作品',
      subtitle: text(item.description),
      path: `/pages/softwares/softwares?id=${enc}`
    }
  }
  if (key === 'poem') {
    return {
      id, title: text(item.title) || '无题',
      subtitle: joinParts([item.dynasty ? `[${item.dynasty}]` : '', item.author, item.date]),
      path: ''
    }
  }
  const line = text(item.text)
  return {
    id, title: line.length > 42 ? `${line.slice(0, 42)}…` : (line || '未命名思考'),
    subtitle: text(item.author),
    path: ''
  }
}

Page({
  data: {
    guides: categories.withCounts({}),
    works: [],
    categories: [],
    currentCategory: '全部',
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
    this.scrollTop = 0
    this.searchSeq = 0
    this.fetchWorks()
    this.loadGuides()
  },

  onPageScroll(e) {
    this.scrollTop = e.scrollTop || 0
  },

  onPullDownRefresh() {
    const task = this.data.searching
      ? this.searchAll()
      : Promise.all([this.fetchWorks(), this.loadGuides()])
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

  // 文章就在本页，点击「文章」卡片滚动到下方列表
  scrollToArticles() {
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
        const cats = ['全部']
        this.allWorks.forEach(work => {
          if (work.category && cats.indexOf(work.category) === -1) {
            cats.push(work.category)
          }
        })
        this.setData({ categories: cats, total: res.total, loading: false })
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
    this.setData({ works, countText: `共 ${works.length} 篇文章` })
  },

  onCategoryTap(e) {
    this.setData({ currentCategory: e.currentTarget.dataset.category })
    this.applyFilter()
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
    return this.fetchWorks()
  },

  // 全站搜索：并发查 5 类作品，逐类独立失败不影响其它类
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
    return this.fetchWorks()
  },

  goDetail(e) {
    wx.navigateTo({ url: `/pages/detail/detail?id=${e.currentTarget.dataset.id}` })
  },

  onShareAppMessage() {
    return { title: '作品 · 鲁力铭', path: '/pages/works/works' }
  }
})
