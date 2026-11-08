const api = require('../../utils/api')
const { resolveUrl, resolveFields } = require('../../utils/util')

Page({
  data: {
    hero: {},
    photos: [],
    poem: null,
    videos: [],
    skills: [],
    works: [],
    quote: null,
    counts: { article: 0, album: 0, video: 0 },
    loading: true
  },

  onLoad() {
    this.poems = []
    this.quotes = []
    this.loadAll()
  },

  onPullDownRefresh() {
    this.loadAll().then(() => wx.stopPullDownRefresh())
  },

  // 各模块并发独立加载，任一接口异常只影响对应模块
  loadAll() {
    this.setData({ loading: true })
    const tasks = [
      this.loadHero(),
      this.loadPhotos(),
      this.loadPoems(),
      this.loadVideos(),
      this.loadSkills(),
      this.loadWorks(),
      this.loadQuotes(),
      this.loadAlbumCount()
    ]
    return Promise.all(tasks).then(() => this.setData({ loading: false }))
  },

  loadHero() {
    return api.getHero()
      .then(hero => {
        this.setData({
          hero: Object.assign({}, hero, { avatarUrl: resolveUrl(hero.avatarUrl) })
        })
      })
      .catch(err => console.warn('[hero]', err))
  },

  loadPhotos() {
    return api.getList('photos')
      .then(res => this.setData({ photos: resolveFields(res.items, ['src']) }))
      .catch(err => console.warn('[photos]', err))
  },

  loadPoems() {
    return api.getList('poems')
      .then(res => {
        this.poems = res.items || []
        this.randomPoem()
      })
      .catch(err => console.warn('[poems]', err))
  },

  loadVideos() {
    return api.getList('videos')
      .then(res => {
        this.setData({
          videos: resolveFields(res.items.slice(0, 4), ['cover', 'src']),
          'counts.video': res.total
        })
      })
      .catch(err => console.warn('[videos]', err))
  },

  loadSkills() {
    return api.getList('skills')
      .then(res => this.setData({ skills: res.items }))
      .catch(err => console.warn('[skills]', err))
  },

  loadWorks() {
    return api.getList('works')
      .then(res => {
        this.setData({
          works: resolveFields(res.items.slice(0, 3), ['cover']),
          'counts.article': res.total
        })
      })
      .catch(err => console.warn('[works]', err))
  },

  loadQuotes() {
    return api.getPage('quotes', 1, 20)
      .then(res => {
        this.quotes = res.items || []
        this.randomQuote()
      })
      .catch(err => console.warn('[quotes]', err))
  },

  loadAlbumCount() {
    return api.getPage('albums', 1, 1)
      .then(res => this.setData({ 'counts.album': res.total }))
      .catch(err => console.warn('[albums]', err))
  },

  randomPoem() {
    if (!this.poems.length) return
    const index = Math.floor(Math.random() * this.poems.length)
    const poem = this.poems[index]
    const lines = String(poem.content || '')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
    this.setData({ poem: Object.assign({}, poem, { lines }) })
  },

  changePoem() {
    if (this.poems.length < 2) return this.randomPoem()
    const current = this.data.poem && this.data.poem.id
    let next = this.poems[Math.floor(Math.random() * this.poems.length)]
    if (next.id === current) {
      next = this.poems[(this.poems.indexOf(next) + 1) % this.poems.length]
    }
    const lines = String(next.content || '').split('\n').map(l => l.trim()).filter(Boolean)
    this.setData({ poem: Object.assign({}, next, { lines }) })
  },

  randomQuote() {
    if (!this.quotes.length) return
    this.setData({ quote: this.quotes[Math.floor(Math.random() * this.quotes.length)] })
  },

  goCategory(e) {
    const type = e.currentTarget.dataset.type
    if (type === 'article') {
      wx.switchTab({ url: '/pages/works/works' })
    } else if (type === 'album') {
      wx.switchTab({ url: '/pages/albums/albums' })
    } else {
      wx.navigateTo({ url: '/pages/videos/videos' })
    }
  },

  goPoems() {
    wx.navigateTo({ url: '/pages/poems/poems' })
  },

  goQuotes() {
    wx.navigateTo({ url: '/pages/quotes/quotes' })
  },

  goVideos() {
    wx.navigateTo({ url: '/pages/videos/videos' })
  },

  goAbout() {
    wx.switchTab({ url: '/pages/about/about' })
  },

  goWorkDetail(e) {
    wx.navigateTo({ url: `/pages/detail/detail?id=${e.currentTarget.dataset.id}` })
  },

  previewPhoto(e) {
    const current = e.currentTarget.dataset.src
    if (!current) return
    wx.previewImage({
      current,
      urls: this.data.photos.map(item => item.src).filter(Boolean)
    })
  },

  onShareAppMessage() {
    const { hero } = this.data
    return {
      title: hero.subtitle || '鲁力铭的个人空间',
      path: '/pages/index/index'
    }
  }
})
