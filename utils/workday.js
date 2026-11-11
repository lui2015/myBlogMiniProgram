// 工作日计算纯函数（不依赖小程序 API，便于复用与测试）
// 所有日期统一用 'YYYY-MM-DD' 字符串，内部转 UTC 时间戳，避免时区偏移

const DAY_MS = 24 * 60 * 60 * 1000
const WEEK_NAMES = ['日', '一', '二', '三', '四', '五', '六']

function pad(n) {
  return ('0' + n).slice(-2)
}

function toTime(dateStr) {
  const parts = String(dateStr).split('-').map(Number)
  return Date.UTC(parts[0], parts[1] - 1, parts[2])
}

function toDate(time) {
  const d = new Date(time)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

function isValidDate(dateStr) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(dateStr)) && !isNaN(toTime(dateStr))
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function addDays(dateStr, n) {
  return toDate(toTime(dateStr) + n * DAY_MS)
}

function diffDays(from, to) {
  return Math.round((toTime(to) - toTime(from)) / DAY_MS)
}

function weekday(dateStr) {
  return new Date(toTime(dateStr)).getUTCDay()
}

function weekName(dateStr) {
  return '周' + WEEK_NAMES[weekday(dateStr)]
}

// 把站点 holidays.json 展开成按日期查询的索引
function buildIndex(raw) {
  const holidays = {}
  const makeup = {}
  const groups = []

  if (!raw || typeof raw !== 'object') {
    return { holidays, makeup, groups, years: [] }
  }

  Object.keys(raw).forEach(year => {
    const list = (raw[year] && raw[year].groups) || []
    list.forEach(group => {
      if (!group || !group.start || !group.end) return
      const workdays = group.makeup || []
      groups.push({
        year,
        name: group.name,
        start: group.start,
        end: group.end,
        makeup: workdays
      })

      let cursor = group.start
      let guard = 0
      while (cursor <= group.end && guard < 40) {
        holidays[cursor] = group.name
        cursor = addDays(cursor, 1)
        guard++
      }
      workdays.forEach(day => { makeup[day] = group.name })
    })
  })

  groups.sort((a, b) => (a.start < b.start ? -1 : 1))
  return { holidays, makeup, groups, years: Object.keys(raw).sort() }
}

// 类型：workday / weekend / holiday / makeup
function dayType(dateStr, index) {
  if (index.makeup[dateStr]) return 'makeup'
  if (index.holidays[dateStr]) return 'holiday'
  const w = weekday(dateStr)
  return (w === 0 || w === 6) ? 'weekend' : 'workday'
}

function isWorkday(dateStr, index) {
  const type = dayType(dateStr, index)
  return type === 'workday' || type === 'makeup'
}

// 模式一：统计日期区间（includeEnds=true 为闭区间，false 不含结束日）
function countRange(start, end, includeEnds, index) {
  let a = start
  let b = end
  if (toTime(a) > toTime(b)) {
    const tmp = a
    a = b
    b = tmp
  }
  const last = includeEnds ? b : addDays(b, -1)

  const stats = { total: 0, workday: 0, weekend: 0, holiday: 0, makeup: 0 }
  const days = []
  let cursor = a
  let guard = 0

  while (cursor <= last && guard < 3660) {
    const type = dayType(cursor, index)
    stats.total++
    stats[type]++
    days.push({ date: cursor, type })
    cursor = addDays(cursor, 1)
    guard++
  }

  stats.workdays = stats.workday + stats.makeup
  return { start: a, end: last, rawEnd: b, stats, days }
}

// 模式二：从起始日推算 N 个工作日后的日期（N 支持负数）
function addWorkdays(start, n, includeStart, index) {
  const amount = Number(n) || 0
  if (!amount) return start

  const step = amount > 0 ? 1 : -1
  let remaining = Math.abs(amount)
  let cursor = start

  if (includeStart && isWorkday(cursor, index)) {
    remaining--
    if (remaining === 0) return cursor
  }

  let guard = 0
  while (remaining > 0 && guard < 20000) {
    cursor = addDays(cursor, step)
    if (isWorkday(cursor, index)) remaining--
    guard++
  }
  return cursor
}

// 倒计时用：from 次日到 to 之间的工作日数（to 在过去则为负）
function workdaysBetween(from, to, index) {
  const forward = toTime(to) >= toTime(from)
  const a = forward ? addDays(from, 1) : to
  const b = forward ? to : addDays(from, -1)
  let count = 0
  let cursor = a
  let guard = 0

  while (cursor <= b && guard < 3660) {
    if (isWorkday(cursor, index)) count++
    cursor = addDays(cursor, 1)
    guard++
  }
  return forward ? count : -count
}

// 快捷区间
function presetRange(preset, base) {
  const baseDate = base || todayStr()
  const parts = baseDate.split('-').map(Number)
  const y = parts[0]
  const m = parts[1]

  switch (preset) {
    case 'today':
      return [baseDate, baseDate]
    case 'week': {
      const offset = (weekday(baseDate) + 6) % 7
      return [addDays(baseDate, -offset), addDays(baseDate, 6 - offset)]
    }
    case 'month':
      return [`${y}-${pad(m)}-01`, toDate(Date.UTC(y, m, 0))]
    case 'quarter': {
      const startMonth = Math.floor((m - 1) / 3) * 3 + 1
      const endMonth = startMonth + 2
      return [`${y}-${pad(startMonth)}-01`, toDate(Date.UTC(y, endMonth, 0))]
    }
    case 'year':
      return [`${y}-01-01`, `${y}-12-31`]
    default:
      return [baseDate, baseDate]
  }
}

// 生成月历格子（周一开头），可标注区间与起止日
function monthCalendar(yearMonth, index, rangeStart, rangeEnd) {
  const parts = String(yearMonth).split('-').map(Number)
  const y = parts[0]
  const m = parts[1]
  const first = `${y}-${pad(m)}-01`
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const offset = (weekday(first) + 6) % 7
  const cells = []

  for (let i = 0; i < offset; i++) {
    cells.push({ key: 'empty-' + i, empty: true })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${y}-${pad(m)}-${pad(d)}`
    cells.push({
      key: date,
      date,
      day: d,
      type: dayType(date, index),
      inRange: !!rangeStart && !!rangeEnd && date >= rangeStart && date <= rangeEnd,
      isEdge: date === rangeStart || date === rangeEnd,
      isToday: date === todayStr()
    })
  }
  return cells
}

module.exports = {
  WEEK_NAMES,
  pad,
  toTime,
  toDate,
  isValidDate,
  todayStr,
  addDays,
  diffDays,
  weekday,
  weekName,
  buildIndex,
  dayType,
  isWorkday,
  countRange,
  addWorkdays,
  workdaysBetween,
  presetRange,
  monthCalendar
}
