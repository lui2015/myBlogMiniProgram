// 通用工具：图片地址补全、安全校验
const BASE_URL = 'https://www.luliming.xyz'

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

function formatDate(date) {
  if (!date) return ''
  return String(date).trim()
}

module.exports = {
  BASE_URL,
  resolveUrl,
  resolveFields,
  formatDate
}
