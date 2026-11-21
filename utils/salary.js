// 薪酬计算器：单位换算、计算口径与本机设置（纯数据逻辑，无网络请求）
const STORAGE_KEY = 'salary_calc_v1'
const DEFAULT_YEARLY = 200000
const MAX_AMOUNT = 1e12

// 口径决定「一年里计薪的小时数」；实时累计按同一口径的每秒金额连续增长
const MODES = [
  { key: 'continuous', name: '全年无休', hint: '365 天 × 24 小时', days: 365, hours: 24 },
  { key: 'worktime', name: '标准工时', hint: '250 天 × 8 小时', days: 250, hours: 8 }
]

function modeByKey(key) {
  return MODES.find(item => item.key === key) || MODES[0]
}

function toAmount(value) {
  const raw = String(value == null ? '' : value).replace(/,/g, '').trim()
  if (!raw) return 0
  const num = Number(raw)
  if (!isFinite(num) || num < 0) return 0
  return Math.min(num, MAX_AMOUNT)
}

// 回填输入框时去掉浮点长尾，避免 200000 / 12 变成一长串小数
function trimNumber(num) {
  if (!num) return ''
  return String(Number(Number(num).toFixed(2)))
}

function rates(yearly, modeKey) {
  const mode = modeByKey(modeKey)
  const seconds = mode.days * mode.hours * 3600
  const perSecond = toAmount(yearly) / seconds
  return {
    mode,
    perSecond,
    perMinute: perSecond * 60,
    perHour: perSecond * 3600,
    perDay: perSecond * mode.hours * 3600
  }
}

function money(num, digits) {
  const value = Number(num) || 0
  const d = typeof digits === 'number' ? digits : (value >= 100 ? 2 : value >= 1 ? 3 : 4)
  const parts = value.toFixed(d).split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return '¥' + parts.join('.')
}

function duration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = n => (n < 10 ? '0' + n : String(n))
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

function readSettings() {
  try {
    const raw = wx.getStorageSync(STORAGE_KEY)
    if (!raw || typeof raw !== 'object') {
      return { yearly: DEFAULT_YEARLY, mode: MODES[0].key }
    }
    return {
      yearly: toAmount(raw.yearly) || DEFAULT_YEARLY,
      mode: modeByKey(raw.mode).key
    }
  } catch (err) {
    return { yearly: DEFAULT_YEARLY, mode: MODES[0].key }
  }
}

function saveSettings(settings) {
  const next = {
    yearly: toAmount(settings && settings.yearly) || DEFAULT_YEARLY,
    mode: modeByKey(settings && settings.mode).key
  }
  try {
    wx.setStorageSync(STORAGE_KEY, next)
  } catch (err) {
    // 本机存储不可用时计算结果仍然有效，只是下次不回填
  }
  return next
}

function previewText() {
  const settings = readSettings()
  const result = rates(settings.yearly, settings.mode)
  return `按 ${money(settings.yearly, 0)}/年 · 每秒 ${money(result.perSecond)}`
}

module.exports = {
  MODES,
  DEFAULT_YEARLY,
  modeByKey,
  toAmount,
  trimNumber,
  rates,
  money,
  duration,
  readSettings,
  saveSettings,
  previewText
}
