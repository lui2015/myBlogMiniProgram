const api = require('../../utils/api')
const { resolveFields } = require('../../utils/util')

Page({
  data: {
    albums: [],
    loading: true,
    error: ''
  },

  onLoad() {
    this.load()
  },

  onPullDownRefresh() {
    this.load().then(() => wx.stopPullDownRefresh())
  },

  load() {
    this.setData({ loading: true, error: '' })
    return api.getList('albums')
      .then(res => {
        const albums = resolveFields(res.items, ['cover']).map(album =>
          Object.assign({}, album, {
            photoCount: (album.photos && album.photos.length) || album.count || 0
          })
        )
        this.setData({ albums, loading: false })
      })
      .catch(err => {
        this.setData({ loading: false, error: err.message || '加载失败' })
      })
  },

  onRetry() {
    this.load()
  },

  goAlbum(e) {
    wx.navigateTo({ url: `/pages/album/album?id=${e.currentTarget.dataset.id}` })
  },

  onShareAppMessage() {
    return { title: '相册 · 鲁力铭', path: '/pages/albums/albums' }
  }
})
