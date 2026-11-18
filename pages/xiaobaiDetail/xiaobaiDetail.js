const finance = require('../../utils/xiaobaiApi')

Page({
  data: {
    loading: true,
    errorMsg: '',
    view: null,
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
      // 页面栈里残留的旧版详情视图没有分段数据，切回来时静默重建一次
      if (this.data.view && !Array.isArray(this.data.view.segments)) this.loadDetail(true)
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

  toggleFav() {
    if (!this.id) return
    const isFav = finance.toggleFavorite(this.id)
    this.setData({ isFav })
    wx.showToast({ title: isFav ? '已收藏' : '已取消收藏', icon: 'none' })
  },

  // 本地头像文件失效时退回文字头像，避免留下空白圆框
  onAvatarError(e) {
    const dataset = e.currentTarget.dataset || {}
    const side = dataset.side
    const index = Number(dataset.index)
    if (['src', 'leftSrc', 'rightSrc'].indexOf(side) < 0 || isNaN(index) || index < 0) return
    const patch = {}
    patch[`view.segments[${index}].${side}`] = ''
    this.setData(patch)
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
