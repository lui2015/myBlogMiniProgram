// 把小白财经的 HTML 漫画正文清洗成 rich-text 可安全渲染的片段
// rich-text 不认 <style> 与 class 选择器，所以把 CSS 规则内联到元素的 style 属性；
// 同时用标签/属性/CSS 声明白名单重建 HTML，不保留任何事件、脚本、外链资源。
const { resolveUrl } = require('./util')

const MAX_HTML = 200000

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
    return `<${mapped}${buildAttrs(attrs, classMap)}${selfClose ? ' /' : ''}>`
  })
}

function toRichText(html) {
  if (!html) return ''
  const classMap = parseCss(extractCss(html))
  let body = String(html)
  body = body.replace(/<!--[\s\S]*?-->/g, '')
  body = body.replace(/<!doctype[^>]*>/gi, '')
  body = body.replace(/<(script|style|svg|head|noscript|iframe|object|embed|form|button|select|textarea|canvas|video|audio|title)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
  body = body.replace(/<(script|svg|iframe|object|embed|input|link|meta|base|source|track)\b[^>]*>/gi, '')
  body = body.replace(/<\/?(html|body)\b[^>]*>/gi, '')
  const result = rebuildTags(body, classMap)
  return result.length > MAX_HTML ? result.slice(0, MAX_HTML) : result
}

module.exports = { toRichText, sanitizeDeclarations, parseCss }
