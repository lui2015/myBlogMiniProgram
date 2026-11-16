const finance = require('../../utils/xiaobaiApi')

Page({
  data: {
    loading: true,
    errorMsg: '',
    view: null,
    mode: 'image',
    imageFailed: false,
    isFav: false,
    sourceLabel: ''
  },

  onLoad(options) {
    this.id = (options && options.id) || ''
    this.loadDetail(false)
  },

  onShow() {
    if (this.id && !this.data.loading) {
      this.setData({ isFav: finance.isFavorite(this.id) })
    }
  },

  loadDetail(force) {
    if (!this.id) {
      this.setData({ loading: false, errorMsg: '缺少文章编号，请从小白财经列表进入。' })
      return Promise.resolve()
    }
    this.setData({ loading: true, errorMsg: '' })
    return finance.getArticleView(this.id, force).then(view => {
      this.setData({
        loading: false,
        errorMsg: '',
        view,
        imageFailed: false,
        // 默认调用图片接口以图片形式展示；不可用时退回网页原版 HTML，再退回纯文本
        mode: view.imageUrl ? 'image' : (view.htmlAvailable ? 'html' : 'text'),
        isFav: finance.isFavorite(this.id),
        sourceLabel: finance.sourceLabel()
      })
      wx.setNavigationBarTitle({ title: view.article.title })
    }).catch(err => {
      this.setData({
        loading: false,
        errorMsg: (err && err.message) || '文章详情加载失败，请稍后重试。'
      })
    })
  },

  setMode(e) {
    const mode = e.currentTarget.dataset.mode
    if (mode) this.setData({ mode })
  },

  previewArticleImage() {
    const src = this.data.view && this.data.view.imageUrl
    if (!src) return
    wx.previewImage({
      urls: [src],
      current: src,
      fail: () => wx.showToast({ title: '预览失败，可切换网页原版查看', icon: 'none' })
    })
  },

  // 个别机型不渲染 SVG 时自动回到正文，避免详情页出现空白
  onImageError() {
    if (this.data.imageFailed) return
    const mode = this.data.view && this.data.view.htmlAvailable ? 'html' : 'text'
    this.setData({ imageFailed: true, mode })
    wx.showToast({ title: '图片加载失败，已切换为正文', icon: 'none' })
  },

  toggleFav() {
    if (!this.id) return
    const isFav = finance.toggleFavorite(this.id)
    this.setData({ isFav })
    wx.showToast({ title: isFav ? '已收藏' : '已取消收藏', icon: 'none' })
  },

  // 上一篇 / 下一篇用替换当前页，避免连续翻页撑爆页面栈
  openSibling(e) {
    const id = e.currentTarget.dataset.id
    if (!id || String(id) === String(this.id)) return
    wx.redirectTo({ url: `/pages/xiaobaiDetail/xiaobaiDetail?id=${id}` })
  },

  openRelated(e) {
    const id = e.currentTarget.dataset.id
    if (!id || String(id) === String(this.id)) return
    wx.navigateTo({ url: `/pages/xiaobaiDetail/xiaobaiDetail?id=${id}` })
  },

  backToList() {
    if (getCurrentPages().length > 1) wx.navigateBack()
    else wx.redirectTo({ url: '/pages/xiaobai/xiaobai' })
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
    const title = this.data.view ? this.data.view.article.title : '小白财经'
    return {
      title: `${title} · 小白学财经`,
      path: `/pages/xiaobaiDetail/xiaobaiDetail?id=${this.id}`
    }
  }
})
