const api = require('../../utils/api')
const share = require('../../utils/share')
const { resolveUrl, resolveFields, resolveCoverFields, DEFAULT_COVER } = require('../../utils/util')
const config = require('../../utils/config')
const categories = require('../../utils/categories')

const SKILL_PREVIEW = 5
const PHOTO_LIMIT = 9
// 首页诗词 / 思考自动轮播间隔，错开避免两块同时切换
const POEM_AUTO_MS = 10000
const QUOTE_AUTO_MS = 13000
// 首页软件作品自动横向循环滚动：每 3 秒前进约一张卡片
const SOFT_AUTO_MS = 3000
const SOFT_RESUME_MS = 4000

// A/B 交替切换动画 class，保证每次换内容都重新播放入场动画
function flipSwap(flag) {
  return flag === 'a' ? 'b' : 'a'
}

function splitLines(content) {
  return String(content || '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
}

Page({
  data: {
    hero: {},
    photos: [],
    poem: null,
    poemSwap: 'a',
    quoteSwap: 'a',
    mySkills: [],
    mySkillsMore: false,
    mySkillsTotal: 0,
    works: [],
    softwares: [],
    softIndex: 1,
    softProgress: 16,
    softProgressLeft: 0,
    softScrollLeft: 0,
    softAnim: true,
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
    // 页面级再确认一次转发菜单已开启（启动阶段调用在部分机型上会失效）
    share.enableShareMenu()
    // 切回首页时静默刷新相框，后台更新相册后无需重新编译
    if (this.hasShown) this.loadAlbums()
    this.hasShown = true
    this.startAuto()
  },

  onHide() {
    this.stopAuto()
  },

  onUnload() {
    this.stopAuto()
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
      // 数据就绪后再起表，避免首屏网络慢时定时器先空转
      this.startAuto()
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
          works: resolveCoverFields(res.items.slice(0, 3)),
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
        'counts.software': res.total,
        softIndex: 1,
        softProgressLeft: 0,
        softScrollLeft: 0,
        softAnim: true
      }))
      .catch(err => console.warn('[softwares]', err))
  },

  // 滑动时同步页码与进度条；自动滚动与手动滑动都会走这里
  onSoftScroll(e) {
    const detail = e.detail || {}
    const scrollWidth = Number(detail.scrollWidth) || 0
    const clientWidth = Number(detail.clientWidth) || 0
    const max = Math.max(0, scrollWidth - clientWidth)
    const left = Math.max(0, Number(detail.scrollLeft) || 0)
    const total = this.data.softwares.length || 1
    const thumb = scrollWidth > 0 ? Math.min(100, clientWidth / scrollWidth * 100) : 100
    const ratio = max > 0 ? Math.min(1, left / max) : 0
    const step = scrollWidth > 0 ? scrollWidth / total : 1
    const atEnd = max > 0 && left >= max - 4
    this.softViewport = { max, clientWidth, left }
    this.setData({
      softIndex: atEnd ? total : Math.min(total, Math.max(1, Math.floor(left / step) + 1)),
      softProgress: thumb,
      softProgressLeft: ratio * (100 - thumb)
    })
  },

  // 手动触摸时让出控制权，手指离开后稍等再恢复自动轮播
  onSoftTouchStart() {
    this.stopSoftAuto()
  },

  onSoftTouchEnd() {
    this.stopSoftAuto()
    this.softResumeTimer = setTimeout(() => this.startSoftAuto(), SOFT_RESUME_MS)
  },

  startSoftAuto() {
    this.stopSoftAuto()
    this.softTimer = setInterval(() => this.autoScrollSoft(), SOFT_AUTO_MS)
  },

  stopSoftAuto() {
    if (this.softTimer) {
      clearInterval(this.softTimer)
      this.softTimer = null
    }
    if (this.softResumeTimer) {
      clearTimeout(this.softResumeTimer)
      this.softResumeTimer = null
    }
  },

  // 每拍前进约一张卡片；到末尾先关掉动画瞬间回起点，下一拍再恢复平滑滚动
  autoScrollSoft() {
    const state = this.softViewport || {}
    const max = state.max || 0
    if (max <= 0) return
    const step = Math.max(1, Math.round((state.clientWidth || 300) / 2))
    const next = (state.left || 0) + step
    if (next >= max - 2) {
      this.softViewport = { max, clientWidth: state.clientWidth || 300, left: 0 }
      this.setData({ softAnim: false, softScrollLeft: 0 })
      return
    }
    if (!this.data.softAnim) this.setData({ softAnim: true })
    this.setData({ softScrollLeft: next })
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
    const poem = this.poems[Math.floor(Math.random() * this.poems.length)]
    this.setData({
      poem: Object.assign({}, poem, { lines: splitLines(poem.content) }),
      poemSwap: flipSwap(this.data.poemSwap)
    })
  },

  changePoem() {
    this.showNextPoem()
    // 手动换一首后重新计时，避免刚点完马上又被自动切走
    this.startAuto()
  },

  showNextPoem() {
    if (this.poems.length < 2) return this.randomPoem()
    const current = this.data.poem && this.data.poem.id
    let next = this.poems[Math.floor(Math.random() * this.poems.length)]
    if (next.id === current) {
      next = this.poems[(this.poems.indexOf(next) + 1) % this.poems.length]
    }
    this.setData({
      poem: Object.assign({}, next, { lines: splitLines(next.content) }),
      poemSwap: flipSwap(this.data.poemSwap)
    })
  },

  randomQuote() {
    if (!this.quotes.length) return
    this.setData({
      quote: this.quotes[Math.floor(Math.random() * this.quotes.length)],
      quoteSwap: flipSwap(this.data.quoteSwap)
    })
  },

  changeQuote() {
    this.showNextQuote()
    this.startAuto()
  },

  showNextQuote() {
    if (this.quotes.length < 2) return this.randomQuote()
    const current = this.data.quote && this.data.quote.id
    let next = this.quotes[Math.floor(Math.random() * this.quotes.length)]
    if (next.id === current) {
      next = this.quotes[(this.quotes.indexOf(next) + 1) % this.quotes.length]
    }
    this.setData({ quote: next, quoteSwap: flipSwap(this.data.quoteSwap) })
  },

  // 两块内容各自定时轮播；页面不可见时停表，手动切换后整体重新计时
  startAuto() {
    this.stopAuto()
    this.poemTimer = setInterval(() => this.showNextPoem(), POEM_AUTO_MS)
    this.quoteTimer = setInterval(() => this.showNextQuote(), QUOTE_AUTO_MS)
    this.startSoftAuto()
  },

  stopAuto() {
    if (this.poemTimer) {
      clearInterval(this.poemTimer)
      this.poemTimer = null
    }
    if (this.quoteTimer) {
      clearInterval(this.quoteTimer)
      this.quoteTimer = null
    }
    this.stopSoftAuto()
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
    const works = this.data.works || []
    if (!Number.isInteger(index) || index < 0 || index >= works.length) return
    if (works[index].cover === DEFAULT_COVER) return
    this.setData({ [`works[${index}].cover`]: DEFAULT_COVER })
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
