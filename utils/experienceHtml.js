// 新版接口返回站点「报告详情页」的完整自包含 HTML（含 :root CSS 变量、
// 内联 <style>、交互组件与侧栏）。小程序 rich-text 没有级联与布局引擎：
//   - 不支持 grid / flex / gap，桌面多栏会把卡片挤成窄条；
//   - CSS 内联器若把后代选择器（.hero h1 em）归到父 class，会让 hero
//     误拿到渐变背景、transparent 文字色和 38px 字号，整块版式错乱。
// 因此这里先把样式收敛成「纯单 class 规则 + 标签基础排版 + 移动端覆盖」，
// 保留原版配色、卡片、表格与字级，再复用 xiaobaiHtml 做白名单清洗。
const { toRichText } = require('./xiaobaiHtml')

// 元素 / 后代选择器全部丢弃后，由这组标签级样式兜住标题、正文与表格层级
const BASIC_STYLE = {
  h1: 'font-size:26px;font-weight:800;color:#0F172A;line-height:1.35;margin:12px 0 14px;',
  h2: 'font-size:21px;font-weight:700;color:#0F172A;line-height:1.4;margin:16px 0 10px;',
  h3: 'font-size:18px;font-weight:700;color:#0F172A;line-height:1.5;margin:16px 0 8px;',
  h4: 'font-size:16px;font-weight:600;color:#0F172A;line-height:1.5;margin:16px 0 8px;',
  h5: 'font-size:15px;font-weight:600;color:#334155;line-height:1.5;margin:14px 0 8px;',
  p: 'font-size:15px;color:#334155;line-height:1.8;margin:8px 0;',
  li: 'font-size:14px;color:#334155;line-height:1.8;',
  ul: 'padding-left:20px;margin:8px 0;',
  ol: 'padding-left:20px;margin:8px 0;',
  table: 'width:100%;border-collapse:collapse;margin:12px 0;font-size:12px;',
  th: 'border:1px solid #E2E8F0;padding:4px 5px;color:#0F172A;background-color:#F1F5F9;text-align:left;font-size:12px;line-height:1.5;',
  td: 'border:1px solid #E2E8F0;padding:4px 5px;color:#334155;font-size:12px;line-height:1.5;',
  strong: 'color:#0F172A;font-weight:700;',
  em: 'color:#4F46E5;font-style:normal;',
  blockquote: 'border-left:3px solid #4F46E5;padding:4px 12px;margin:14px 0;background-color:#EEF2FF;',
  hr: 'border-top:1px solid #E2E8F0;margin:18px 0;'
}

// 原版靠 grid gap 制造间距；同时把海报式 hero 收敛成紧凑的移动端标题卡
const MOBILE_CSS = `
.card{width:100%;box-sizing:border-box;margin:0 0 12px;padding:14px 16px}
.stage{width:100%;box-sizing:border-box;margin:0 0 12px}
.phase{width:100%;box-sizing:border-box;margin:0 0 12px;border-right:none;border-bottom:1px solid #E2E8F0}
.case{width:100%;box-sizing:border-box;margin:0 0 12px}
.layer{width:100%;box-sizing:border-box;margin:0 0 12px}
.pr{width:100%;box-sizing:border-box;margin:0 0 12px}
.callout{width:100%;box-sizing:border-box;margin:0 0 12px}
.chk-group{width:100%;box-sizing:border-box;margin:0 0 12px}
.level{width:100%;box-sizing:border-box;margin:0 0 10px}
.grid,.g2,.g3,.g4{width:100%;box-sizing:border-box}
.levels,.pipeline,.shift,.stack,.road,.anti,.bars,.kv,.tldr,.layout{width:100%;box-sizing:border-box}
.bar-row{width:100%;box-sizing:border-box;margin:0 0 8px}
.tbl-wrap{width:100%;box-sizing:border-box}
.layout{max-width:100%;margin:0;padding:0}
.pill,.k{white-space:normal}
.hero{width:100%;box-sizing:border-box;padding:18px 16px;margin:0 0 16px;border-radius:16px;background:#fff;border:1px solid #E2E8F0;color:#0F172A;font-size:15px;line-height:1.7;box-shadow:none;min-height:0}
.eyebrow{display:block;font-size:12px;color:#4F46E5;font-weight:700;letter-spacing:1px;margin:0 0 10px}
.lead{display:block;font-size:15px;color:#334155;line-height:1.8;margin:10px 0}
.tags{width:100%;box-sizing:border-box;margin:12px 0 0}
.sec-head{width:100%;box-sizing:border-box;margin:22px 0 8px}
.sec-no{color:#4F46E5;font-weight:700;font-size:13px}
.sec-sub{display:block;color:#64748B;font-size:13px;margin:0 0 12px}
.num{display:block;font-size:24px;font-weight:800;color:#4F46E5;margin:0 0 6px}
.lbl{display:block;font-size:13px;color:#334155;line-height:1.7}
.src{display:block;font-size:11px;color:#64748B;margin-top:8px}
`

function extractVars(css) {
  const vars = {}
  const root = String(css || '').match(/:root\s*\{([^{}]*)\}/i)
  if (!root) return vars
  const re = /--([a-zA-Z0-9_-]+)\s*:\s*([^;]+)/g
  let match
  while ((match = re.exec(root[1])) !== null) vars[match[1]] = match[2].trim()
  return vars
}

function expandVars(css, vars) {
  let text = String(css || '')
  for (let pass = 0; pass < 2; pass++) {
    text = text.replace(/var\(\s*--([a-zA-Z0-9_-]+)\s*(?:,\s*([^()]*))?\)/g,
      (match, name, fallback) => vars[name] || (fallback || '').trim() || '')
  }
  return text
}

