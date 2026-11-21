const pomodoro = require('../../utils/pomodoro')

Page({
  data: {
    phases: pomodoro.PHASES,
    phaseKey: 'focus',
    phaseName: '专注',
    phaseShort: 'FOCUS',
    phaseHint: '关掉通知，只做一件事',
    phaseTone: 'focus',
    ringColor: '#9aa8c7',
    remainingText: '25:00',
    percent: 0,
    running: false,
    phaseDone: false,
    nextPhaseKey: 'short',
    nextPhaseName: '短休息',
    mainText: '开始专注',
    statusText: '准备开始',
    completed: 0,
    settings: Object.assign({}, pomodoro.DEFAULT),
    settingRows: [],
    stats: { todayCount: 0, todayMinutes: 0, streakDays: 0, totalCount: 0 }
  },

  onLoad() {
    const settings = pomodoro.readSettings()
    this.running = false
    this.startedAt = 0
    this.accumulated = 0
    this.timer = null
    this.completed = 0
    this.hasStarted = false
    this.setData({ settings, settingRows: this.buildSettingRows(settings) })
    this.refreshStats()
    this.resetTimer()
  },

  onShow() {
    // 计时基于时间戳，切到后台再回来只需重启刷新定时器
    if (this.running && !this.timer) this.startTimer()
    this.render()
    this.refreshStats()
  },

  onHide() {
    this.stopTimer()
  },

  onUnload() {
    this.stopTimer()
  },

  buildSettingRows(settings) {
    return [
      { field: 'focus', name: '专注时长', hint: '一个番茄的长度', value: `${settings.focus} 分钟` },
      { field: 'short', name: '短休息', hint: '每个番茄后的小憩', value: `${settings.short} 分钟` },
      { field: 'long', name: '长休息', hint: '一轮结束后的放松', value: `${settings.long} 分钟` },
      { field: 'longEvery', name: '长休间隔', hint: '每完成几个番茄长休', value: `${settings.longEvery} 个` }
    ]
  },

  refreshStats() {
    const stats = pomodoro.readStats()
    const today = pomodoro.todayStr()
    this.setData({
      stats: {
        todayCount: stats.today === today ? stats.todayCount : 0,
        todayMinutes: stats.today === today ? stats.todayMinutes : 0,
        streakDays: stats.streakDays,
        totalCount: stats.totalCount
      }
    })
  },

  actionText() {
    if (this.data.phaseDone) return `开始${this.data.nextPhaseName} →`
    if (this.running) return '暂停'
    if (this.hasStarted) return '继续'
    return `开始${this.data.phaseName}`
  },

  stateText() {
    if (this.data.phaseDone) return '本阶段完成'
    if (this.running) return '计时中 · 切到后台也不会停'
    if (this.hasStarted) return '已暂停'
    return '准备开始'
  },

  render() {
    const settings = this.data.settings
    const totalMs = (settings[this.data.phaseKey] || 1) * 60000
    const elapsed = this.accumulated + (this.running ? Date.now() - this.startedAt : 0)
    const remaining = Math.max(0, totalMs - elapsed)
    const percent = Math.min(100, Math.max(0, elapsed / totalMs * 100))
    this.setData({
      remainingText: pomodoro.format(Math.ceil(remaining / 1000)),
      percent: Number(percent.toFixed(1))
    })
    if (remaining <= 0 && !this.data.phaseDone) this.completePhase()
  },

  startTimer() {
    if (this.timer) return
    this.timer = setInterval(() => this.render(), 250)
  },

  stopTimer() {
    if (!this.timer) return
    clearInterval(this.timer)
    this.timer = null
  },

  toggle() {
    if (this.data.phaseDone) return this.goNextPhase()
    if (this.running) {
      this.accumulated += Date.now() - this.startedAt
      this.running = false
      this.stopTimer()
    } else {
      this.startedAt = Date.now()
      this.running = true
      this.hasStarted = true
      this.startTimer()
    }
    this.setData({
      running: this.running,
      mainText: this.actionText(),
      statusText: this.stateText()
    })
    this.render()
  },

  start() {
    this.startedAt = Date.now()
    this.accumulated = 0
    this.running = true
    this.hasStarted = true
    this.setData({
      running: true,
      phaseDone: false,
      mainText: '暂停',
      statusText: this.stateText()
    })
    this.startTimer()
    this.render()
  },

  resetTimer() {
    this.stopTimer()
    this.running = false
    this.accumulated = 0
    this.startedAt = 0
    this.hasStarted = false
    this.setData({
      running: false,
      phaseDone: false,
      mainText: `开始${this.data.phaseName}`,
      statusText: '准备开始'
    })
    this.render()
  },

  switchPhase(key) {
    const phase = pomodoro.PHASES.find(item => item.key === key)
    if (!phase) return
    this.stopTimer()
    this.running = false
    this.accumulated = 0
    this.startedAt = 0
    this.hasStarted = false
    this.setData({
      phaseKey: key,
      phaseName: phase.name,
      phaseShort: phase.short,
      phaseHint: phase.hint,
      phaseTone: key === 'focus' ? 'focus' : 'break',
      ringColor: key === 'focus' ? '#9aa8c7' : '#ffb86b',
      phaseDone: false,
      running: false,
      mainText: `开始${phase.name}`,
      statusText: '准备开始'
    })
    this.render()
  },

  completePhase() {
    this.stopTimer()
    this.running = false
    const wasFocus = this.data.phaseKey === 'focus'
    if (wasFocus) {
      pomodoro.recordFocus(this.data.settings.focus)
      this.completed += 1
      this.refreshStats()
    }
    const nextKey = wasFocus
      ? pomodoro.nextPhaseKey(this.completed, this.data.settings)
      : 'focus'
    const next = pomodoro.PHASES.find(item => item.key === nextKey) || pomodoro.PHASES[0]
    this.setData({
      running: false,
      phaseDone: true,
      nextPhaseKey: nextKey,
      nextPhaseName: next.name,
      mainText: `开始${next.name} →`,
      statusText: wasFocus ? '专注完成 · 休息一下' : '休息结束 · 准备下一个番茄',
      completed: this.completed,
      percent: 100,
      remainingText: '00:00'
    })
    wx.showToast({
      title: wasFocus ? '完成一个番茄，休息一下' : '休息结束，继续加油',
      icon: 'none'
    })
  },

  goNextPhase() {
    this.switchPhase(this.data.nextPhaseKey)
    this.start()
  },

  skip() {
    // 跳过不记入完成统计
    this.switchPhase(this.data.phaseKey === 'focus' ? 'short' : 'focus')
  },

  onPhaseTap(e) {
    this.switchPhase(e.currentTarget.dataset.key)
  },

  onSettingStep(e) {
    const field = e.currentTarget.dataset.field
    const delta = Number(e.currentTarget.dataset.delta)
    const range = pomodoro.RANGES[field]
    if (!range || (delta !== 1 && delta !== -1)) return
    const current = this.data.settings[field]
    if (typeof current !== 'number') return
    const value = Math.max(range[0], Math.min(range[1], current + delta))
    if (value === current) return
    const settings = Object.assign({}, this.data.settings, { [field]: value })
    pomodoro.saveSettings(settings)
    this.setData({ settings, settingRows: this.buildSettingRows(settings) })
    // 时长变了就重置当前阶段，避免倒计时与配置不一致
    this.resetTimer()
  },

  backToTools() {
    if (getCurrentPages().length > 1) wx.navigateBack()
    else wx.switchTab({ url: '/pages/tools/tools' })
  },

  onShareAppMessage() {
    return { title: '番茄时钟 · 25 分钟只做一件事', path: '/pages/pomodoro/pomodoro' }
  }
})
