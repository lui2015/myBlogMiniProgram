const workday = require('../../utils/workday')
const holidayLoader = require('../../utils/holidayLoader')

const STORAGE_KEY = 'countdown_events_v1'
const ICONS = ['🎉', '🎂', '❤️', '🏖️', '🎓', '💼', '✈️', '🎄', '🌙', '⭐', '🏆', '🎵']
const THEMES = [
  { key: 'cyan', label: '青', color: '#00d4ff' },
  { key: 'purple', label: '紫', color: '#a855f7' },
  { key: 'pink', label: '粉', color: '#ff2d95' },
  { key: 'green', label: '绿', color: '#07c160' }
]

function readEvents() {
  try {
    const list = wx.getStorageSync(STORAGE_KEY)
    return Array.isArray(list) ? list : []
  } catch (err) {
    return []
  }
}

function saveEvents(list) {
  try {
    wx.setStorageSync(STORAGE_KEY, list)
  } catch (err) {
    console.warn('[countdown] 保存失败', err)
  }
}

function defaultForm() {
  return {
    name: '',
    date: workday.todayStr(),
    mode: 'natural',
    icon: '🎉',
    theme: 'cyan'
  }
}

Page({
  data: {
    events: [],
    icons: ICONS,
    themes: THEMES,
    modes: [
      { key: 'natural', label: '📅 自然日' },
      { key: 'workday', label: '💼 工作日' }
    ],
    showAdd: false,
    form: defaultForm(),
    today: '',
    holidaySource: ''
  },

  onLoad() {
    this.setData({ today: workday.todayStr(), form: defaultForm() })
    this.renderEvents()
    this.loadHolidays()
  },

  onShow() {
    if (this.index) this.renderEvents()
  },

  onPullDownRefresh() {
    this.renderEvents()
    wx.stopPullDownRefresh()
  },

  loadHolidays() {
    return holidayLoader.load().then(({ index, source }) => {
      this.index = index
      this.setData({ holidaySource: source })
      this.renderEvents()
    })
  },

  renderEvents() {
    const today = workday.todayStr()
    const stored = readEvents()
    const events = stored.map(event => {
      const natural = workday.diffDays(today, event.date)
      let value = natural
      if (event.mode === 'workday') {
        value = this.index ? workday.workdaysBetween(today, event.date, this.index) : 0
      }
      const unit = event.mode === 'workday' ? '个工作日' : '天'
      let status
      if (natural > 0) status = `还有 ${Math.abs(value)} ${unit}`
      else if (natural < 0) status = `已过去 ${Math.abs(value)} ${unit}`
      else status = '就是今天 🎉'

      const theme = THEMES.filter(item => item.key === event.theme)[0] || THEMES[0]
      return Object.assign({}, event, {
        value: Math.abs(value),
        natural,
        status,
        isPast: natural < 0,
        isToday: natural === 0,
        week: workday.weekName(event.date),
        themeColor: theme.color,
        modeLabel: event.mode === 'workday' ? '工作日' : '自然日'
      })
    })

    events.sort((a, b) => {
      const aFuture = a.natural >= 0
      const bFuture = b.natural >= 0
      if (aFuture !== bFuture) return aFuture ? -1 : 1
      return aFuture ? (a.date < b.date ? -1 : 1) : (a.date > b.date ? -1 : 1)
    })

    this.setData({ events })
  },

  openAdd() {
    this.setData({ showAdd: true, form: defaultForm() })
  },

  closeAdd() {
    this.setData({ showAdd: false })
  },

  noop() {},

  onNameInput(e) {
    this.setData({ 'form.name': e.detail.value })
  },

  onDateChange(e) {
    this.setData({ 'form.date': e.detail.value })
  },

  onModeTap(e) {
    this.setData({ 'form.mode': e.currentTarget.dataset.mode })
  },

  onIconTap(e) {
    this.setData({ 'form.icon': e.currentTarget.dataset.icon })
  },

  onThemeTap(e) {
    this.setData({ 'form.theme': e.currentTarget.dataset.key })
  },

  onSubmit() {
    const form = this.data.form
    const name = String(form.name || '').trim()
    if (!name) {
      wx.showToast({ title: '请输入事件名称', icon: 'none' })
      return
    }
    if (!workday.isValidDate(form.date)) {
      wx.showToast({ title: '请选择目标日期', icon: 'none' })
      return
    }

    const list = readEvents()
    list.push({
      id: 'ev_' + Date.now(),
      name,
      date: form.date,
      mode: form.mode,
      icon: form.icon,
      theme: form.theme
    })
    saveEvents(list)
    this.setData({ showAdd: false })
    this.renderEvents()
    wx.showToast({ title: '已添加', icon: 'success' })
  },

  onDelete(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除倒计时',
      content: '确定要删除这个倒计时吗？',
      confirmText: '删除',
      confirmColor: '#ff2d95',
      success: res => {
        if (!res.confirm) return
        const list = readEvents().filter(event => event.id !== id)
        saveEvents(list)
        this.renderEvents()
      }
    })
  },

  onShareAppMessage() {
    return { title: '大事件倒计时', path: '/pages/countdown/countdown' }
  }
})
