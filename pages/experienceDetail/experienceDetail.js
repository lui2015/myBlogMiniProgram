const experienceApi = require('../../utils/experienceApi')
const { buildHtml } = require('../../utils/experienceHtml')

Page({
  data: {
    loading: true,
    errorMsg: '',
    item: null,
    html: '',
    stale: false,
    fullscreen: false
  },

  toggleFullscreen() {
    const next = !this.data.fullscreen
    this.setData({ fullscreen: next })
    wx.pageScrollTo({ scrollTop: 0, duration: 0 })
  },

  onLoad(options) {
    this.id = (options && options.id) || ''
    this.loadDetail(false)
  },

  onPullDownRefresh() {
    this.loadDetail(true).then(() => wx.stopPullDownRefresh())
  },

  loadDetail(force) {
    if (!this.id) {
      this.setData({ loading: false, errorMsg: '缺少经验编号，请从列表进入。' })
      return Promise.resolve()
    }
    this.setData({ loading: true, errorMsg: '' })
    const offline = experienceApi.getOfflineExperiences()
    const cached = offline.items.filter(item => item.id === this.id)[0] || null
    const metaReq = cached
      ? Promise.resolve(cached)
      : experienceApi.getExperienceMeta(this.id)
        .then(res => experienceApi.normalize(res, offline.categories))

    return Promise.all([metaReq, experienceApi.getHtml(this.id, force)])
      .then(([item, htmlRes]) => {
        const view = item || { title: '经验详情', categoryName: '', date: '', sizeText: '', summary: '' }
        this.setData({
          loading: false,
          errorMsg: '',
          item: view,
          html: buildHtml(htmlRes.data),
          stale: !!htmlRes.stale
        })
        if (view.title) wx.setNavigationBarTitle({ title: String(view.title).slice(0, 16) })
      })
      .catch(err => {
        this.setData({
          loading: false,
          errorMsg: (err && err.message) || '正文加载失败，请稍后重试。'
        })
      })
  },

  retry() {
    this.loadDetail(true)
  },

  onShareAppMessage() {
    return {
      title: (this.data.item && this.data.item.title) || '经验沉淀 · 鲁力铭',
      path: `/pages/experienceDetail/experienceDetail?id=${encodeURIComponent(this.id)}`
    }
  }
})
