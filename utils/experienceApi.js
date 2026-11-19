// 经验沉淀：站点公开只读接口封装
// 文档 https://www.luliming.xyz/experience/docs
// 只调用 /experience/api/v1/open/... 的公开 GET；不登录、不写站点、不含任何凭据
const api = require('./api')

const BASE = '/experience/api/v1/open'
// v2：正文接口升级为「完整 HTML 文档」，旧缓存里的语义片段需整体失效
const CACHE_PREFIX = 'experience_cache_v2_'
const CACHE_TTL = 24 * 60 * 60 * 1000
const PAGE_SIZE = 100
const MAX_HTML_CACHE = 6
const SAFE_ID = /^[a-zA-Z0-9_-]{1,64}$/

function buildQuery(params) {
  return Object.keys(params || {})
    .filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(String(params[k]))}`)
    .join('&')
}

function safeId(id) {
  const value = String(id || '')
  if (!SAFE_ID.test(value)) throw new Error('经验编号不合法')
  return value
}

function getJson(path, params) {
  const query = buildQuery(params)
  return api.request(`${BASE}${path}${query ? `?${query}` : ''}`)
}

// 正文是 text/html 片段，显式关闭 JSON 解析
function getHtmlText(id) {
  return api.request(`${BASE}/experiences/${safeId(id)}/html`, { dataType: 'text' })
    .then(body => {
      if (typeof body !== 'string' || !body.trim()) throw new Error('正文内容为空')
      return body
    })
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

// 缓存优先；过期联网刷新，联网失败退回旧缓存（断网可读）
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

function stripTags(text) {
  return String(text || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function dateText(value) {
  const text = String(value || '')
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : ''
}

function sizeText(value) {
  const size = Number(value) || 0
  return size > 0 ? `${Math.max(1, Math.round(size / 1024))} KB` : ''
}

function normalize(item, categories) {
  const source = item && typeof item === 'object' ? item : {}
  const cat = (categories || []).filter(c => c.id === source.category_id)[0]
  return {
    id: String(source.id || ''),
    title: String(source.title || '未命名经验').trim(),
    summary: String(source.summary || '').trim(),
    categoryId: String(source.category_id || ''),
    categoryName: cat ? String(cat.name || '') : '未分类',
    date: dateText(source.updated_at || source.created_at),
    sizeText: sizeText(source.html_size),
    snippet: ''
  }
}

// 列表每页最多 100 条，按 total 翻页补齐
function fetchAll() {
  return getJson('/experiences', { page: 1, page_size: PAGE_SIZE }).then(first => {
    const items = Array.isArray(first.items) ? first.items.slice() : []
    const total = Number(first.total) || items.length
    const pages = Math.min(10, Math.ceil(total / PAGE_SIZE))
    if (pages <= 1 || !first.has_more) return { items, total }
    const tasks = []
    for (let page = 2; page <= pages; page++) {
      tasks.push(getJson('/experiences', { page, page_size: PAGE_SIZE }))
    }
    return Promise.all(tasks).then(list => {
      list.forEach(res => {
        (Array.isArray(res.items) ? res.items : []).forEach(item => items.push(item))
      })
      return { items, total }
    })
  })
}

function getMeta(force) {
  return load('meta', () => getJson('/meta').then(res => ({
    categories: (Array.isArray(res.categories) ? res.categories : []).map(c => ({
      id: String((c && c.id) || ''),
      name: String((c && c.name) || '').trim(),
      slug: String((c && c.slug) || '')
    })).filter(c => c.id && c.name)
  })), force)
}

function getExperiences(force) {
  return load('list', fetchAll, force)
}

function getExperienceMeta(id) {
  return getJson(`/experiences/${safeId(id)}`).then(res => res || null)
}

function getHtml(id, force) {
  return load('html_' + safeId(id), () => getHtmlText(id), force).then(result => {
    trimHtmlCache()
    return result
  })
}

// 正文较大，只保留最近几篇，避免占满本机存储
function trimHtmlCache() {
  try {
    const info = wx.getStorageInfoSync()
    const keys = (info.keys || []).filter(k => k.indexOf(CACHE_PREFIX + 'html_') === 0)
    if (keys.length <= MAX_HTML_CACHE) return
    const sorted = keys.map(key => ({
      key,
      t: (readCache(key.slice(CACHE_PREFIX.length)) || {}).t || 0
    })).sort((a, b) => a.t - b.t)
    sorted.slice(0, keys.length - MAX_HTML_CACHE).forEach(item => {
      wx.removeStorageSync(item.key)
    })
  } catch (err) {}
}

function search(keyword) {
  const q = String(keyword || '').trim().slice(0, 100)
  if (!q) return Promise.resolve({ items: [], query: '' })
  return getJson('/search', { q, mode: 'content', limit: 100 }).then(res => ({
    query: q,
    items: (Array.isArray(res.items) ? res.items : []).map(item => ({
      id: String((item && item.experience_id) || ''),
      snippet: stripTags(item && item.snippet)
    })).filter(item => item.id)
  }))
}

// 工具页预览 / 首屏兜底：忽略 TTL 直接读本机缓存
function getOfflineExperiences() {
  const cached = readCache('list')
  const meta = readCache('meta')
  const categories = (meta && meta.data && meta.data.categories) || []
  const items = (cached && cached.data && cached.data.items) || []
  return {
    total: (cached && cached.data && cached.data.total) || items.length,
    categories,
    items: items.map(item => normalize(item, categories)),
    stale: !!cached
  }
}

module.exports = {
  normalize,
  getMeta,
  getExperiences,
  getExperienceMeta,
  getHtml,
  getOfflineExperiences,
  search
}
