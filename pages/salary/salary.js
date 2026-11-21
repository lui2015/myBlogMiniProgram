const salary = require('../../utils/salary')

Page({
  data: {
    yearlyInput: '',
    monthlyInput: '',
    yearly: 0,
    mode: 'continuous',
    modes: salary.MODES,
    modeHint: '',
    perDay: '',
    perHour: '',
    perMinute: '',
    perSecond: '',
    earned: '¥0.0000',
    elapsed: '00:00:00',
    running: true
  },

  onLoad() {
    const settings = salary.readSettings()
    this.perSecond = 0
    this.startedAt = Date.now()
    this.pausedMs = 0
    this.pausedAt = 0
    this.timer = null
    this.running = true
    this.setData({
      yearlyInput: salary.trimNumber(settings.yearly),
      monthlyInput: salary.trimNumber(settings.yearly / 12),
      yearly: settings.yearly,
      mode: settings.mode
    })
    this.recompute()
    this.startTimer()
  },

  onShow() {
    // 用时间戳计算累计，切到后台再回来依然连续，只需重启刷新定时器
    if (this.running && !this.timer) this.startTimer()
  },

  onHide() {
    this.stopTimer()
  },

  onUnload() {
    this.stopTimer()
  },

  recompute() {
    const result = salary.rates(this.data.yearly, this.data.mode)
    this.perSecond = result.perSecond
    this.setData({
      modeHint: result.mode.hint,
      perDay: salary.money(result.perDay),
      perHour: salary.money(result.perHour),
      perMinute: salary.money(result.perMinute),
      perSecond: salary.money(result.perSecond)
    })
    salary.saveSettings({ yearly: this.data.yearly, mode: this.data.mode })
    this.tick()
  },

  onAmountInput(e) {
    const field = e.currentTarget.dataset.field
    const raw = String(e.detail.value || '')
    const value = salary.toAmount(raw)
    const patch = { yearly: field === 'yearly' ? value : value * 12 }
    if (field === 'yearly') {
      patch.yearlyInput = raw
      patch.monthlyInput = value ? salary.trimNumber(value / 12) : ''
    } else if (field === 'monthly') {
      patch.monthlyInput = raw
      patch.yearlyInput = value ? salary.trimNumber(value * 12) : ''
    } else {
      return
    }
    this.setData(patch)
    this.recompute()
  },

  onModeTap(e) {
    const picked = salary.MODES.find(item => item.key === e.currentTarget.dataset.mode)
    if (!picked || picked.key === this.data.mode) return
    this.setData({ mode: picked.key })
    this.recompute()
  },

  tick() {
    const now = Date.now()
    const paused = this.pausedMs + (this.pausedAt ? now - this.pausedAt : 0)
    const elapsed = Math.max(0, now - this.startedAt - paused)
    this.setData({
      elapsed: salary.duration(elapsed),
      earned: salary.money(this.perSecond * elapsed / 1000, 4)
    })
  },

  startTimer() {
    if (this.timer) return
    this.timer = setInterval(() => this.tick(), 100)
  },

  stopTimer() {
    if (!this.timer) return
    clearInterval(this.timer)
    this.timer = null
  },

  toggleTimer() {
    if (this.running) {
      this.pausedAt = Date.now()
      this.running = false
      this.stopTimer()
    } else {
      if (this.pausedAt) this.pausedMs += Date.now() - this.pausedAt
      this.pausedAt = 0
      this.running = true
      this.startTimer()
    }
    this.setData({ running: this.running })
    this.tick()
  },

  resetTimer() {
    this.startedAt = Date.now()
    this.pausedMs = 0
    this.pausedAt = this.running ? 0 : Date.now()
    this.tick()
  },

  backToTools() {
    if (getCurrentPages().length > 1) wx.navigateBack()
    else wx.switchTab({ url: '/pages/tools/tools' })
  },

  onShareAppMessage() {
    return { title: '薪酬计算器 · 看看你每秒赚多少', path: '/pages/salary/salary' }
  }
})
