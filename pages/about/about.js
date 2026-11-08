const api = require('../../utils/api')
const { resolveUrl, resolveFields } = require('../../utils/util')

const DEFAULT_COLOR = '#00d4ff'

function safeColor(color) {
  return /^#[0-9a-fA-F]{3,8}$/.test(color || '') ? color : DEFAULT_COLOR
}

Page({
  data: {
    hero: {},
    stats: [],
    softwares: [],
    myskills: [],
    socials: [],
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

    const tasks = [
      api.getHero().then(hero => {
        this.setData({
          hero: Object.assign({}, hero, { avatarUrl: resolveUrl(hero.avatarUrl) })
        })
      }),
      api.getList('stats').then(res => this.setData({ stats: res.items })),
      api.getList('softwares').then(res => {
        this.setData({ softwares: resolveFields(res.items, ['image']) })
      }),
      api.getList('myskills').then(res => this.setData({ myskills: res.items })),
      api.getList('socialMedia').then(res => {
        const socials = resolveFields(res.items, ['qr']).map(item =>
          Object.assign({}, item, { color: safeColor(item.color) })
        )
        this.setData({ socials })
      })
    ]

    let failures = 0
    return Promise.all(tasks.map(task => task.catch(err => {
      console.warn('[about]', err)
      failures++
    }))).then(() => {
      this.setData({
        loading: false,
        error: failures === tasks.length ? '数据加载失败，请检查网络与合法域名配置' : ''
      })
    })
  },

  onRetry() {
    this.load()
  },

  copyUrl(e) {
    const url = e.currentTarget.dataset.url
    if (!url) return
    wx.setClipboardData({
      data: url,
      success: () => wx.showToast({ title: '链接已复制', icon: 'none' })
    })
  },

  previewQr(e) {
    const qr = e.currentTarget.dataset.qr
    if (!qr) {
      wx.showToast({ title: '暂无二维码', icon: 'none' })
      return
    }
    wx.previewImage({
      current: qr,
      urls: [qr],
      fail: () => wx.showToast({ title: '二维码加载失败', icon: 'none' })
    })
  },

  copyBlogLink() {
    wx.setClipboardData({
      data: 'https://www.luliming.xyz',
      success: () => wx.showToast({ title: '链接已复制，可在浏览器打开', icon: 'none' })
    })
  },

  onShareAppMessage() {
    const { hero } = this.data
    return {
      title: hero.subtitle || '鲁力铭',
      path: '/pages/about/about'
    }
  }
})
