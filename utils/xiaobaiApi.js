// 小白财经接口封装（只读 GET）
// 接口文档：https://www.luliming.xyz/XiaoBaiFinance/api/open/docs?doc=data
// 默认走站内公开只读接口（无需密钥）；utils/config.js 切到 'open' 时走文档 v1 接口
const config = require('./config')
const content = require('./xiaobaiContent')
const htmlUtil = require('./xiaobaiHtml')

const ORIGIN = 'https://www.luliming.xyz'
const PUBLIC_BASE = '/XiaoBaiFinance/api'
const OPEN_BASE = '/XiaoBaiFinance/api/open/v1'
const CACHE_PREFIX = 'xiaobai_cache_v1_'
const CACHE_TTL = 24 * 60 * 60 * 1000
const FAV_KEY = 'xiaobai_favorites_v1'
const PAGE_SIZE = 50
const MAX_CACHED_ARTICLES = 20

function pad(n) {
  return n < 10 ? '0' + n : String(n)
}

function useOpen() {
  return config.xiaoBaiSource === 'open'
}

function sourceLabel() {
  return useOpen() ? '开放平台 v1 接口' : '站点公开只读接口'
}

function basePath() {
  return useOpen() ? (config.xiaoBaiProxyBase || OPEN_BASE) : PUBLIC_BASE
}

function buildQuery(params) {
  return Object.keys(params || {})
    .filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(String(params[k]))}`)
    .join('&')
}

function request(path, params) {
  const base = basePath()
  const query = buildQuery(params)
  const url = (/^https?:\/\//i.test(base) ? '' : ORIGIN) + base + path + (query ? `?${query}` : '')
  const header = { 'Content-Type': 'application/json' }
  // 只有直连文档 v1 且未配置代理时才在端上带密钥；正式发布应由服务端代理注入
  if (useOpen() && !config.xiaoBaiProxyBase && config.xiaoBaiApiKey) {
    header.Authorization = `Bearer ${config.xiaoBaiApiKey}`
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: 'GET',
      timeout: 15000,
      header,
      success(res) {
        const body = res.data
        if (res.statusCode >= 200 && res.statusCode < 300 && body && body.code === 0) {
          resolve(body.data)
        } else {
          reject(new Error((body && body.message) || `请求失败 (${res.statusCode})`))
        }
      },
      fail(err) {
        reject(new Error((err && err.errMsg) || '网络连接异常'))
      }
    })
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

// 缓存优先：未过期直接用；过期或无缓存时联网，联网失败退回旧缓存（断网可读）
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

// 接口时间是 UTC，展示按北京时间（UTC+8）
function formatDate(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (isNaN(date.getTime())) return ''
  const local = new Date(date.getTime() + 8 * 60 * 60 * 1000)
  return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`
}

function normalizeArticle(raw) {
  const category = raw.category || {}
  const subCategory = raw.subCategory || {}
  return {
    id: raw.id,
    slug: raw.slug || '',
    title: raw.title || '',
    summary: raw.summary || '',
    coverUrl: raw.coverUrl || '',
    categoryId: raw.categoryId || category.id || null,
    subCategoryId: raw.subCategoryId || subCategory.id || null,
    categoryName: category.name || '财经知识',
    categorySlug: category.slug || '',
    subCategoryName: subCategory.name || '',
    viewCount: Number(raw.viewCount) || 0,
    likeCount: Number(raw.likeCount) || 0,
    favoriteCount: Number(raw.favoriteCount) || 0,
    isRecommend: !!raw.isRecommend,
    sourceType: raw.sourceType,
    publishAt: raw.publishAt || '',
    updatedAt: raw.updatedAt || '',
    dateText: formatDate(raw.publishAt || raw.updatedAt)
  }
}

function normalizeCategories(data) {
  const list = Array.isArray(data) ? data : (data && Array.isArray(data.list) ? data.list : [])
  return list.map(item => ({
    id: item.id,
    name: item.name || '',
    slug: item.slug || '',
    children: (Array.isArray(item.children) ? item.children : []).map(child => ({
      id: child.id,
      name: child.name || '',
      slug: child.slug || ''
    }))
  }))
}

function pickRef(item) {
  if (!item || !item.id) return null
  return {
    id: item.id,
    slug: item.slug || '',
    title: item.title || '',
    summary: item.summary || ''
  }
}

function getCategories(force) {
  return load('categories', () => request('/categories').then(normalizeCategories), force)
    .then(res => res.data)
}

function getArticles(params = {}) {
  return request('/articles', params).then(data => {
    const list = Array.isArray(data && data.list) ? data.list.map(normalizeArticle) : []
    const total = Number(data && data.total) || 0
    const page = Number(data && data.page) || 1
    const size = Number(data && data.size) || Number(params.size) || 20
    const hasMore = data && typeof data.hasMore === 'boolean'
      ? data.hasMore
      : page * size < total
    return { list, total, page, size, hasMore }
  })
}