// @media(max-width) 是网页的窄屏版式，提升为无条件生效；print / keyframes 等整块丢弃
function flattenAtRules(css) {
  const text = String(css || '')
  let base = ''
  const mobile = []
  let i = 0
  while (i < text.length) {
    const at = text.indexOf('@', i)
    if (at < 0) {
      base += text.slice(i)
      break
    }
    base += text.slice(i, at)
    const head = text.slice(at, at + 90)
    if (!/^@(media|supports|keyframes|-webkit-keyframes|font-face|page)\b/i.test(head)) {
      const semi = text.indexOf(';', at)
      i = semi < 0 ? at + 1 : semi + 1
      continue
    }
    const brace = text.indexOf('{', at)
    if (brace < 0) {
      i = at + 1
      continue
    }
    let depth = 0
    let end = brace
    for (; end < text.length; end++) {
      if (text[end] === '{') depth++
      else if (text[end] === '}') {
        depth--
        if (depth <= 0) break
      }
    }
    if (/^@media\s*\(\s*max-width\s*:/i.test(head)) mobile.push(text.slice(brace + 1, end))
    i = end >= text.length ? text.length : end + 1
  }
  return base + '\n' + mobile.join('\n')
}

// 只保留纯单 class 选择器。后代 / 元素 / 伪类 / 多 class 选择器交给后面的
// 标签基础排版兜底，避免 .hero h1 em 之类的规则被错误地内联到父容器上。
function keepClassRules(css) {
  const clean = String(css || '').replace(/\/\*[\s\S]*?\*\//g, '')
  const kept = []
  const rule = /([^{}]+)\{([^{}]*)\}/g
  let match
  while ((match = rule.exec(clean)) !== null) {
    const selectors = match[1].trim()
    const declarations = match[2].trim()
    if (!selectors || !declarations || selectors.indexOf('@') >= 0) continue
    const valid = selectors.split(',')
      .map(item => item.trim())
      .filter(sel => /^\.[a-zA-Z0-9_-]+$/.test(sel))
    if (!valid.length) continue
    kept.push(`${valid.join(',')}{${declarations}}`)
  }
  return kept.join('\n')
}

// rich-text 没有真正的布局引擎：留下配色 / 边框 / 字号，去掉会把内容挤扁的声明
function neutralizeLayout(css) {
  return String(css || '')
    .replace(/\bdisplay\s*:\s*(?:grid|inline-grid|flex|inline-flex|contents|table|inline-table)\b\s*;?/gi, '')
    .replace(/\bgrid-(?:template-columns|template-rows|template-areas|auto-columns|auto-rows|column|row|area|column-gap|row-gap|gap)\s*:[^;}]*;?/gi, '')
    .replace(/\b(?:flex-direction|flex-wrap|flex-flow|flex-grow|flex-shrink|flex-basis|flex|gap|column-gap|row-gap|place-items|place-content|place-self|justify-content|justify-items|align-items|align-content|align-self|order)\s*:[^;}]*;?/gi, '')
    .replace(/\bposition\s*:\s*(?:sticky|fixed|absolute)\s*;?/gi, '')
    .replace(/\bwhite-space\s*:\s*nowrap\s*;?/gi, '')
    .replace(/\boverflow(?:-x|-y)?\s*:\s*(?:hidden|auto|scroll)\s*;?/gi, '')
    .replace(/\bcolor\s*:\s*(?:transparent|#fff(?:fff)?|white)\s*;?/gi, '')
    .replace(/\b(?:min-width|max-width|min-height|height)\s*:\s*\d{3,}px\s*;?/gi, '')
}

// 已有 class 内联样式的元素保持原样，其余标签补一层基础排版
function decorate(html, tagStyles) {
  return String(html || '').replace(/<([a-zA-Z][a-zA-Z0-9]*)\b([^>]*?)(\/?)>/g, (match, tag, attrs, slash) => {
    const style = tagStyles[tag.toLowerCase()]
    if (!style || /\bstyle\s*=/i.test(attrs)) return match
    return `<${tag}${attrs} style="${style}"${slash}>`
  })
}

function styleText(html) {
  return (String(html || '').match(/<style\b[^>]*>([\s\S]*?)<\/style>/gi) || [])
    .map(block => block.replace(/^<style\b[^>]*>/i, '').replace(/<\/style>$/i, ''))
    .join('\n')
}

function buildHtml(html) {
  const source = String(html || '')
  if (!source) return ''
  const rawCss = styleText(source)

  let expanded = source
  let css = ''
  if (rawCss.trim()) {
    const vars = extractVars(rawCss)
    // 变量既在 <style> 里也在标签的 inline style 里，先对整份文档展开
    expanded = expandVars(source, vars)
    css = neutralizeLayout(keepClassRules(flattenAtRules(styleText(expanded)))) +
      '\n' + MOBILE_CSS
  }

  let prepared = expanded.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, `<style>${css}</style>`)
  // 网页外壳：固定侧栏目录与顶部进度条在小程序里没有对应交互，去掉避免挤占正文
  prepared = prepared.replace(/<aside\b[^>]*>[\s\S]*?<\/aside\s*>/gi, '')
  prepared = prepared.replace(/<div\b[^>]*\bid=["']progress["'][^>]*>\s*<\/div\s*>/gi, '')

  // 主路径与旧格式（无内联 CSS 的语义片段）都补标签级基础排版
  return decorate(toRichText(prepared), BASIC_STYLE)
}

module.exports = { buildHtml }
