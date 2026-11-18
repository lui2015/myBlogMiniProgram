// 「每日英语」站内公开只读接口封装
// 实测接口：GET https://www.luliming.xyz/EglishStudy/api/daily?date=YYYY-MM-DD（无需密钥）
// 返回裸 JSON（非 { code, data } 包装）：{ date, quote, essay, quoteError, essayError }
const { resolveUrl } = require('./util')

const ORIGIN = 'https://www.luliming.xyz'
const DAILY_PATH = '/EglishStudy/api/daily'
const CACHE_PREFIX = 'english_daily_v1_'
const CACHE_TTL = 6 * 60 * 60 * 1000
const CHECKIN_KEY = 'english_checkins_v1'
const MAX_CHECKINS = 400
// 接口返回的图片 / 配音来自金山词霸静态资源，只放行这一个 HTTPS 域名
const MEDIA_HOST = 'staticedu-wps-cache.iciba.com'
const WEEK_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function pad(n) {
  return n < 10 ? '0' + n : String(n)
}

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function todayStr() {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false
  const parts = value.split('-')
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
  return date.getFullYear() === Number(parts[0]) &&
    date.getMonth() === Number(parts[1]) - 1 &&
    date.getDate() === Number(parts[2])
}

function shiftDate(value, delta) {
  const date = isValidDate(value) ? value : todayStr()
  const parts = date.split('-')
  const next = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
  next.setDate(next.getDate() + Number(delta || 0))
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`
}

function dateParts(value) {
  const date = isValidDate(value) ? value : todayStr()
  const parts = date.split('-')
  const week = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getDay()
  return {
    dateText: `${Number(parts[1])} 月 ${Number(parts[2])} 日`,
    weekText: WEEK_NAMES[week],
    isToday: date === todayStr()
  }
}

// 只接受白名单域名的 HTTPS 资源，避免把接口返回的任意链接交给 <image> / 音频播放器
function safeMediaUrl(value) {
  const url = cleanText(value)
  if (!/^https:\/\//i.test(url)) return ''
  const match = /^https:\/\/([^/:?#]+)(?::\d+)?(\/[^?#]*)?(\?[^#]*)?$/i.exec(url)
  if (!match || match[1].toLowerCase() !== MEDIA_HOST) return ''
  return url
}

// 站内插画（接口给出相对路径），只放行本站点 HTTPS 地址
function safeSiteImage(value) {
  const url = resolveUrl(cleanText(value))
  return /^https:\/\/www\.luliming\.xyz\//i.test(url) ? url : ''
}

function normalizeDaily(raw, date) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('接口返回异常')
  const q = raw.quote || {}
  const e = raw.essay || {}
  const imageUrl = safeMediaUrl(q.imageUrl)
  const artUrl = safeSiteImage(q.localImageUrl)

  const chunks = (Array.isArray(e.chunks) ? e.chunks : []).map((item, index) => ({
    key: `c${index}`,
    english: cleanText(item && item.english),
    chinese: cleanText(item && item.chinese)
  })).filter(item => item.english || item.chinese)
  if (!chunks.length) {
    const english = cleanText(e.english)
    const chinese = cleanText(e.chinese)
    if (english || chinese) chunks.push({ key: 'c0', english, chinese })
  }

  const keywords = (Array.isArray(e.keywords) ? e.keywords : []).map((item, index) => ({
    key: `k${index}`,
    word: cleanText(item && item.word),
    meaning: cleanText(item && item.meaning)
  })).filter(item => item.word)

  const parts = dateParts(date)
  return {
    date: cleanText(raw.date) || date,
    dateText: parts.dateText,
    weekText: parts.weekText,
    isToday: parts.isToday,
    quote: {
      english: cleanText(q.english),
      chinese: cleanText(q.chinese),
      author: cleanText(q.author),
      sourceName: cleanText(q.sourceName) || '网络',
      audioUrl: safeMediaUrl(q.audioUrl),
      image: imageUrl || artUrl,
      artUrl,
      imageUrl
    },
    essay: {
      id: cleanText(e.id),
      title: cleanText(e.title) || '今日美文',
      wordCount: Number(e.wordCount) || 0,
      chunks,
      keywords,
      source: cleanText(e.source),
      addedOn: cleanText(e.addedOn)
    },
    quoteAvailable: !!cleanText(q.english),
    essayAvailable: chunks.length > 0,
    quoteError: cleanText(raw.quoteError),
    essayError: cleanText(raw.essayError)
  }
}

function fetchDaily(date) {
  const url = ORIGIN + DAILY_PATH + (date ? `?date=${encodeURIComponent(date)}` : '')
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: 'GET',
      timeout: 15000,
      header: { 'Content-Type': 'application/json' },
      success(res) {
        const body = res.data
        if (res.statusCode >= 200 && res.statusCode < 300 && body && typeof body === 'object' && !body.error) {
          resolve(body)
        } else {
          reject(new Error(cleanText(body && (body.error || body.message)) || `请求失败 (${res.statusCode})`))
        }
      },
      fail(err) {
        reject(new Error((err && err.errMsg) || '网络连接异常'))
      }
    })
  })
}

function cacheKey(date) {
  return CACHE_PREFIX + String(date).replace(/[^0-9]/g, '')
}

function readCache(date) {
  try {
    const raw = wx.getStorageSync(cacheKey(date))
    return raw && raw.data ? raw : null
  } catch (err) {
    return null
  }
}

function writeCache(date, data) {
  try {
    wx.setStorageSync(cacheKey(date), { t: Date.now(), data })
  } catch (err) {}
}

// 缓存优先；过期或无缓存时联网，联网失败退回旧缓存（断网可读）
function getDaily(date, force) {
  const target = isValidDate(date) ? date : todayStr()
  const cached = readCache(target)
  if (!force && cached && Date.now() - cached.t < CACHE_TTL) {
    return Promise.resolve({ data: cached.data, stale: false })
  }
  return fetchDaily(target).then(raw => {
    const view = normalizeDaily(raw, target)
    writeCache(target, view)
    return { data: view, stale: false }
  }).catch(err => {
    if (cached) return { data: cached.data, stale: true }
    throw err
  })
}

function getOfflineDaily(date) {
  const raw = readCache(isValidDate(date) ? date : todayStr())
  return raw ? raw.data : null
}

function getCheckins() {
  try {
    const list = wx.getStorageSync(CHECKIN_KEY)
    return Array.isArray(list) ? list : []
  } catch (err) {
    return []
  }
}

function saveCheckins(list) {
  try {
    wx.setStorageSync(CHECKIN_KEY, list.slice(0, MAX_CHECKINS))
  } catch (err) {}
}

function isCheckedIn(date) {
  return getCheckins().indexOf(isValidDate(date) ? date : todayStr()) >= 0
}

function markCheckIn(date) {
  const target = isValidDate(date) ? date : todayStr()
  const list = getCheckins()
  if (list.indexOf(target) < 0) {
    list.unshift(target)
    saveCheckins(list)
  }
  return checkinStats()
}

function checkinStats() {
  const list = getCheckins()
  const today = todayStr()
  const month = today.slice(0, 7)
  let cursor = list.indexOf(today) >= 0 ? today : shiftDate(today, -1)
  let streak = 0
  while (list.indexOf(cursor) >= 0 && streak < MAX_CHECKINS) {
    streak++
    cursor = shiftDate(cursor, -1)
  }
  return {
    streak,
    monthCount: list.filter(item => String(item).slice(0, 7) === month).length,
    checkedToday: list.indexOf(today) >= 0
  }
}

module.exports = {
  todayStr,
  shiftDate,
  isValidDate,
  getDaily,
  getOfflineDaily,
  getCheckins,
  isCheckedIn,
  markCheckIn,
  checkinStats
}
