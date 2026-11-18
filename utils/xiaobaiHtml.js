// 把小白财经的 HTML 漫画正文清洗成 rich-text 可安全渲染的片段
// rich-text 不认 <style> 与 class 选择器，所以把 CSS 规则内联到元素的 style 属性；
// 同时用标签/属性/CSS 声明白名单重建 HTML，不保留任何事件、脚本、外链资源。
// 角色头像是内嵌 SVG symbol 的 base64 PNG，rich-text 的 img 只支持网络图片，
// 因此把角色介绍区 / 对话块单独抽出来交给原生 image 组件渲染。
const { resolveUrl } = require('./util')

const MAX_HTML = 200000
const MAX_AVATAR_BASE64 = 400000
const SAFE_ID = /^[a-zA-Z0-9_-]{1,40}$/
const DANGEROUS_BLOCK = /<(script|style|svg|head|noscript|iframe|object|embed|form|button|select|textarea|canvas|video|audio|title)\b[^>]*>[\s\S]*?<\/\1\s*>/gi
const DANGEROUS_TAG = /<(script|svg|iframe|object|embed|input|link|meta|base|source|track|symbol|defs|use)\b[^>]*>/gi

const ALLOWED_TAGS = {
  div: 'div', span: 'span', p: 'p', br: 'br',
  h1: 'h1', h2: 'h2', h3: 'h3', h4: 'h4', h5: 'h5', h6: 'h6',
  strong: 'strong', b: 'strong', em: 'em', i: 'em', u: 'u', small: 'span',
  ul: 'ul', ol: 'ol', li: 'li',
  table: 'table', thead: 'thead', tbody: 'tbody', tfoot: 'tbody', tr: 'tr', td: 'td', th: 'th',
  blockquote: 'blockquote', hr: 'hr', img: 'img',
  section: 'div', article: 'div', header: 'div', footer: 'div', main: 'div', nav: 'div',
  figure: 'div', figcaption: 'div', dl: 'div', dt: 'div', dd: 'div',
  center: 'div', font: 'span', label: 'span'
}

const SAFE_CSS = /^(color|background|background-color|font-size|font-weight|font-style|font-family|line-height|text-align|text-decoration|text-shadow|letter-spacing|white-space|word-break|padding|padding-top|padding-right|padding-bottom|padding-left|margin|margin-top|margin-right|margin-bottom|margin-left|border|border-top|border-right|border-bottom|border-left|border-radius|border-collapse|border-spacing|border-width|border-style|border-color|display|flex|flex-direction|flex-wrap|justify-content|align-items|align-self|gap|width|height|max-width|min-width|min-height|max-height|box-sizing|box-shadow|opacity|overflow|vertical-align|list-style|font|text-indent)$/i

