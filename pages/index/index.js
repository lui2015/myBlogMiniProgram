const api = require('../../utils/api')
const { resolveUrl, resolveFields } = require('../../utils/util')
const config = require('../../utils/config')
const categories = require('../../utils/categories')

const SKILL_PREVIEW = 5
const PHOTO_LIMIT = 9

Page({
  data: {
    hero: {},
    photos: [],
    poem: null,
    mySkills: [],
    mySkillsMore: false,
    mySkillsTotal: 0,
    works: [],
    softwares: [],
    showSoftware: config.showSoftwareOnHome,
    quote: null,
    counts: { article: 0, album: 0, poem: 0, quote: 0, software: 0 },
    guides: categories.withCounts({}),
    loading: true,
    loadError: ''
  },

  onLoad() {
    this.poems = []
    this.quotes = []
    this.loadAll()
  },

  onShow() {
    // 切回首页时静默刷新相框，后台更新相册后无需重新编译
    if (this.hasShown) this.loadAlbums()
    this.hasShown = true
  },

  onRetry() {
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
      this.loadAlbums(),
      this.loadPoems(),
      this.loadMySkills(),
      this.loadWorks(),
      this.loadSoftwares(),
      this.loadQuotes()
    ]
    // 单个模块同步抛错 / Promise 异常都不能让首页卡在 loading 或整片空白
    return Promise.all(tasks.map(task => Promise.resolve(task).catch(err => {
      console.warn('[index] 模块加载异常', err)
    }))).then(() => {
      this.refreshGuides()
      const d = this.data
      const empty = !d.photos.length && !d.works.length && !d.poem &&
        !d.quote && !d.mySkills.length && !d.softwares.length
      this.setData({
        loading: false,
        loadError: empty ? '暂时没有读取到数据，请检查网络或合法域名配置后重试' : ''
      })
    }).catch(err => {
      console.warn('[index] 首页初始化失败', err)
      this.setData({ loading: false, loadError: '页面初始化失败，点击重试' })
    })
  },

  refreshGuides() {
    this.setData({ guides: categories.withCounts(this.data.counts) })
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

  // 首页相框与「查看更多」进入的相册页同源：展示各相册里上传的真实照片。
  // 后台增删相册照片后首页自动跟随，相册接口异常时才回退「首页照片」模块。
  loadAlbums() {
    return api.getList('albums')
      .then(res => {
        const albums = res.items || []
        const photos = []
        albums.forEach(album => {
          const list = Array.isArray(album.photos) ? album.photos : []
          list.forEach((photo, i) => {
            photos.push({
              id: String((photo && photo.id) || `${album.id}_${i}`),
              src: (photo && photo.src) || album.cover || '',
              title: String((photo && photo.title) || album.name || '').trim(),
              desc: ''
            })
          })
          if (!list.length && album.cover) {
            photos.push({
              id: String(album.id),
              src: album.cover,
              title: String(album.name || '').trim(),
              desc: ''
            })
          }
        })
        this.setData({
          'counts.album': Number(res.total) || albums.length,
          photos: resolveFields(photos.slice(0, PHOTO_LIMIT), ['src']).filter(item => item.src)
        })
      })
      .catch(err => {
        console.warn('[albums]', err)
        return api.getList('photos')
          .then(res => this.setData({ photos: resolveFields(res.items, ['src']) }))
          .catch(err2 => console.warn('[photos]', err2))
      })
  },

  loadPoems() {
    return api.getList('poems')
      .then(res => {
        this.poems = res.items || []
        this.setData({ 'counts.poem': res.total })
        this.randomPoem()
      })
      .catch(err => console.warn('[poems]', err))
  },

  loadMySkills() {
    return api.getList('myskills', { pageSize: 200 })
      .then(res => {
        const items = res.items || []
        this.allMySkills = items
        this.setData({
          mySkills: items.slice(0, SKILL_PREVIEW),
          mySkillsMore: items.length > SKILL_PREVIEW,
          mySkillsTotal: Number(res.total) || items.length,
          'counts.skill': Number(res.total) || items.length
        })
      })
      .catch(err => console.warn('[myskills]', err))
  },

  goMySkills() {
    wx.navigateTo({ url: '/pages/myskills/myskills' })
  },

  onMySkillTap(e) {
    const id = e.currentTarget.dataset.id
    const item = (this.allMySkills || []).find(skill => skill.id === id)
    const url = item && String(item.url || '').trim()
    if (!url || !/^https?:\/\//i.test(url)) return
    wx.setClipboardData({
      data: url,
      success: () => wx.showToast({ title: '已复制技能地址', icon: 'none' })
    })
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

  loadSoftwares() {
    if (!config.showSoftwareOnHome) return Promise.resolve()
    return api.getList('softwares')
      .then(res => this.setData({
        softwares: resolveFields(res.items, ['image']),
        'counts.software': res.total
      }))
      .catch(err => console.warn('[softwares]', err))
  },

  loadQuotes() {
    return api.getPage('quotes', 1, 20)
      .then(res => {
        this.quotes = res.items || []
        this.setData({ 'counts.quote': res.total })
        this.randomQuote()
      })
      .catch(err => console.warn('[quotes]', err))
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

  changeQuote() {
    if (this.quotes.length < 2) return this.randomQuote()
    const current = this.data.quote && this.data.quote.id
    let next = this.quotes[Math.floor(Math.random() * this.quotes.length)]
    if (next.id === current) {
      next = this.quotes[(this.quotes.indexOf(next) + 1) % this.quotes.length]
    }
    this.setData({ quote: next })
  },

  goCategory(e) {
    const item = categories.byKey(e.currentTarget.dataset.key)
    if (!item) return
    if (item.tab) wx.switchTab({ url: item.path })
    else wx.navigateTo({ url: item.path })
  },

  goAllWorks() {
    wx.switchTab({ url: '/pages/works/works' })
  },

  goWorkDetail(e) {
    wx.navigateTo({ url: `/pages/detail/detail?id=${e.currentTarget.dataset.id}` })
  },

  onWorkCoverError(e) {
    const index = Number(e.currentTarget.dataset.index)
    if (!Number.isInteger(index) || index < 0 || index >= this.data.works.length) return
    this.setData({ [`works[${index}].cover`]: '' })
  },

  // 点击作品卡片进入列表页并自动展开对应详情；「查看全部」不传 id
  goSoftwares(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/softwares/softwares${id ? '?id=' + encodeURIComponent(id) : ''}`
    })
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
