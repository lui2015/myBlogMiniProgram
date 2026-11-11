// 尺子校准数据：只存本机，不联网、不上传
// pxPerCm 表示「1 厘米对应多少逻辑 px」，不同机型不同，需用户用参照物校准
const STORAGE_KEY = 'ruler_calibration_v1'
const DEFAULT_PX_PER_CM = 56
const MIN = 20
const MAX = 160

function round(value, digits) {
  const p = Math.pow(10, digits)
  return Math.round(value * p) / p
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function read() {
  try {
    const raw = wx.getStorageSync(STORAGE_KEY)
    const value = Number(raw)
    if (raw !== '' && raw !== null && raw !== undefined &&
      isFinite(value) && value >= MIN && value <= MAX) {
      return { value: round(value, 1), calibrated: true }
    }
  } catch (err) {
    console.warn('[ruler] 读取校准值失败', err)
  }
  return { value: DEFAULT_PX_PER_CM, calibrated: false }
}

function save(value) {
  const next = clamp(round(Number(value) || DEFAULT_PX_PER_CM, 1), MIN, MAX)
  try {
    wx.setStorageSync(STORAGE_KEY, next)
  } catch (err) {
    console.warn('[ruler] 保存校准值失败', err)
  }
  return next
}

function clear() {
  try {
    wx.removeStorageSync(STORAGE_KEY)
  } catch (err) {
    console.warn('[ruler] 清除校准值失败', err)
  }
}

module.exports = {
  STORAGE_KEY,
  DEFAULT_PX_PER_CM,
  MIN,
  MAX,
  read,
  save,
  clear
}