// 列表精简字段一次性拉全量（size 上限 50），用于本地分类/搜索/排序与离线兜底
function fetchAllArticles() {
  return getArticles({ page: 1, size: PAGE_SIZE }).then(first => {
    const list = first.list.slice()
    const pages = Math.min(20, Math.max(1, Math.ceil(first.total / PAGE_SIZE)))
    const rest = []
    for (let page = 2; page <= pages; page++) {
      rest.push(getArticles({ page, size: PAGE_SIZE }))
    }
    return Promise.all(rest).then(results => {
      results.forEach(res => list.push.apply(list, res.list))
      return list
    })
  })
}

function getAllArticles(force) {
  return load('all_articles', fetchAllArticles, force).then(res => res.data)
}

function getOfflineArticles() {
  const raw = readCache('all_articles')
  return raw && Array.isArray(raw.data) ? raw.data : []
}

function buildDetailView(data) {
  const raw = data && data.article
  if (!raw) throw new Error('文章不存在或未发布')
  const html = raw.contentHtml || ''
  const text = raw.contentText || raw.contentMd || ''
  return {
    article: normalizeArticle(raw),
    // 文档 v1.1 / 4.5：由文章 id 调 /articles/{id}/image 分享图接口，详情页默认以图片形式展示
    imageUrl: getArticleImageUrl(raw.id || raw.slug),
    richHtml: html ? htmlUtil.toRichText(html) : '',
    htmlAvailable: !!html,
    blocks: html ? content.parseHtml(html) : content.parseText(text),
    tags: (Array.isArray(raw.tags) ? raw.tags : [])
      .map(item => (typeof item === 'string' ? item : (item && item.name) || ''))
      .filter(Boolean),
    toc: (Array.isArray(data.toc) ? data.toc : [])
      .map(item => ({ text: (item && (item.text || item.title || item.name)) || '' }))
      .filter(item => item.text),
    prev: pickRef(data.prev),
    next: pickRef(data.next),
    related: (Array.isArray(data.related) ? data.related : []).map(pickRef).filter(Boolean),
    disclaimer: '本文仅为财经知识科普，不构成任何投资建议。投资有风险，决策需谨慎。'
  }
}

// 只缓存清洗后的富文本与结构化文本，不缓存原始 HTML（单篇正文可达数百 KB）
function trimArticleCache() {
  try {
    const keys = wx.getStorageInfoSync().keys.filter(key => key.indexOf(CACHE_PREFIX + 'article_') === 0)
    if (keys.length <= MAX_CACHED_ARTICLES) return
    const entries = keys.map(key => ({ key, t: (wx.getStorageSync(key) || {}).t || 0 }))
      .sort((a, b) => a.t - b.t)
    entries.slice(0, entries.length - MAX_CACHED_ARTICLES)
      .forEach(entry => wx.removeStorageSync(entry.key))
  } catch (err) {}
}

function getArticleView(id, force) {
  if (!id) return Promise.reject(new Error('缺少文章编号'))
  const key = 'article_' + String(id).replace(/[^a-zA-Z0-9_-]/g, '_')
  const cached = readCache(key)
  if (!force && cached) return Promise.resolve(cached.data)
  return request('/articles/' + encodeURIComponent(id))
    .then(data => {
      const view = buildDetailView(data)
      writeCache(key, view)
      trimArticleCache()
      return view
    })
    .catch(err => {
      if (cached) return cached.data
      throw err
    })
}

function getFavorites() {
  try {
    const list = wx.getStorageSync(FAV_KEY)
    return Array.isArray(list) ? list : []
  } catch (err) {
    return []
  }
}

function isFavorite(id) {
  return getFavorites().indexOf(String(id)) >= 0
}

// 返回切换后是否已收藏
function toggleFavorite(id) {
  const list = getFavorites()
  const key = String(id)
  const index = list.indexOf(key)
  if (index >= 0) list.splice(index, 1)
  else list.unshift(key)
  try {
    wx.setStorageSync(FAV_KEY, list)
  } catch (err) {}
  return index < 0
}

// 文章分享图（文档 v1.1 / 4.5）：GET /articles/{idOrSlug}/image → 1080×1440 SVG。
// 站内公开只读接口无需密钥，可直接交给 <image src>；文档里的开放平台 v1 图片接口需要
// Authorization 请求头，而 <image> / previewImage 无法自定义请求头，因此只有配置
// xiaoBaiProxyBase、由服务端代理注入 Key 时才可用，否则退回正文模式。
// 站内公开详情 JSON 目前不返回 imageUrl，故按文档路径用文章 id 构造；不把接口返回的
// 任意链接交给 <image>，且小程序网络图片只允许 HTTPS。
function getArticleImageUrl(id) {
  if (!id) return ''
  if (useOpen() && !config.xiaoBaiProxyBase) return ''
  const base = basePath()
  const url = (/^https?:\/\//i.test(base) ? '' : ORIGIN) + base + `/articles/${encodeURIComponent(String(id))}/image`
  return /^https:\/\//i.test(url) ? url : ''
}

module.exports = {
  sourceLabel,
  formatDate,
  getCategories,
  getArticles,
  getAllArticles,
  getOfflineArticles,
  getArticleView,
  getArticleImageUrl,
  getFavorites,
  isFavorite,
  toggleFavorite
}
