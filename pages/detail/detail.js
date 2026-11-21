const api = require('../../utils/api')
const { resolveCover, DEFAULT_COVER } = require('../../utils/util')
const markdown = require('../../utils/markdown')

Page({
  data: {
    article: null,
    blocks: [],
    loading: true,
    error: ''
  },

  onLoad(options) {
    this.id = options.id
    if (!this.id) {
      this.setData({ loading: false, error: '缺少文章 ID' })
      return
    }
    this.load()
  },

  load() {
    this.setData({ loading: true, error: '' })
    return api.getDetail('works', this.id)
      .then(article => {
        if (!article) throw new Error('文章不存在')
        this.setData({
          article: Object.assign({}, article, {
            cover: resolveCover(article.cover)
          }),
          blocks: markdown.parse(article.content),
          loading: false
        })
        wx.setNavigationBarTitle({ title: article.title })
      })
      .catch(err => {
        this.setData({ loading: false, error: err.message || '加载失败' })
      })
  },

  onRetry() {
    this.load()
  },

  previewCover() {
    const cover = this.data.article && this.data.article.cover
    if (cover && cover !== DEFAULT_COVER) wx.previewImage({ current: cover, urls: [cover] })
  },

  onCoverError() {
    const article = this.data.article
    if (!article || article.cover === DEFAULT_COVER) return
    this.setData({ 'article.cover': DEFAULT_COVER })
  },

  onBlockImageError(e) {
    const index = Number(e.currentTarget.dataset.index)
    const blocks = this.data.blocks || []
    if (!Number.isInteger(index) || index < 0 || index >= blocks.length) return
    if (blocks[index].src === DEFAULT_COVER) return
    this.setData({ [`blocks[${index}].src`]: DEFAULT_COVER })
  },

  onSpanTap(e) {
    const link = e.currentTarget.dataset.link
    if (!link) return
    wx.setClipboardData({
      data: link,
      success: () => wx.showToast({ title: '链接已复制', icon: 'none' })
    })
  },

  onShareAppMessage() {
    const article = this.data.article || {}
    return {
      title: article.title || '鲁力铭的文章',
      path: `/pages/detail/detail?id=${this.id}`
    }
  }
})
