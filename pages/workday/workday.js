const workday = require('../../utils/workday')
const holidayLoader = require('../../utils/holidayLoader')

Page({
  data: {
    mode: 'range',
    presets: [
      { key: 'today', label: '今天' },
      { key: 'week', label: '本周' },
      { key: 'month', label: '本月' },
      { key: 'quarter', label: '本季度' },
      { key: 'year', label: '今年' }
    ],
    offsetPresets: [7, 15, 30, -7],
    weekLabels: ['一', '二', '三', '四', '五', '六', '日'],

    startDate: '',
    endDate: '',
    includeEnds: true,
    baseDate: '',
    offsetDays: '7',
    includeStart: false,

    rangeStats: null,
    offsetResult: null,
    calendar: [],
    calendarMonth: '',
    hitGroups: [],

    years: [],
    yearIndex: 0,
    currentYear: '',
    yearGroups: [],
    holidaySource: ''
  },

  onLoad() {
    const today = workday.todayStr()
    const range = workday.presetRange('week', today)
    this.setData({
      startDate: range[0],
      endDate: range[1],
      baseDate: today,
      currentYear: today.slice(0, 4)
    })
    this.loadData()
  },

  onPullDownRefresh() {
    this.loadData().then(() => wx.stopPullDownRefresh())
  },

  loadData() {
    return holidayLoader.load().then(({ index, source }) => {
      this.index = index
      const years = index.years
      const yearIndex = Math.max(0, years.indexOf(this.data.currentYear))
      this.setData({
        holidaySource: source,
        years,
        yearIndex,
        currentYear: years[yearIndex] || this.data.currentYear
      })
      this.refreshYearGroups()
      this.recompute()
    })
  },

  recompute() {
    if (!this.index) return
    if (this.data.mode === 'range') this.computeRange()
    else this.computeOffset()
  },

  computeRange() {
    const { startDate, endDate, includeEnds } = this.data
    if (!workday.isValidDate(startDate) || !workday.isValidDate(endDate)) return

    const result = workday.countRange(startDate, endDate, includeEnds, this.index)
    const month = result.start.slice(0, 7)
    const calendar = workday.monthCalendar(month, this.index, result.start, result.end)
    const hitGroups = this.index.groups.filter(group =>
      group.start <= result.end && group.end >= result.start
    )

    this.setData({
      rangeStats: {
        workdays: result.stats.workdays,
        total: result.stats.total,
        workday: result.stats.workday,
        weekend: result.stats.weekend,
        holiday: result.stats.holiday,
        makeup: result.stats.makeup,
        label: `${result.start} ~ ${result.end}`
      },
      calendar,
      calendarMonth: month,
      hitGroups
    })
  },

  computeOffset() {
    const { baseDate, offsetDays, includeStart } = this.data
    if (!workday.isValidDate(baseDate)) return

    const amount = Number(offsetDays) || 0
    const target = workday.addWorkdays(baseDate, amount, includeStart, this.index)
    this.setData({
      offsetResult: {
        date: target,
        week: workday.weekName(target),
        type: workday.dayType(target, this.index),
        span: Math.abs(workday.diffDays(baseDate, target)),
        label: `${baseDate}  ${amount >= 0 ? '+' : ''}${amount} 个工作日`,
        typeName: { workday: '工作日', weekend: '周末', holiday: '法定节假日', makeup: '调休补班' }[workday.dayType(target, this.index)]
      }
    })
  },

  refreshYearGroups() {
    const year = this.data.currentYear
    const groups = this.index.groups
      .filter(group => group.year === year)
      .map(group => {
        const distance = workday.diffDays(workday.todayStr(), group.start)
        return Object.assign({}, group, {
          key: group.start,
          days: workday.diffDays(group.start, group.end) + 1,
          distanceText: distance >= 0 ? `距今 ${distance} 天` : `已过 ${-distance} 天`,
          makeupText: group.makeup.length
            ? `调休补班 ${group.makeup.length} 天：${group.makeup.join('、')}`
            : ''
        })
      })
    this.setData({ yearGroups: groups })
  },

  onModeTap(e) {
    this.setData({ mode: e.currentTarget.dataset.mode })
    this.recompute()
  },

  onStartChange(e) {
    this.setData({ startDate: e.detail.value })
    this.computeRange()
  },

  onEndChange(e) {
    this.setData({ endDate: e.detail.value })
    this.computeRange()
  },

  onBaseChange(e) {
    this.setData({ baseDate: e.detail.value })
    this.computeOffset()
  },

  onIncludeEndsChange(e) {
    this.setData({ includeEnds: e.detail.value })
    this.computeRange()
  },

  onIncludeStartChange(e) {
    this.setData({ includeStart: e.detail.value })
    this.computeOffset()
  },

  onPresetTap(e) {
    const range = workday.presetRange(e.currentTarget.dataset.key, workday.todayStr())
    this.setData({ startDate: range[0], endDate: range[1] })
    this.computeRange()
  },

  onOffsetInput(e) {
    let value = String(e.detail.value).replace(/[^\d-]/g, '')
    value = value.charAt(0) === '-' ? '-' + value.slice(1).replace(/-/g, '') : value.replace(/-/g, '')
    this.setData({ offsetDays: value })
    this.computeOffset()
  },

  onOffsetPresetTap(e) {
    this.setData({ offsetDays: String(e.currentTarget.dataset.value) })
    this.computeOffset()
  },

  onYearChange(e) {
    const yearIndex = Number(e.detail.value)
    this.setData({
      yearIndex,
      currentYear: this.data.years[yearIndex]
    })
    this.refreshYearGroups()
  },

  onGroupTap(e) {
    const { start, end } = e.currentTarget.dataset
    this.setData({ mode: 'range', startDate: start, endDate: end })
    this.computeRange()
    wx.pageScrollTo({ scrollTop: 0, duration: 300 })
  },

  copyResult() {
    const { mode, rangeStats, offsetResult } = this.data
    const text = mode === 'range'
      ? `${rangeStats.label} 共 ${rangeStats.workdays} 个工作日（总 ${rangeStats.total} 天，含 ${rangeStats.holiday} 天法定节假日、${rangeStats.makeup} 天调休补班）`
      : `${offsetResult.label} → ${offsetResult.date} ${offsetResult.week}`
    wx.setClipboardData({
      data: text,
      success: () => wx.showToast({ title: '结果已复制', icon: 'none' })
    })
  },

  onShareAppMessage() {
    return { title: '工作日计算器', path: '/pages/workday/workday' }
  }
})
