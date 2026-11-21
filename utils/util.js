// 通用工具：图片地址补全、安全校验
const BASE_URL = 'https://www.luliming.xyz'

// 随包默认封面：接口未配封面 / 图片加载失败时兜底，离线可用且不依赖 SVG 兼容性
const DEFAULT_COVER = '/images/article-cover.png'

const SAFE_PROTOCOL = /^https?:\/\//i
const UNSAFE_PROTOCOL = /^(javascript|data|file|vbscript|about):/i

// 接口里既有完整 URL（picsum.photos），也有站内相对路径（/uploads/xxx.png）
function resolveUrl(url) {
  if (!url || typeof url !== 'string') return ''
  const value = url.trim()
  if (!value || UNSAFE_PROTOCOL.test(value)) return ''
  if (SAFE_PROTOCOL.test(value)) return value
  if (value.charAt(0) === '/') return BASE_URL + value
  return BASE_URL + '/' + value
}

// 批量补全对象数组里的图片字段
function resolveFields(list, fields) {
  if (!Array.isArray(list)) return []
  return list.map(item => {
    const next = Object.assign({}, item)
    fields.forEach(field => {
      if (next[field]) next[field] = resolveUrl(next[field])
    })
    return next
  })
}

// 文章封面：有效地址补全，缺失或危险协议一律回退到随包默认图
function resolveCover(url) {
  return resolveUrl(url) || DEFAULT_COVER
}

// 批量给文章列表补封面；item 为空时也保证有图
function resolveCoverFields(list, field = 'cover') {
  if (!Array.isArray(list)) return []
  return list.map(item => Object.assign({}, item, { [field]: resolveCover(item && item[field]) }))
}

function formatDate(date) {
  if (!date) return ''
  return String(date).trim()
}

module.exports = {
  BASE_URL,
  DEFAULT_COVER,
  resolveUrl,
  resolveFields,
  resolveCover,
  resolveCoverFields,
  formatDate
}
