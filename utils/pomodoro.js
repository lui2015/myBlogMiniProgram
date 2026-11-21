// 番茄时钟：阶段时长、本机设置与专注统计（纯逻辑，不联网、不上传）
const SETTINGS_KEY = 'pomodoro_settings_v1'
const STATS_KEY = 'pomodoro_stats_v1'

const PHASES = [
  { key: 'focus', name: '专注', short: 'FOCUS', hint: '关掉通知，只做一件事' },
  { key: 'short', name: '短休息', short: 'SHORT BREAK', hint: '起身、喝水、看看远处' },
  { key: 'long', name: '长休息', short: 'LONG BREAK', hint: '离开屏幕，彻底放松一下' }
]

const DEFAULT = { focus: 25, short: 5, long: 15, longEvery: 4 }
const RANGES = {
  focus: [1, 90],
  short: [1, 30],
  long: [1, 60],
  longEvery: [2, 8]
}

function clamp(value, min, max) {
  const num = Number(value)
  if (!isFinite(num)) return min
  return Math.max(min, Math.min(max, Math.floor(num)))
}

function readSettings() {
  try {
    const raw = wx.getStorageSync(SETTINGS_KEY)
    if (!raw || typeof raw !== 'object') return Object.assign({}, DEFAULT)
    return {
      focus: clamp(raw.focus, RANGES.focus[0], RANGES.focus[1]),
      short: clamp(raw.short, RANGES.short[0], RANGES.short[1]),
      long: clamp(raw.long, RANGES.long[0], RANGES.long[1]),
      longEvery: clamp(raw.longEvery, RANGES.longEvery[0], RANGES.longEvery[1])
    }
  } catch (err) {
    return Object.assign({}, DEFAULT)
  }
}

function saveSettings(settings) {
  const input = settings || {}
  const next = {
    focus: clamp(input.focus == null ? DEFAULT.focus : input.focus, RANGES.focus[0], RANGES.focus[1]),
    short: clamp(input.short == null ? DEFAULT.short : input.short, RANGES.short[0], RANGES.short[1]),
    long: clamp(input.long == null ? DEFAULT.long : input.long, RANGES.long[0], RANGES.long[1]),
    longEvery: clamp(input.longEvery == null ? DEFAULT.longEvery : input.longEvery, RANGES.longEvery[0], RANGES.longEvery[1])
  }
  try {
    wx.setStorageSync(SETTINGS_KEY, next)
  } catch (err) {
    // 本机存储不可用时计时仍然有效，只是下次不回填
  }
  return next
}

function pad(num) {
  return num < 10 ? `0${num}` : String(num)
}

function todayStr(date) {
  const d = date ? new Date(date) : new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// 自然日相差天数；非法日期返回 999
function dayDiff(from, to) {
  const a = Date.parse(`${from}T00:00:00`)
  const b = Date.parse(`${to}T00:00:00`)
  if (!isFinite(a) || !isFinite(b)) return 999
  return Math.round((a - b) / 86400000)
}

function emptyStats() {
  return {
    today: '', todayCount: 0, todayMinutes: 0,
    totalCount: 0, streakDays: 0, lastDay: ''
  }
}

function readStats() {
  let raw
  try {
    raw = wx.getStorageSync(STATS_KEY)
  } catch (err) {
    return emptyStats()
  }
  if (!raw || typeof raw !== 'object') return emptyStats()
  const today = todayStr()
  const diff = dayDiff(today, String(raw.lastDay || ''))
  const sameDay = String(raw.today || '') === today
  // 连续天数只在「今天或昨天完成过」时保留，断档自动归零
  const streakDays = diff <= 1 ? (Number(raw.streakDays) || 0) : 0
  return {
    today: sameDay ? today : String(raw.today || ''),
    todayCount: sameDay ? (Number(raw.todayCount) || 0) : 0,
    todayMinutes: sameDay ? (Number(raw.todayMinutes) || 0) : 0,
    totalCount: Number(raw.totalCount) || 0,
    streakDays,
    lastDay: String(raw.lastDay || '')
  }
}

// 完成一个专注段时记一次：今日数量 / 分钟、累计数量与连续天数
function recordFocus(minutes) {
  const stats = readStats()
  const today = todayStr()
  const sameDay = stats.today === today && stats.todayCount > 0
  const diff = dayDiff(today, stats.lastDay)
  const streakDays = sameDay
    ? stats.streakDays
    : (diff === 1 ? Math.max(1, stats.streakDays + 1) : 1)
  const next = {
    today,
    todayCount: (sameDay ? stats.todayCount : 0) + 1,
    todayMinutes: (sameDay ? stats.todayMinutes : 0) + Math.max(0, Math.floor(Number(minutes) || 0)),
    totalCount: stats.totalCount + 1,
    streakDays,
    lastDay: today
  }
  try {
    wx.setStorageSync(STATS_KEY, next)
  } catch (err) {
    // 本机存储不可用时统计仍然有效，只是不持久化
  }
  return next
}

// 完成第 N 个专注段后，按「每 N 个番茄长休」决定下一阶段
function nextPhaseKey(completed, settings) {
  const every = clamp(settings && settings.longEvery, RANGES.longEvery[0], RANGES.longEvery[1])
  const count = Math.max(1, Math.floor(Number(completed) || 1))
  return count % every === 0 ? 'long' : 'short'
}

function format(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0))
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`
}

function previewText() {
  const stats = readStats()
  const settings = readSettings()
  if (stats.today === todayStr() && stats.todayCount) {
    return `今日 ${stats.todayCount} 个番茄 · 专注 ${stats.todayMinutes} 分钟`
  }
  return `${settings.focus} 分钟专注 · ${settings.short} 分钟休息`
}

module.exports = {
  PHASES,
  DEFAULT,
  RANGES,
  readSettings,
  saveSettings,
  readStats,
  recordFocus,
  todayStr,
  dayDiff,
  nextPhaseKey,
  format,
  previewText
}
