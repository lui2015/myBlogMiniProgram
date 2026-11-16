const finance = require('../../utils/xiaobaiApi')

const PAGE_SIZE = 20
const SORTS = [
  { value: 'latest', name: '最新发布' },
  { value: 'hot', name: '最多阅读' }
]

// /categories 不可用时，从文章列表里推导出一级分类
function deriveCategories(articles) {
  const map = {}
  articles.forEach(item => {
    if (item.categoryId === null || item.categoryId === undefined || !item.categoryName) return
    const key = String(item.categoryId)
    if (!map[key]) {
      map[key] = {
        id: item.categoryId,
        name: item.categoryName,
        slug: item.categorySlug,
        children: []
      }
    }
  })
  return Object.keys(map).map(key => map[key])
}

function decorate(article, favs) {
  return {
    id: article.id,
    title: article.title,
    summary: article.summary,
    categoryName: article.categoryName,
    subCategoryName: article.subCategoryName,
    dateText: article.dateText,
    viewCount: article.viewCount,
    isRecommend: article.isRecommend,
    fav: favs.indexOf(String(article.id)) >= 0
  }
}

Page({
  data: {
    loading: true,
    errorMsg: '',
    statsLine: '',
    sourceLabel: '',
    keyword: '',
    category: 'all',
    subCategory: 'all',
    sort: 'latest',
    sorts: SORTS,
    tabs: [],
    subTabs: [],
    list: [],
    total: 0,
    hasMore: false
  },

  onLoad() {
    this.allArticles = []
    this.filtered = []
    this.catList = []
    this.loadBase(false)
  },

  onShow() {
    if (!this.allArticles || !this.allArticles.length) return
    // 详情页可能刚改过收藏，切回来时同步
    this.buildTabs()
    this.applyFilter()
  },

  loadBase(force) {
    if (!this.allArticles || !this.allArticles.length) this.setData({ loading: true, errorMsg: '' })
    return Promise.all([
      finance.getCategories(force).catch(() => null),
      finance.getAllArticles(force).catch(() => null)
    ]).then(([categories, articles]) => {
      const offline = finance.getOfflineArticles()
      const all = (articles && articles.length) ? articles : offline
      if (!all.length) {
        this.setData({ loading: false, errorMsg: '暂时读不到财经文章，请检查网络后重试。' })
        return
      }
      this.allArticles = all
      this.catList = (categories && categories.length) ? categories : deriveCategories(all)
      this.setData({
        loading: false,
        errorMsg: '',
        sourceLabel: finance.sourceLabel(),
        statsLine: `共 ${all.length} 篇 · ${this.catList.length} 大分类 · 看得懂的财经知识`
      })
      this.buildTabs()
      this.buildSubTabs()
      this.applyFilter()
    }).catch(err => {
      this.setData({ loading: false, errorMsg: (err && err.message) || '数据加载失败，请稍后重试。' })
    })
  },

  buildTabs() {
    const favs = finance.getFavorites()
    const counts = {}
    this.allArticles.forEach(item => {
      const key = String(item.categoryId)
      counts[key] = (counts[key] || 0) + 1
    })
    const tabs = [{ id: 'all', name: '全部', count: this.allArticles.length }]
    this.catList.forEach(item => {
      tabs.push({ id: String(item.id), name: item.name, count: counts[String(item.id)] || 0 })
    })
    tabs.push({ id: 'fav', name: '⭐ 我的收藏', count: favs.length })
    this.setData({ tabs })
  },

  buildSubTabs() {
    const id = this.data.category
    const hit = this.catList.filter(item => String(item.id) === id)[0]
    const children = (hit && hit.children) || []
    const subTabs = [{ id: 'all', name: '全部' }].concat(children.map(child => ({
      id: String(child.id),
      name: child.name
    })))
    this.setData({ subTabs })
  },

  applyFilter() {
    const keyword = (this.data.keyword || '').trim().toLowerCase()
    const favs = finance.getFavorites()
    const category = this.data.category
    const subCategory = this.data.subCategory

    const filtered = (this.allArticles || []).filter(article => {
      if (category === 'fav' && favs.indexOf(String(article.id)) < 0) return false
      if (category !== 'all' && category !== 'fav' && String(article.categoryId) !== String(category)) return false
      if (subCategory !== 'all' && String(article.subCategoryId) !== String(subCategory)) return false
      if (keyword) {
        const hay = [article.title, article.summary, article.categoryName, article.subCategoryName, article.slug]
          .join(' ').toLowerCase()
        if (hay.indexOf(keyword) < 0) return false
      }
      return true
    })

    if (this.data.sort === 'hot') {
      filtered.sort((a, b) => (b.viewCount - a.viewCount) || String(b.publishAt).localeCompare(String(a.publishAt)))
    } else {
      filtered.sort((a, b) => String(b.publishAt).localeCompare(String(a.publishAt)))
    }

    this.filtered = filtered
    const shown = Math.min(PAGE_SIZE, filtered.length)
    this.setData({
      list: filtered.slice(0, shown).map(item => decorate(item, favs)),
      total: filtered.length,
      hasMore: filtered.length > shown
    })
  },

  loadMore() {
    if (!this.data.hasMore || !this.filtered) return
    const next = Math.min(this.data.list.length + PAGE_SIZE, this.filtered.length)
    const favs = finance.getFavorites()
    this.setData({
      list: this.filtered.slice(0, next).map(item => decorate(item, favs)),
      hasMore: next < this.filtered.length
    })
  },

  onSearchInput(e) {
    // 回写原始输入值，避免中文输入法组合过程中被改写
    this.setData({ keyword: e.detail.value || '' })
    this.applyFilter()
  },

  clearSearch() {
    this.setData({ keyword: '' })
    this.applyFilter()
  },

  onCategory(e) {
    this.setData({ category: e.currentTarget.dataset.id, subCategory: 'all' })
    this.buildSubTabs()
    this.applyFilter()
  },

  onSubCategory(e) {
    this.setData({ subCategory: e.currentTarget.dataset.id })
    this.applyFilter()
  },

  onSort(e) {
    this.setData({ sort: e.currentTarget.dataset.value })
    this.applyFilter()
  },

  openArticle(e) {
    const id = e.currentTarget.dataset.id
    if (id) wx.navigateTo({ url: `/pages/xiaobaiDetail/xiaobaiDetail?id=${id}` })
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
    return { title: '小白财经 · 看得懂的财经知识', path: '/pages/xiaobai/xiaobai' }
  }
})
