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
    socialCards: [],
    blogUrl: '',
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
    // 自媒体平台与二维码单独取；失败时返回 null，保留上次渲染结果
    const socialReq = api.getList('socialMedia')
      .then(res => res.items || [])
      .catch(err => {
        console.warn('[about] /api/open/socialMedia 读取失败', err)
        return null
      })

    return Promise.all([aboutReq, heroReq, socialReq]).then(([about, hero, socialItems]) => {
      const ok = about && Object.keys(about).length > 0
      if (ok) {
        this.lastRemote = about
        this.lastSyncAt = clockText()
      }
      const source = ok ? about : this.lastRemote
      const data = aboutUtil.normalize(source, hero)
      if (socialItems) data.socialCards = aboutUtil.normalizeSocialMedia(socialItems)
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

  // 点击自媒体卡片预览对应二维码，不跳转第三方平台
  onSocialCardTap(e) {
    const qr = e.currentTarget.dataset.qr
    if (!qr) {
      wx.showToast({ title: '暂无二维码', icon: 'none' })
      return
    }
    const urls = this.data.socialCards.map(item => item.qr).filter(Boolean)
    wx.previewImage({ current: qr, urls: urls.length ? urls : [qr] })
  },

  // SKILL TREE 标签带证书时预览大图，无证书不响应
  onSkillTap(e) {
    const certificate = e.currentTarget.dataset.certificate
    if (!certificate) return
    const urls = this.data.skillTree.map(item => item.certificate).filter(Boolean)
    wx.previewImage({ current: certificate, urls: urls.length ? urls : [certificate] })
  },

  onBlogTap(e) {
    const value = e.currentTarget.dataset.value
    if (!value) return
    wx.setClipboardData({
      data: value,
      success: () => wx.showToast({ title: '已复制站点地址', icon: 'none' })
    })
  },

  onShareAppMessage() {
    return { title: '关于我 · 鲁力铭', path: '/pages/about/about' }
  }
})
