// 「关于我」页面数据：只做接口字段归一化，不内置任何静态内容
// 线上数据源：GET /api/open/about（单例对象，见 PersonalBlog/docs/OPEN_API.md 4.10）
// 接口字段：name / role / bio / avatar / socialLinks / skillTree / timeline
// 后台把某字段清空或删掉时，小程序也同步显示为空，绝不用本地旧值补齐。

const { resolveUrl } = require('./util')
const { BASE_URL } = require('./api')

// 页面标题属于 UI 文案，不由接口提供
const UI_TEXT = {
  pageTitle: 'ABOUT ME',
  pageSubtitle: '// 了解更多关于我的信息'
}

const UNSAFE_PROTOCOL = /^(javascript|data|file|vbscript):/i

// 社交地址只做中性复制：去掉 mailto: 前缀，过滤危险协议
function copyValue(url) {
  const text = String(url == null ? '' : url).trim()
  if (!text || UNSAFE_PROTOCOL.test(text)) return ''
  return text.replace(/^mailto:/i, '')
}

// 站点地址只接受 http/https，避免把任意字符串渲染成可点击链接
function safeHttpUrl(value) {
  const text = String(value == null ? '' : value).trim()
  return /^https?:\/\//i.test(text) ? text : ''
}

// 把 /api/open/about 的原始对象映射成 WXML 需要的结构
function normalize(raw, hero) {
  const data = raw && typeof raw === 'object' ? raw : {}
  const h = hero && typeof hero === 'object' ? hero : {}
  // 姓名可用同样是接口数据的 hero.title 兜底，其余字段一律以 about 为准
  const name = String(data.name || h.title || '').trim()

  const socialLinks = Array.isArray(data.socialLinks) ? data.socialLinks : []
  const skillTree = Array.isArray(data.skillTree) ? data.skillTree : []
  const timeline = Array.isArray(data.timeline) ? data.timeline : []

  return Object.assign({}, UI_TEXT, {
    name,
    role: String(data.role || '').trim(),
    bio: String(data.bio || '').trim(),
    avatarUrl: resolveUrl(data.avatar || h.avatarUrl || ''),
    heroAvatarUrl: resolveUrl(h.avatarUrl || ''),
    avatarText: String(h.avatarText || name.charAt(0) || '鲁').trim(),
    blogUrl: safeHttpUrl(data.blogUrl || data.website) || BASE_URL,
    socials: socialLinks.map((link, i) => ({
      key: String((link && link.id) || (link && link.name) || i),
      label: String((link && link.name) || ''),
      icon: String((link && link.icon) || '◈'),
      desc: String((link && (link.desc || link.description)) || '').trim(),
      value: copyValue(link && link.url)
    })).filter(item => item.value),
    skillTree: normalizeSkillTree(skillTree),
    timeline: timeline.map((item, i) => ({
      id: String((item && item.id) || ((item && item.year ? item.year : 'y') + '-' + i)),
      year: String((item && item.year) || ''),
      title: String((item && item.title) || ''),
      desc: String((item && item.desc) || '')
    }))
  })
}

// 自媒体平台卡片：颜色只允许 #rrggbb，二维码地址由 resolveUrl 校验协议并补全
const SAFE_COLOR = /^#[0-9a-fA-F]{6}$/

function normalizeSocialMedia(items) {
  const list = Array.isArray(items) ? items : []
  return list.map((item, i) => {
    const color = String((item && item.color) || '').trim()
    const safeColor = SAFE_COLOR.test(color) ? color : ''
    return {
      id: String((item && item.id) || `sm_${i}`),
      name: String((item && item.name) || '').trim(),
      icon: String((item && item.icon) || '◈'),
      desc: String((item && item.desc) || '').trim(),
      qr: resolveUrl(item && item.qr),
      styleText: safeColor ? `border-top-color:${safeColor}` : ''
    }
  }).filter(item => item.name)
}

// SKILL TREE 已升级为 { id, name, certificate }[]，同时兼容历史 string[]
function normalizeSkillTree(items) {
  const list = Array.isArray(items) ? items : []
  return list.map((item, i) => {
    const data = typeof item === 'string'
      ? { id: `sk_${i}`, name: item, certificate: '' }
      : (item && typeof item === 'object' ? item : {})
    const name = String(data.name || '').trim()
    if (!name) return null
    return {
      id: String(data.id || `sk_${i}`),
      name,
      certificate: resolveUrl(data.certificate)
    }
  }).filter(Boolean)
}

module.exports = {
  UI_TEXT,
  copyValue,
  normalize,
  normalizeSocialMedia,
  normalizeSkillTree
}
