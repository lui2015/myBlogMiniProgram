// 思维模型库公开只读接口封装
// 文档：https://www.luliming.xyz/thinkingModel/platform/docs
// 数据全部来自站点 /thinkingModel/api/v1/，只在本机缓存，不写回站点
const api = require('./api')

const BASE = '/thinkingModel/api/v1'
const CACHE_PREFIX = 'thinking_cache_v1_'
const CACHE_TTL = 24 * 60 * 60 * 1000
const FAV_KEY = 'thinking_favorites_v1'
const PAGE_SIZE = 100

// 分类 id 速查表（接口文档），仅在 /categories 不可用或离线时用于显示名称
const CATEGORIES = [
  { id: 'decision', name: '决策思维', icon: '🎯' },
  { id: 'cognition', name: '认知升级', icon: '🧠' },
  { id: 'system', name: '系统思维', icon: '🔄' },
  { id: 'communication', name: '沟通表达', icon: '💬' },
  { id: 'business', name: '商业分析', icon: '📊' },
  { id: 'learning', name: '学习成长', icon: '📚' },
  { id: 'probability', name: '概率思维', icon: '🎲' },
  { id: 'efficiency', name: '效率管理', icon: '⚡' },
  { id: 'innovation', name: '创新思维', icon: '💡' },
  { id: 'game', name: '博弈思维', icon: '♟️' }
]

function pad(n) {
  return n < 10 ? '0' + n : String(n)
}

function todayStr(date) {
  const d = date instanceof Date ? date : new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function buildQuery(params) {
  return Object.keys(params || {})
    .filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(String(params[k]))}`)
    .join('&')
}

function unwrap(res) {
  if (!res || res.success === false) {
    const err = (res && res.error) || {}
    throw new Error(err.message || '接口返回异常')
  }
  return res
}

function get(path, params) {
  const query = buildQuery(params)
  return api.request(`${BASE}${path}${query ? `?${query}` : ''}`).then(unwrap)
}

function readCache(key) {
  try {
    const raw = wx.getStorageSync(CACHE_PREFIX + key)
    return raw && raw.data !== undefined && raw.data !== null ? raw : null
  } catch (err) {
    return null
  }
}

function writeCache(key, data) {
  try {
    wx.setStorageSync(CACHE_PREFIX + key, { t: Date.now(), data })
  } catch (err) {}
}

// 缓存优先：未过期直接用缓存；过期或无缓存时联网，联网失败退回旧缓存（断网可读）
function load(key, fetcher, force) {
  const cached = readCache(key)
  if (!force && cached && Date.now() - cached.t < CACHE_TTL) {
    return Promise.resolve({ data: cached.data, stale: false })
  }
  return fetcher().then(data => {
    writeCache(key, data)
    return { data, stale: false }
  }).catch(err => {
    if (cached) return { data: cached.data, stale: true }
    throw err
  })
}

// 列表接口 limit 上限 100，按 totalPages 并发拉取剩余页，合并为全量精简列表
function fetchAllModels() {
  return get('/models', { page: 1, limit: PAGE_SIZE }).then(first => {
    const list = Array.isArray(first.data) ? first.data.slice() : []
    const meta = first.meta || {}
    const pages = Math.min(10, Math.max(1, Number(meta.totalPages) || 1))
    const rest = []
    for (let p = 2; p <= pages; p++) {
      rest.push(get('/models', { page: p, limit: PAGE_SIZE }))
    }
    if (!rest.length) return list
    return Promise.all(rest).then(results => {
      results.forEach(res => {
        if (res && Array.isArray(res.data)) list.push.apply(list, res.data)
      })
      return list
    })
  })
}

function getAllModels(force) {
  return load('all_models', fetchAllModels, force).then(res => res.data)
}

// 忽略过期时间读缓存，用于首次渲染与工具列表页预览
function getOfflineModels() {
  const raw = readCache('all_models')
  return raw && Array.isArray(raw.data) ? raw.data : []
}

function getCategories(force) {
  return load('categories', () => get('/categories').then(res => (Array.isArray(res.data) ? res.data : [])), force)
    .then(res => res.data)
}

function getStats(force) {
  return load('stats', () => get('/stats').then(res => res.data || {}), force)
    .then(res => res.data)
}

// 服务端 q 会同时匹配名称 / slug / 副标题 / 洞察 / 介绍 / 标签，比本地缓存字段更全
function searchModels(keyword) {
  return get('/models', { q: keyword, limit: PAGE_SIZE })
    .then(res => (Array.isArray(res.data) ? res.data : []))
}

function getModel(slug, force) {
  if (!/^[a-z0-9-]+$/.test(slug || '')) return Promise.reject(new Error('模型标识不合法'))
  return load('model_' + slug, () => get(`/models/${slug}`).then(res => res.data || null), force)
    .then(res => res.data)
}

function getTitleMap() {
  const map = {}
  getOfflineModels().forEach(m => {
    if (m && m.slug) map[m.slug] = m.title || m.slug
  })
  return map
}

// 优先用缓存里的分类接口名称，离线时退回速查表
function getCategoryName(id) {
  const raw = readCache('categories')
  const fromApi = raw && Array.isArray(raw.data)
    ? raw.data.filter(item => item.id === id)[0]
    : null
  if (fromApi && fromApi.name) return fromApi.name
  const hit = CATEGORIES.filter(item => item.id === id)[0]
  return hit ? hit.name : '思维模型'
}

function getFavorites() {
  try {
    const list = wx.getStorageSync(FAV_KEY)
    return Array.isArray(list) ? list : []
  } catch (err) {
    return []
  }
}

function isFavorite(slug) {
  return getFavorites().indexOf(slug) >= 0
}

// 返回切换后是否已收藏
function toggleFavorite(slug) {
  const list = getFavorites()
  const index = list.indexOf(slug)
  if (index >= 0) list.splice(index, 1)
  else list.unshift(slug)
  try {
    wx.setStorageSync(FAV_KEY, list)
  } catch (err) {}
  return index < 0
}

// 按日期稳定选取「每日一模型」，同一天进入工具看到的是同一个
function dailyModel(models, date) {
  if (!Array.isArray(models) || !models.length) return null
  const seed = todayStr(date).split('').reduce((sum, ch) => (sum * 31 + ch.charCodeAt(0)) >>> 0, 7)
  return models[seed % models.length]
}

module.exports = {
  CATEGORIES,
  todayStr,
  getAllModels,
  getOfflineModels,
  getCategories,
  getStats,
  searchModels,
  getModel,
  getTitleMap,
  getCategoryName,
  getFavorites,
  isFavorite,
  toggleFavorite,
  dailyModel
}
