// 投资名言：站点公开只读接口（无需 API Key）+ 分片本机缓存
// 参考页 /investmentQuotes/；需求里附的 /XiaoBaiFinance/api/open/docs?doc=data 是小白财经开放平台文档，
// 其 /api/open/v1/* 数据接口需要 API Key（服务端到服务端），小程序不内置密钥，
// 因此与 utils/xiaobaiApi.js 默认数据源一样，改走站内公开只读接口。
const api = require('./api')

const ENDPOINT = '/investmentQuotes/api/quotes'
const CACHE_PREFIX = 'invest_quotes_v1_'
const META_KEY = CACHE_PREFIX + 'meta'
const FAV_KEY = CACHE_PREFIX + 'favorites'
const CHUNK_SIZE = 400
const CACHE_TTL = 24 * 60 * 60 * 1000
const PAGE_SIZE = 20
const MAX_FAVORITES = 500

function text(value) {
  return String(value == null ? '' : value).trim()
}

function chunkKey(index) {
  return `${CACHE_PREFIX}chunk_${index}`
}

function todayStr(date) {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) return date.trim()
  const d = date instanceof Date ? date : new Date()
  const pad = n => (n < 10 ? '0' + n : String(n))
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function hash(value) {
  let h = 0
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0
  return Math.abs(h)
}

// 只保留渲染需要的文本字段，去掉头像 / 时间戳 / 计数字段，控制缓存体积
function normalize(raw) {
  if (!raw || typeof raw !== 'object') return null
  const id = text(raw.id).slice(0, 80)
  const cn = text(raw.content_cn).slice(0, 1000)
  const master = text(raw.master_name_cn).slice(0, 60)
  if (!id || !cn || !master) return null
  return {
    id,
    cn,
    en: text(raw.content_en).slice(0, 1500),
    master,
    masterId: text(raw.master_id).slice(0, 80),
    source: text(raw.source).slice(0, 300),
    year: Number(raw.source_year) || 0,
    featured: raw.is_featured === 1 || raw.is_featured === true ? 1 : 0,
    tags: (Array.isArray(raw.tags) ? raw.tags : [])
      .map(tag => text(tag && tag.name).slice(0, 30))
      .filter(Boolean)
      .slice(0, 8)
  }
}

function readCache() {
  try {
    const meta = wx.getStorageSync(META_KEY)
    if (!meta || !meta.count || !meta.chunks) return null
    const items = []
    for (let i = 0; i < meta.chunks; i++) {
      const chunk = wx.getStorageSync(chunkKey(i))
      if (!Array.isArray(chunk)) return null
      items.push(...chunk)
    }
    if (items.length !== meta.count) return null
    return { items, t: Number(meta.t) || 0, chunks: meta.chunks }
  } catch (err) {
    return null
  }
}

// 微信 storage 单 key 上限 1MB，全量精简后约 1.2MB，按 400 条一片分开存
function writeCache(items) {
  const chunks = Math.ceil(items.length / CHUNK_SIZE)
  const prev = wx.getStorageSync(META_KEY)
  for (let i = 0; i < chunks; i++) {
    wx.setStorageSync(chunkKey(i), items.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE))
  }
  wx.setStorageSync(META_KEY, { t: Date.now(), count: items.length, chunks })
  if (prev && Number(prev.chunks) > chunks) {
    for (let i = chunks; i < Number(prev.chunks); i++) wx.removeStorageSync(chunkKey(i))
  }
}

function fetchRemote() {
  return new Promise((resolve, reject) => {
    wx.request({
      url: api.BASE_URL + ENDPOINT,
      method: 'GET',
      timeout: 60000,
      dataType: 'json',
      success(res) {
        const body = res.data
        const raw = Array.isArray(body) ? body
          : (body && (body.data || body.quotes || body.items))
        if (res.statusCode < 200 || res.statusCode >= 300 || !Array.isArray(raw)) {
          return reject(new Error(`名言接口请求失败 (${res.statusCode})`))
        }
        const items = raw.map(normalize).filter(Boolean)
        if (!items.length) return reject(new Error('名言数据为空'))
        resolve(items)
      },
      fail(err) {
        reject(new Error((err && err.errMsg) || '网络连接异常'))
      }
    })
  })
}

