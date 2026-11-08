const api = require('../../utils/api')
const { resolveUrl, resolveFields } = require('../../utils/util')

Page({
  data: {
    album: null,
    photos: [],
    loading: true,
    error: ''
  },

  onLoad(options) {
    this.id = options.id
    if (!this.id) {
      this.setData({ loading: false, error: '缺少相册 ID' })
      return
    }
    this.load()
  },

  load() {
    this.setData({ loading: true, error: '' })
    return api.getDetail('albums', this.id)
      .then(album => {
        if (!album) throw new Error('相册不存在')
        this.setData({
          album: Object.assign({}, album, { cover: resolveUrl(album.cover) }),
          photos: resolveFields(album.photos || [], ['src']),
          loading: false
        })
        wx.setNavigationBarTitle({ title: album.name })
      })
      .catch(err => this.setData({ loading: false, error: err.message || '加载失败' }))
  },

  onRetry() {
    this.load()
  },

  preview(e) {
    const current = e.currentTarget.dataset.src
    if (!current) return
    wx.previewImage({
      current,
      urls: this.data.photos.map(photo => photo.src).filter(Boolean)
    })
  },

  onShareAppMessage() {
    const album = this.data.album || {}
    return {
      title: album.name || '相册 · 鲁力铭',
      path: `/pages/album/album?id=${this.id}`
    }
  }
})
