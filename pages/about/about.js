const api = require('../../utils/api')
const aboutUtil = require('../../utils/about')

function clockText() {
  const d = new Date()
  const pad = n => ('0' + n).slice(-2)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

Page({
  data: Object.assign({}, aboutUtil.UI_TEXT, {
    name: '',
    role: '',
    bio: '',
    avatarUrl: '',
    heroAvatarUrl: '',
    avatarText: '',
    socials: [],
    skillTree: [],
    timeline: [],
    loading: true,
    offline: false,
    empty: false,
    error: '',
    syncText: '等待接口数据'
  }),

  onLoad() {
    this.lastRemote = null
    this.lastSyncAt = ''
    this.lastError = ''
    this.hasShown = false
    this.load()
  },

  // 每次回到该 Tab 都静默重新请求，后台改完数据无需重新编译
  onShow() {
    if (this.hasShown) this.load(true)
    this.hasShown = true
  },

  onPullDownRefresh() {
    this.load(true).then(() => wx.stopPullDownRefresh())
  },

  // silent 模式保留当前内容不闪屏；接口失败时沿用上次成功同步的数据
  load(silent) {
    if (!silent) this.setData({ loading: true })
    this.setData({ offline: false, error: '' })

    const aboutReq = api.getAbout().catch(err => {
      console.warn('[about] /api/open/about 读取失败', err)
      this.lastError = (err && err.message) || '网络异常'
      return null
    })
    const heroReq = api.getHero().catch(err => {
      console.warn('[about] /api/open/hero 读取失败', err)
      return {}
    })

    return Promise.all([aboutReq, heroReq]).then(([about, hero]) => {
      const ok = about && Object.keys(about).length > 0
      if (ok) {
        this.lastRemote = about
        this.lastSyncAt = clockText()
      }
      const source = ok ? about : this.lastRemote
      const data = aboutUtil.normalize(source, hero)
      this.setData(Object.assign({}, data, {
        loading: false,
        offline: !ok,
        empty: !source,
        error: ok ? '' : (source ? '接口暂时不可用' : (this.lastError || '加载失败')),
        syncText: ok
          ? `接口实时同步 · ${this.lastSyncAt}`
          : (source ? `上次同步 ${this.lastSyncAt} · 当前离线` : '等待接口数据')
      }))
    })
  },

  onRetry() {
    this.load()
  },

  // about.avatar 加载失败时回退 hero.avatarUrl，仍失败则显示文字头像
  onAvatarError() {
    const fallback = this.data.heroAvatarUrl
    if (fallback && fallback !== this.data.avatarUrl) {
      this.setData({ avatarUrl: fallback })
    } else {
      this.setData({ avatarUrl: '' })
    }
  },

  // 社交地址只做中性复制，不跳转外部网页
  onSocialTap(e) {
    const { value, label } = e.currentTarget.dataset
    if (!value) return
    wx.setClipboardData({
      data: value,
      success: () => wx.showToast({ title: label ? `已复制 ${label}` : '已复制', icon: 'none' })
    })
  },

  onShareAppMessage() {
    return { title: '关于我 · 鲁力铭', path: '/pages/about/about' }
  }
})