// 缓存未过期直接用；联网失败退回旧缓存并标记离线
function getAll(force) {
  const cached = readCache()
  if (!force && cached && Date.now() - cached.t < CACHE_TTL) {
    return Promise.resolve({ items: cached.items, offline: false })
  }
  return fetchRemote()
    .then(items => {
      try { writeCache(items) } catch (err) { console.warn('[investQuotes] 缓存写入失败', err) }
      return { items, offline: false }
    })
    .catch(err => {
      if (cached && cached.items.length) return { items: cached.items, offline: true }
      throw err
    })
}

function getOffline() {
  const cached = readCache()
  return cached ? cached.items : []
}

function filter(items, options) {
  const o = options || {}
  const keyword = text(o.keyword).toLowerCase()
  const master = text(o.master)
  const tag = text(o.tag)
  const favSet = {}
  ;(Array.isArray(o.favIds) ? o.favIds : []).forEach(id => { favSet[id] = true })
  return (items || []).filter(item => {
    if (master && item.master !== master) return false
    if (tag && item.tags.indexOf(tag) < 0) return false
    if (o.onlyFav && !favSet[item.id]) return false
    if (keyword) {
      const hay = `${item.cn} ${item.en} ${item.master} ${item.source} ${item.tags.join(' ')}`.toLowerCase()
      if (hay.indexOf(keyword) < 0) return false
    }
    return true
  })
}

function rankBy(items, field, limit) {
  const counts = {}
  items.forEach(item => {
    const values = field === 'tags' ? item.tags : [item.master]
    values.forEach(value => { if (value) counts[value] = (counts[value] || 0) + 1 })
  })
  return Object.keys(counts)
    .map(name => ({ name, count: counts[name] }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh'))
    .slice(0, limit || 12)
}

function masters(items, limit) {
  return rankBy(items || [], 'master', limit)
}

function tags(items, limit) {
  return rankBy(items || [], 'tags', limit)
}

// 按日期稳定选取一条精选名言，同一天进入页面不会变
function daily(items, date) {
  if (!items || !items.length) return null
  const featured = items.filter(item => item.featured === 1)
  const pool = featured.length ? featured : items
  return pool[hash(todayStr(date)) % pool.length]
}

function randomPick(items, excludeId) {
  if (!items || !items.length) return null
  const pool = excludeId ? items.filter(item => item.id !== excludeId) : items
  const list = pool.length ? pool : items
  return list[Math.floor(Math.random() * list.length)]
}

function readFavorites() {
  try {
    const list = wx.getStorageSync(FAV_KEY)
    return Array.isArray(list) ? list.filter(id => typeof id === 'string').slice(0, MAX_FAVORITES) : []
  } catch (err) {
    return []
  }
}

function toggleFavorite(id) {
  const list = readFavorites()
  const index = list.indexOf(id)
  if (index >= 0) list.splice(index, 1)
  else list.unshift(id)
  const next = list.slice(0, MAX_FAVORITES)
  try { wx.setStorageSync(FAV_KEY, next) } catch (err) {}
  return next
}

// 工具页预览只读本机缓存，不在工具列表页触发全量请求
function previewText() {
  const items = getOffline()
  if (!items.length) return '投资名言 · 联网后可浏览大师箴言'
  const quote = daily(items, todayStr())
  const short = quote && quote.cn.length > 14 ? `${quote.cn.slice(0, 14)}…` : (quote ? quote.cn : '')
  return short ? `共 ${items.length} 条 · 今日「${short}」` : `共 ${items.length} 条投资名言`
}

module.exports = {
  ENDPOINT,
  PAGE_SIZE,
  CACHE_TTL,
  getAll,
  getOffline,
  normalize,
  filter,
  masters,
  tags,
  daily,
  randomPick,
  todayStr,
  readFavorites,
  toggleFavorite,
  previewText
}
