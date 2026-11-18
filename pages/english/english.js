const english = require('../../utils/englishApi')

Page({
  data: {
    loading: true,
    errorMsg: '',
    view: null,
    date: '',
    showChinese: true,
    imageFailed: false,
    playing: false,
    checked: false,
    checkinText: '今日打卡',
    streak: 0,
    monthCount: 0
  },

  onLoad() {
    this.date = english.todayStr()
    this.setData({ date: this.date })
    this.loadDaily(false)
    this.refreshStats()
  },

  onShow() {
    if (!this.data.loading) this.refreshStats()
  },

  onUnload() {
    if (this.audio) {
      this.audio.destroy()
      this.audio = null
    }
  },

  loadDaily(force) {
    this.setData({ loading: true, errorMsg: '' })
    return english.getDaily(this.date, force).then(res => {
      this.setData({
        loading: false,
        errorMsg: '',
        view: res.data,
        imageFailed: false,
        playing: false
      })
      if (res.stale) wx.showToast({ title: '当前为离线缓存内容', icon: 'none' })
      this.refreshStats()
    }).catch(err => {
      const cached = english.getOfflineDaily(this.date)
      this.setData({
        loading: false,
        view: cached || null,
        errorMsg: cached ? '' : (err.message || '每日英语加载失败，请稍后重试。')
      })
      if (cached) wx.showToast({ title: '联网失败，已显示缓存内容', icon: 'none' })
    })
  },

  refreshStats() {
    const stats = english.checkinStats()
    const checked = english.isCheckedIn(this.date)
    this.setData({
      streak: stats.streak,
      monthCount: stats.monthCount,
      checked,
      checkinText: checked ? '✓ 这天已打卡' : (this.date === english.todayStr() ? '今日打卡' : '给这天打卡')
    })
  },

  // 只允许往回看，接口对未来日期返回 400
  shiftDate(e) {
    const delta = Number(e.currentTarget.dataset.delta)
    if (!delta) return
    const next = english.shiftDate(this.date, delta)
    if (delta > 0 && next > english.todayStr()) return
    this.date = next
    this.setData({ date: next, view: null, showChinese: true, playing: false })
    this.loadDaily(false)
    this.refreshStats()
  },

  toggleChinese() {
    this.setData({ showChinese: !this.data.showChinese })
  },

  copyQuote() {
    const quote = this.data.view && this.data.view.quote
    if (!quote || !quote.english) return
    wx.setClipboardData({
      data: quote.chinese ? `${quote.english}\n${quote.chinese}` : quote.english,
      success: () => wx.showToast({ title: '已复制句子', icon: 'none' })
    })
  },

  playQuote() {
    const quote = this.data.view && this.data.view.quote
    if (!quote || !quote.audioUrl) {
      wx.showToast({ title: '这句暂无配音，可复制后跟读', icon: 'none' })
      return
    }
    if (!wx.createInnerAudioContext) {
      wx.showToast({ title: '当前环境不支持音频播放', icon: 'none' })
      return
    }
    if (!this.audio) {
      this.audio = wx.createInnerAudioContext()
      this.audio.onError(() => {
        this.setData({ playing: false })
        wx.showToast({ title: '音频加载失败，请检查域名白名单', icon: 'none' })
      })
      this.audio.onEnded(() => this.setData({ playing: false }))
      this.audio.onStop(() => this.setData({ playing: false }))
    }
    this.audio.src = quote.audioUrl
    this.audio.play()
    this.setData({ playing: true })
  },

  // 外链配图加载失败时回退到站点原创插画，再失败就隐藏图片
  onImageError() {
    const quote = this.data.view && this.data.view.quote
    if (!quote) return
    if (!this.data.imageFailed && quote.artUrl && quote.image !== quote.artUrl) {
      this.setData({ imageFailed: true, 'view.quote.image': quote.artUrl })
    } else {
      this.setData({ 'view.quote.image': '' })
    }
  },

  checkIn() {
    if (this.data.checked) {
      wx.showToast({ title: '这天已经打过卡啦', icon: 'none' })
      return
    }
    const stats = english.markCheckIn(this.date)
    this.setData({
      checked: true,
      checkinText: '✓ 这天已打卡',
      streak: stats.streak,
      monthCount: stats.monthCount
    })
    wx.showToast({ title: '打卡成功', icon: 'none' })
  },

  backToTools() {
    if (getCurrentPages().length > 1) wx.navigateBack()
    else wx.switchTab({ url: '/pages/tools/tools' })
  },

  retry() {
    this.loadDaily(true)
  },

  onPullDownRefresh() {
    this.loadDaily(true).then(
      () => wx.stopPullDownRefresh(),
      () => wx.stopPullDownRefresh()
    )
  },

  onShareAppMessage() {
    return { title: '每日英语 · 一日一句', path: '/pages/english/english' }
  }
})
