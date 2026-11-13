const thinkingApi = require('../../utils/thinkingApi')

const CASE_TYPES = {
  business: { name: '实战', cls: 'biz' },
  life: { name: '生活', cls: 'life' },
  negative: { name: '反例', cls: 'neg' }
}

function stars(value) {
  const level = Math.min(3, Math.max(1, Number(value) || 1))
  return new Array(level + 1).join('⭐')
}

// 把接口返回的详情字段整理成 WXML 直接可渲染的结构，缺失字段一律不渲染
function buildView(model) {
  const usage = model.usage || {}
  const defs = [
    { icon: '🎯', title: '适用场景', sub: '什么时候用它', items: usage.scenarios, ordered: false },
    { icon: '🧭', title: '操作步骤', sub: '具体怎么做', items: usage.steps, ordered: true },
    { icon: '⚠️', title: '常见误区', sub: '容易踩的坑', items: usage.pitfalls, ordered: false },
    { icon: '🔗', title: '搭配使用', sub: '与其他模型组合', items: usage.combineWith, ordered: false }
  ]
  const sections = defs
    .filter(def => Array.isArray(def.items) && def.items.length)
    .map(def => ({
      icon: def.icon,
      title: def.title,
      sub: def.sub,
      ordered: def.ordered,
      items: def.items.map((text, index) => ({ no: index + 1, text: String(text) }))
    }))

  const cases = (Array.isArray(model.cases) ? model.cases : []).map(item => {
    const type = CASE_TYPES[item.type] || { name: '案例', cls: 'biz' }
    return {
      title: item.title || '',
      content: item.content || '',
      typeName: type.name,
      cls: type.cls
    }
  })

  const titles = thinkingApi.getTitleMap()
  const related = (Array.isArray(model.relatedModels) ? model.relatedModels : [])
    .map(slug => ({ slug, title: titles[slug] || slug }))

  return {
    slug: model.slug || '',
    icon: model.icon || '🧠',
    title: model.title || '思维模型',
    subtitle: model.subtitle || '',
    categoryName: thinkingApi.getCategoryName(model.category),
    stars: stars(model.difficulty),
    tags: Array.isArray(model.tags) ? model.tags : [],
    hook: model.hook || '',
    story: model.story || '',
    introduction: model.introduction || '',
    keyInsight: model.keyInsight || '',
    memorySentence: model.memorySentence || '',
    sections,
    cases,
    reading: (Array.isArray(model.furtherReading) ? model.furtherReading : []).map(text => String(text)),
    related,
    updatedAt: model.updatedAt || '',
    featured: !!model.featured
  }
}

Page({
  data: {
    loading: true,
    errorMsg: '',
    model: null,
    isFav: false
  },

  onLoad(options) {
    this.slug = (options && options.slug) || ''
    this.loadDetail(false)
  },

  onShow() {
    if (this.slug && !this.data.loading) {
      this.setData({ isFav: thinkingApi.isFavorite(this.slug) })
    }
  },

  loadDetail(force) {
    if (!this.slug) {
      this.setData({ loading: false, errorMsg: '缺少模型标识，请从模型库进入。' })
      return Promise.resolve()
    }
    this.setData({ loading: true, errorMsg: '' })
    // 从分享直达时本机可能没有列表缓存，顺带拉一份用于显示关联模型名称
    const preload = thinkingApi.getOfflineModels().length
      ? Promise.resolve()
      : thinkingApi.getAllModels().catch(() => null)
    return Promise.all([thinkingApi.getModel(this.slug, force), preload]).then(([model]) => {
      if (!model) throw new Error('没有找到这个模型')
      const view = buildView(model)
      this.setData({
        loading: false,
        errorMsg: '',
        model: view,
        isFav: thinkingApi.isFavorite(this.slug)
      })
      wx.setNavigationBarTitle({ title: view.title })
    }).catch(err => {
      this.setData({
        loading: false,
        errorMsg: (err && err.message) || '模型详情加载失败，请稍后重试。'
      })
    })
  },

  toggleFav() {
    if (!this.slug) return
    const isFav = thinkingApi.toggleFavorite(this.slug)
    this.setData({ isFav })
    wx.showToast({ title: isFav ? '已收藏' : '已取消收藏', icon: 'none' })
  },

  copyText(e) {
    const text = e.currentTarget.dataset.text
    if (text) wx.setClipboardData({ data: text })
  },

  openRelated(e) {
    const slug = e.currentTarget.dataset.slug
    if (slug && slug !== this.slug) {
      wx.navigateTo({ url: `/pages/thinkingDetail/thinkingDetail?slug=${slug}` })
    }
  },

  backToList() {
    if (getCurrentPages().length > 1) wx.navigateBack()
    else wx.redirectTo({ url: '/pages/thinking/thinking' })
  },

  retry() {
    this.loadDetail(true)
  },

  onPullDownRefresh() {
    this.loadDetail(true).then(
      () => wx.stopPullDownRefresh(),
      () => wx.stopPullDownRefresh()
    )
  },

  onShareAppMessage() {
    const title = this.data.model ? this.data.model.title : '思维模型库'
    return {
      title: `${title} · 思维模型库`,
      path: `/pages/thinkingDetail/thinkingDetail?slug=${this.slug}`
    }
  }
})
