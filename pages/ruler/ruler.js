const rulerStorage = require('../../utils/ruler')

const REFS = [
  { key: 'card', label: '银行卡', mm: 85.6, hint: '把银行卡长边（85.6 mm）贴在尺子零点处，拖动滑块让紫色参考线两端与卡片两端对齐。' },
  { key: 'coin', label: '1 元硬币', mm: 25, hint: '把 1 元硬币（直径 25 mm）贴在尺子零点处，拖动滑块让紫色参考线长度与硬币直径一致。' },
  { key: 'a4', label: 'A4 纸', mm: 210, hint: 'A4 纸宽 210 mm，通常超过屏幕宽度，建议改用银行卡或硬币校准。' }
]

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function round(value, digits) {
  const p = Math.pow(10, digits)
  return Math.round(value * p) / p
}

Page({
  data: {
    unit: 'cm',
    isCm: true,
    isVertical: false,
    pxPerCm: rulerStorage.DEFAULT_PX_PER_CM,
    pxPerCmText: rulerStorage.DEFAULT_PX_PER_CM.toFixed(1),
    calibrated: false,
    widthInput: '',
    areaStyle: 'height:150px',
    fullscreen: false,
    rulerLength: 0,
    tickHint: '每小格 1 mm · 数字为 cm',
    ticks: [],
    cursorA: 0,
    cursorB: 0,
    cursorAStyle: 'left:0px',
    cursorBStyle: 'left:0px',
    mainValue: '0.00',
    mainUnit: 'cm',
    subValue: '0.0 mm · 0.00 in',
    resultText: '',
    refs: REFS,
    refKey: '',
    refPx: 0,
    refStyle: 'width:0px',
    refLabel: '',
    refHint: '',
    refOverflow: false
  },

  onLoad() {
    const win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
    this.windowWidth = win.windowWidth || 375
    this.windowHeight = win.windowHeight || 667
    this.rect = null
    this.active = ''
    this.refMm = 0
    this.inited = false
    this.resetCursors = true
    this.scrollTop = 0

    const cal = rulerStorage.read()
    this.setData({
      pxPerCm: cal.value,
      pxPerCmText: cal.value.toFixed(1),
      calibrated: cal.calibrated
    })
    this.measureRect(() => this.rebuild())
  },

  onPageScroll(e) {
    this.scrollTop = e.scrollTop || 0
  },

  measureRect(callback) {
    wx.createSelectorQuery().in(this).select('.ruler-area').boundingClientRect(rect => {
      if (rect) this.rect = rect
      if (callback) callback()
    }).exec()
  },

  // 按当前单位与方向生成刻度；尺寸一律用实测的 ruler-area 宽高
  rebuild() {
    const rect = this.rect || { width: this.windowWidth - 32, height: 420, left: 16, top: 0 }
    const length = this.data.isVertical ? rect.height : rect.width
    const pxPerCm = this.data.pxPerCm
    const step = this.data.isCm ? pxPerCm / 10 : (pxPerCm * 2.54) / 16
    const majorEvery = this.data.isCm ? 10 : 16
    const count = Math.min(600, Math.max(1, Math.floor(length / step) + 1))
    const axis = this.data.isVertical ? 'top' : 'left'
    const ticks = []

    for (let i = 0; i < count; i++) {
      const major = i % majorEvery === 0
      const mid = !major && i % (majorEvery / 2) === 0
      const pos = round(i * step, 2)
      ticks.push({
        pos,
        style: `${axis}:${pos}px`,
        major,
        level: major ? 'major' : (mid ? 'mid' : ''),
        label: major ? String(i / majorEvery) : ''
      })
    }

    let a = clamp(this.data.cursorA, 0, length)
    let b = clamp(this.data.cursorB, 0, length)
    if (this.resetCursors || !this.inited) {
      a = 0
      b = round(Math.min(length * 0.4, 3 * pxPerCm), 2)
      this.inited = true
      this.resetCursors = false
    }

    const refPx = this.refMm ? round(this.refMm * pxPerCm / 10, 2) : 0
    this.setData({
      rulerLength: round(length, 2),
      ticks,
      cursorA: a,
      cursorB: b,
      cursorAStyle: `${axis}:${a}px`,
      cursorBStyle: `${axis}:${b}px`,
      pxPerCmText: pxPerCm.toFixed(1),
      tickHint: this.data.isCm ? '每小格 1 mm · 数字为 cm' : '每小格 1/16 in · 数字为 in',
      refPx,
      refStyle: this.data.isVertical ? `height:${refPx}px` : `width:${refPx}px`,
      refOverflow: refPx > length
    })
    this.updateResult(a, b)
  },

  updateResult(a, b) {
    const cm = Math.abs(b - a) / this.data.pxPerCm
    const inch = cm / 2.54
    this.setData({
      mainValue: (this.data.isCm ? cm : inch).toFixed(2),
      mainUnit: this.data.isCm ? 'cm' : 'in',
      subValue: this.data.isCm
        ? `${(cm * 10).toFixed(1)} mm · ${inch.toFixed(2)} in`
        : `${cm.toFixed(2)} cm · ${(cm * 10).toFixed(1)} mm`,
      resultText: `${cm.toFixed(2)} cm = ${inch.toFixed(2)} in`
    })
  },

  touchPos(e) {
    const touch = e.touches && e.touches[0]
    if (!touch || !this.rect) return null
    const clientY = touch.clientY != null ? touch.clientY : touch.pageY - (this.scrollTop || 0)
    const clientX = touch.clientX != null ? touch.clientX : touch.pageX
    const raw = this.data.isVertical ? clientY - this.rect.top : clientX - this.rect.left
    if (!isFinite(raw)) return null
    return clamp(raw, 0, this.data.rulerLength)
  },

  onRulerStart(e) {
    // 页面可能滚动过，重新量一次尺子在视口中的位置
    this.measureRect()
    const pos = this.touchPos(e)
    if (pos == null) return
    this.active = Math.abs(pos - this.data.cursorA) <= Math.abs(pos - this.data.cursorB) ? 'A' : 'B'
    this.moveCursor(pos)
  },

  onRulerMove(e) {
    if (!this.active) return
    this.moveCursor(this.touchPos(e))
  },

  onRulerEnd() {
    this.active = ''
  },

  moveCursor(pos) {
    if (pos == null || !this.active) return
    const axis = this.data.isVertical ? 'top' : 'left'
    const patch = {}
    const key = this.active === 'A' ? 'cursorA' : 'cursorB'
    const styleKey = this.active === 'A' ? 'cursorAStyle' : 'cursorBStyle'
    patch[key] = round(pos, 2)
    patch[styleKey] = `${axis}:${round(pos, 2)}px`
    this.setData(patch)
    this.updateResult(this.data.cursorA, this.data.cursorB)
  },

  onResetCursors() {
    this.resetCursors = true
    this.rebuild()
  },

  onUnitTap(e) {
    const unit = e.currentTarget.dataset.unit
    if (unit === this.data.unit) return
    this.setData({ unit, isCm: unit === 'cm' }, () => this.rebuild())
  },

  onDirectionTap(e) {
    const vertical = e.currentTarget.dataset.dir === 'vertical'
    if (vertical === this.data.isVertical) return
    this.resetCursors = true
    this.setData({
      isVertical: vertical,
      areaStyle: this.areaStyleFor(this.data.fullscreen, vertical)
    }, () => this.measureRect(() => this.rebuild()))
  },

  // 全屏时高度交给 CSS 铺满，非全屏按方向给固定高度
  areaStyleFor(fullscreen, vertical) {
    if (fullscreen) return ''
    return vertical ? 'height:420px' : 'height:150px'
  },

  toggleFullscreen() {
    const fullscreen = !this.data.fullscreen
    this.setData({
      fullscreen,
      areaStyle: this.areaStyleFor(fullscreen, this.data.isVertical)
    }, () => this.measureRect(() => this.rebuild()))
  },

  // 手机旋转 / 窗口尺寸变化时，重新量尺子并生成刻度
  onResize(res) {
    const size = res && res.size
    if (size) {
      this.windowWidth = size.windowWidth || this.windowWidth
      this.windowHeight = size.windowHeight || this.windowHeight
    }
    this.measureRect(() => this.rebuild())
  },

  onSliderChange(e) {
    this.applyCalibration(Number(e.detail.value))
  },

  onStepTap(e) {
    const delta = Number(e.currentTarget.dataset.delta)
    this.applyCalibration(this.data.pxPerCm + delta)
  },

  applyCalibration(value) {
    const next = rulerStorage.save(value)
    this.setData({
      pxPerCm: next,
      pxPerCmText: next.toFixed(1),
      calibrated: true
    }, () => this.rebuild())
  },

  onWidthInput(e) {
    this.setData({ widthInput: e.detail.value })
  },

  // 用实体尺量出屏幕宽度（mm），直接推出每厘米像素数
  onWidthApply() {
    const mm = Number(this.data.widthInput)
    if (!mm || mm < 30 || mm > 300) {
      wx.showToast({ title: '请输入 30~300 mm', icon: 'none' })
      return
    }
    this.applyCalibration((this.windowWidth / mm) * 10)
    wx.showToast({ title: '校准完成', icon: 'none' })
  },

  onRefTap(e) {
    const key = e.currentTarget.dataset.key
    const ref = REFS.filter(item => item.key === key)[0]
    if (!ref) return
    this.refMm = ref.mm
    const refPx = round(ref.mm * this.data.pxPerCm / 10, 2)
    this.setData({
      refKey: key,
      refPx,
      refStyle: this.data.isVertical ? `height:${refPx}px` : `width:${refPx}px`,
      refLabel: `${ref.label} · ${ref.mm} mm`,
      refHint: ref.hint,
      refOverflow: refPx > this.data.rulerLength
    })
  },

  onRefClose() {
    this.refMm = 0
    this.setData({
      refKey: '',
      refPx: 0,
      refStyle: this.data.isVertical ? 'height:0px' : 'width:0px',
      refLabel: '',
      refHint: '',
      refOverflow: false
    })
  },

  onResetCalibration() {
    rulerStorage.clear()
    this.setData({
      pxPerCm: rulerStorage.DEFAULT_PX_PER_CM,
      pxPerCmText: rulerStorage.DEFAULT_PX_PER_CM.toFixed(1),
      calibrated: false,
      widthInput: ''
    }, () => this.rebuild())
  },

  copyResult() {
    wx.setClipboardData({
      data: this.data.resultText,
      success: () => wx.showToast({ title: '已复制', icon: 'none' })
    })
  },

  onShareAppMessage() {
    return { title: '尺子 · 实用小工具', path: '/pages/ruler/ruler' }
  }
})