const UNSAFE_VALUE = /url\s*\(|expression\s*\(|@import|javascript:|behavior\s*:|-moz-binding|position\s*:\s*(fixed|absolute)/i

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function sanitizeDeclarations(text) {
  const out = []
  String(text || '').split(';').forEach(part => {
    const index = part.indexOf(':')
    if (index < 0) return
    const prop = part.slice(0, index).trim().toLowerCase()
    const value = part.slice(index + 1).trim()
    if (!prop || !value) return
    if (!SAFE_CSS.test(prop) || UNSAFE_VALUE.test(value)) return
    // 渐变在部分 rich-text 实现里会被整条丢弃，先垫一个纯色底避免白字看不清
    if (prop === 'background' && /gradient/i.test(value)) {
      const color = value.match(/#[0-9a-f]{3,8}|rgba?\([^)]+\)/i)
      if (color) out.push(`background-color:${color[0]}`)
    }
    out.push(`${prop}:${value}`)
  })
  return out.join(';')
}

// 只取简单 class 规则，复杂选择器按「最后一个 class」归入对应元素
function parseCss(css) {
  const map = {}
  const clean = String(css || '').replace(/\/\*[\s\S]*?\*\//g, '')
  const rule = /([^{}]+)\{([^{}]*)\}/g
  let match
  while ((match = rule.exec(clean)) !== null) {
    const selectors = match[1].trim()
    if (!selectors || /@|:{2}|:hover|:active|:focus|:before|:after/.test(selectors)) continue
    const declarations = sanitizeDeclarations(match[2])
    if (!declarations) continue
    selectors.split(',').forEach(selector => {
      const classes = selector.match(/\.([a-zA-Z0-9_-]+)/g)
      if (!classes || !classes.length) return
      const key = classes[classes.length - 1].slice(1)
      map[key] = (map[key] ? `${map[key]};` : '') + declarations
    })
  }
  return map
}

function extractCss(html) {
  const parts = String(html || '').match(/<style\b[^>]*>([\s\S]*?)<\/style>/gi) || []
  return parts.map(part => part.replace(/^<style\b[^>]*>/i, '').replace(/<\/style>$/i, '')).join('\n')
}

function buildAttrs(attrs, classMap) {
  let style = ''
  const classMatch = attrs.match(/class\s*=\s*["']([^"']*)["']/i)
  if (classMatch) {
    classMatch[1].split(/\s+/).filter(Boolean).forEach(name => {
      if (classMap[name]) style += (style ? ';' : '') + classMap[name]
    })
  }
  const inlineMatch = attrs.match(/style\s*=\s*["']([^"']*)["']/i)
  if (inlineMatch) {
    const inline = sanitizeDeclarations(inlineMatch[1])
    if (inline) style += (style ? ';' : '') + inline
  }

  let out = ''
  if (style) out += ` style="${escapeAttr(style)}"`
  const srcMatch = attrs.match(/src\s*=\s*["']([^"']*)["']/i)
  if (srcMatch) {
    const src = resolveUrl(srcMatch[1])
    if (/^https:\/\//i.test(src)) out += ` src="${escapeAttr(src)}"`
  }
  const spanMatch = attrs.match(/\b(colspan|rowspan)\s*=\s*["'](\d+)["']/gi) || []
  spanMatch.forEach(item => {
    const parts = item.match(/\b(colspan|rowspan)\s*=\s*["'](\d+)["']/i)
    if (parts) out += ` ${parts[1].toLowerCase()}="${parts[2]}"`
  })
  return out
}

function rebuildTags(html, classMap) {
  return String(html).replace(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (match, closing, rawTag, attrs) => {
    const tag = rawTag.toLowerCase()
    const mapped = ALLOWED_TAGS[tag]
    if (closing) return mapped ? `</${mapped}>` : ''
    if (!mapped) return ''
    const selfClose = tag === 'br' || tag === 'hr' || tag === 'img' || /\/\s*$/.test(attrs)
    const rebuilt = `<${mapped}${buildAttrs(attrs, classMap)}${selfClose ? ' /' : ''}>`
    // 没有合法 HTTPS 地址的 img 直接丢掉，避免 rich-text 里留下破图占位
    if (mapped === 'img' && rebuilt.indexOf(' src="') < 0) return ''
    return rebuilt
  })
}

// 接口把两张角色头像内嵌在 <symbol> 的 <image href="data:image/png;base64,..."> 里，
// 正文只用 <svg><use href="#id"></use></svg> 引用，没有独立头像接口或静态地址。
function extractAvatars(html) {
  const out = {}
  const re = /<symbol\b([^>]*)>([\s\S]*?)<\/symbol>/gi
  let match
  while ((match = re.exec(String(html || ''))) !== null) {
    const idMatch = match[1].match(/\bid\s*=\s*["']([^"']+)["']/i)
    const imageMatch = match[2].match(/(?:xlink:)?href\s*=\s*["']data:image\/(png|jpeg|jpg|webp);base64,([^"']+)["']/i)
    if (!idMatch || !imageMatch) continue
    const id = idMatch[1]
    if (!SAFE_ID.test(id)) continue
    const data = imageMatch[2].replace(/\s+/g, '')
    if (!data || data.length > MAX_AVATAR_BASE64 || !/^[A-Za-z0-9+/=]+$/.test(data)) continue
    const ext = imageMatch[1].toLowerCase() === 'jpeg' ? 'jpg' : imageMatch[1].toLowerCase()
    out[id] = { ext, data }
  }
  return out
}

function classNames(attrs) {
  const match = String(attrs || '').match(/\bclass\s*=\s*["']([^"']*)["']/i)
  return match ? match[1].split(/\s+/).filter(Boolean) : []
}

// 从 <div> 开标签起做 div 配平，拿到整个块的区间（正文里的 div 都是成对出现的）
function findDivBlock(html, start) {
  const re = /<(\/?)div\b([^>]*)>/gi
  re.lastIndex = start
  let depth = 0
  let openEnd = -1
  let match
  while ((match = re.exec(html)) !== null) {
    if (match[1]) {
      depth--
      if (depth === 0) {
        return { start, openEnd, closeStart: match.index, end: match.index + match[0].length }
      }
      if (depth < 0) return null
    } else {
      if (depth === 0) openEnd = match.index + match[0].length
      if (!/\/\s*$/.test(match[2])) depth++
    }
  }
  return null
}

function findSpecialBlocks(body) {
  const found = []
  const re = /<div\b([^>]*)>/gi
  let match
  while ((match = re.exec(body)) !== null) {
    const names = classNames(match[1])
    const type = names.indexOf('characters-bar') >= 0 ? 'cast'
      : names.indexOf('dialogue-block') >= 0 ? 'dialogue' : ''
    if (!type) continue
    const block = findDivBlock(body, match.index)
    if (!block) continue
    found.push({
      type,
      classes: names,
      start: match.index,
      end: block.end,
      raw: body.slice(match.index, block.end)
    })
    re.lastIndex = block.end
  }
  return found
}

function collectUseIds(raw) {
  const ids = []
  const re = /<use\b[^>]*?(?:xlink:)?href\s*=\s*["']#([a-zA-Z0-9_-]+)["'][^>]*>/gi
  let match
  while ((match = re.exec(String(raw || ''))) !== null) {
    if (SAFE_ID.test(match[1])) ids.push(match[1])
  }
  return ids
}

function collectTextByClass(raw, name) {
  const out = []
  const re = /<div\b([^>]*)>([\s\S]*?)<\/div>/gi
  let match
  while ((match = re.exec(String(raw || ''))) !== null) {
    if (classNames(match[1]).indexOf(name) < 0) continue
    out.push(String(match[2]).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim())
  }
  return out
}

// 分段后普通片段可能被外层容器截断，补齐闭合标签、丢掉开头多余的 </div>
function balanceDivs(html) {
  let depth = 0
  const text = String(html || '').replace(/<(\/?)div\b([^>]*)>/gi, (match, closing, attrs) => {
    if (closing) {
      if (depth === 0) return ''
      depth--
      return match
    }
    if (!/\/\s*$/.test(attrs)) depth++
    return match
  })
  return text + (depth > 0 ? new Array(depth + 1).join('</div>') : '')
}

function cleanFragment(html, classMap) {
  let body = String(html || '')
  body = body.replace(/<!--[\s\S]*?-->/g, '')
  body = body.replace(/<!doctype[^>]*>/gi, '')
  body = body.replace(DANGEROUS_BLOCK, '')
  body = body.replace(DANGEROUS_TAG, '')
  body = body.replace(/<\/?(html|body|head)\b[^>]*>/gi, '')
  let result = rebuildTags(body, classMap)
  if (result.length > MAX_HTML) result = result.slice(0, MAX_HTML)
  return balanceDivs(result)
}

function buildCastSegment(block) {
  const ids = collectUseIds(block.raw)
  const names = collectTextByClass(block.raw, 'name')
  const roles = collectTextByClass(block.raw, 'role')
  return {
    type: 'cast',
    left: { id: ids[0] || '', name: names[0] || '小白', role: roles[0] || '' },
    right: { id: ids[1] || '', name: names[1] || '师傅', role: roles[1] || '' }
  }
}

function buildDialogueSegment(block, classMap) {
  const ids = collectUseIds(block.raw)
  let bubbleHtml = ''
  const re = /<div\b([^>]*)>/gi
  let match
  while ((match = re.exec(block.raw)) !== null) {
    if (classNames(match[1]).indexOf('bubble') < 0) continue
    const bubble = findDivBlock(block.raw, match.index)
    if (bubble && bubble.openEnd >= 0) {
      bubbleHtml = block.raw.slice(bubble.openEnd, bubble.closeStart)
    }
    break
  }
  return {
    type: 'dialogue',
    avatarId: ids[0] || '',
    reverse: block.classes.indexOf('reverse') >= 0,
    html: cleanFragment(bubbleHtml || block.raw, classMap)
  }
}

// 输出顺序化的正文片段：普通 HTML 走 rich-text，角色区 / 对话块走原生组件
function buildArticleHtml(html) {
  const source = String(html || '')
  if (!source) return { segments: [], avatars: {} }
  const avatars = extractAvatars(source)
  const classMap = parseCss(extractCss(source))
  const body = source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!doctype[^>]*>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<svg\b[^>]*>\s*<defs\b[^>]*>[\s\S]*?<\/defs>\s*<\/svg>/gi, '')
    .replace(/<symbol\b[^>]*>[\s\S]*?<\/symbol>/gi, '')
    .replace(/<\/?(html|body|head)\b[^>]*>/gi, '')
  const blocks = findSpecialBlocks(body)
  const segments = []
  let cursor = 0
  blocks.forEach(block => {
    const before = cleanFragment(body.slice(cursor, block.start), classMap)
    if (before.trim()) segments.push({ type: 'html', html: before })
    segments.push(block.type === 'cast' ? buildCastSegment(block) : buildDialogueSegment(block, classMap))
    cursor = block.end
  })
  const after = cleanFragment(body.slice(cursor), classMap)
  if (after.trim()) segments.push({ type: 'html', html: after })
  return { segments, avatars }
}

// 整篇清洗后的富文本，仅用于旧缓存 / 无分段时的兜底
function toRichText(html) {
  if (!html) return ''
  const source = String(html)
  return cleanFragment(source, parseCss(extractCss(source)))
}

module.exports = { toRichText, buildArticleHtml, extractAvatars, sanitizeDeclarations, parseCss }
