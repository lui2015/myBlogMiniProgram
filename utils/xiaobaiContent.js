// 小白财经正文解析：把接口返回的 HTML 转成结构化纯文本 blocks
// 只提取文字，不渲染 HTML、不执行脚本、不加载图片，由 WXML 原生组件显示
const MAX_BLOCKS = 400

const ENTITIES = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', mdash: '—',
  ndash: '–', hellip: '…', times: '×', divide: '÷', middot: '·',
  bull: '•', rarr: '→', larr: '←', darr: '↓', uarr: '↑'
}

function decodeEntities(text) {
  return String(text || '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code) => {
    if (code.charAt(0) === '#') {
      const hex = code.charAt(1) === 'x' || code.charAt(1) === 'X'
      const num = hex ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
      return isNaN(num) ? match : String.fromCharCode(num)
    }
    const value = ENTITIES[code.toLowerCase()]
    return value === undefined ? match : value
  })
}

function normalize(text) {
  return String(text || '').replace(/[\u00a0\s]+/g, ' ').trim()
}

function plain(fragment) {
  return normalize(decodeEntities(String(fragment || '').replace(/<[^>]*>/g, ' ')))
}

function toBlocks(lines) {
  const blocks = []
  let seq = 0
  let pendingLabel = ''
  let lastText = ''
  const push = block => {
    if (blocks.length >= MAX_BLOCKS) return
    blocks.push(Object.assign({ key: 'b' + (seq++) }, block))
  }
  const flushLabel = () => {
    if (pendingLabel) push({ type: 'label', text: pendingLabel })
    pendingLabel = ''
  }

  lines.forEach(raw => {
    const line = normalize(raw)
    if (line.length < 2 || line === lastText) return
    lastText = line

    if (line.indexOf('@@H:') === 0 && line.slice(-2) === '@@') {
      flushLabel()
      const text = line.slice(4, -2)
      if (text) push({ type: 'heading', text })
      return
    }
    if (line.indexOf('@@R:') === 0 && line.slice(-2) === '@@') {
      flushLabel()
      pendingLabel = line.slice(4, -2)
      return
    }

    if (pendingLabel) {
      const label = pendingLabel
      pendingLabel = ''
      const isXiaobai = /小白|🐷/.test(label)
      const isShifu = /师傅|🙏/.test(label)
      if (isXiaobai || isShifu) {
        push({ type: 'dialogue', role: isXiaobai ? '小白' : '师傅', label, text: line })
        return
      }
      push({ type: 'label', text: label })
    }

    let type = 'text'
    if (/^(💡|⚠️|⚠|🐷|📌|📊|✅|❌|🔔|🎓|🧠)/.test(line) || /一句话理解|小白笔记|核心算法|风险提示|记住：/.test(line)) {
      type = 'tip'
    } else if (/^(\d+[\.、]|第[一二三四五六七八九十]+[章节步]|[①②③④⑤⑥⑦⑧⑨])/.test(line)) {
      type = 'step'
    }
    push({ type, text: line })
  })
  flushLabel()
  return blocks
}

function parseText(text) {
  return toBlocks(String(text || '').replace(/\r\n/g, '\n').split('\n'))
}

function parseHtml(html) {
  let src = String(html || '')
  src = src.replace(/<!--[\s\S]*?-->/g, ' ')
  src = src.replace(/<!doctype[^>]*>/gi, ' ')
  src = src.replace(/<(script|style|svg|head|noscript|iframe|canvas)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
  src = src.replace(/<(script|style|svg|iframe|canvas|link|meta|img|input)\b[^>]*>/gi, ' ')
  src = src.replace(
    /<([a-z][a-z0-9]*)\b[^>]*class=["'][^"']*section-title[^"']*["'][^>]*>([\s\S]*?)<\/\1\s*>/gi,
    (match, tag, inner) => `\n@@H:${plain(inner)}@@\n`
  )
  src = src.replace(
    /<([a-z][a-z0-9]*)\b[^>]*class=["'][^"']*(?:bubble-label|tip-label|card-label)[^"']*["'][^>]*>([\s\S]*?)<\/\1\s*>/gi,
    (match, tag, inner) => `\n@@R:${plain(inner)}@@\n`
  )
  src = src.replace(
    /<h([1-4])\b[^>]*>([\s\S]*?)<\/h\1\s*>/gi,
    (match, level, inner) => `\n@@H:${plain(inner)}@@\n`
  )
  src = src.replace(/<\/(?:p|div|h[1-6]|li|tr|td|th|section|article|table|ul|ol|blockquote|header|footer|figcaption|dl|dt|dd)[^>]*>/gi, '\n')
  src = src.replace(/<br\s*\/?>/gi, '\n')
  src = src.replace(/<[^>]+>/g, ' ')
  return toBlocks(decodeEntities(src).split('\n'))
}

module.exports = { parseHtml, parseText, normalize }
