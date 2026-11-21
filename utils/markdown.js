// 轻量 Markdown 解析器
// 输出结构化 blocks，由 WXML 原生组件渲染（不拼接 HTML，避免 XSS）
const { resolveUrl } = require('./util')

function parseInline(text) {
  const source = String(text || '')
  const pattern = /(\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g
  const spans = []
  let last = 0
  let match

  while ((match = pattern.exec(source)) !== null) {
    if (match.index > last) {
      spans.push({ text: source.slice(last, match.index) })
    }
    if (match[2] !== undefined) {
      spans.push({ text: match[2], bold: true })
    } else if (match[3] !== undefined) {
      spans.push({ text: match[3], code: true })
    } else if (match[4] !== undefined) {
      spans.push({ text: match[4], link: resolveUrl(match[5]) })
    }
    last = pattern.lastIndex
  }

  if (last < source.length) {
    spans.push({ text: source.slice(last) })
  }
  if (!spans.length) spans.push({ text: source })

  return spans.map((span, i) => Object.assign({ key: 's' + i }, span))
}

// ===== 站点当前文章正文：contentFormat 标为 markdown，实际是「每行一段」的纯文本 =====
// 没有空行、没有 Markdown 块语法，按标准规则会把所有行拼成一大段。
// 这里单独按行分段，并识别章节标题、给行首引导词加粗；不解析 HTML、不拼接 HTML 字符串。
const SECTION_LABELS = ('概念|案例|运用|小结|总结|背景|定义|结论|引言|前言|后记|做法|建议|示例|要点').split('|')
const LEAD_RE = /^(场景\s*\d+|第[一二三四五六七八九十]+|步骤\s*\d+|概念|案例|运用|小结|总结|背景|定义|结论|提示|注意|先说清楚)([：:，,])/
const BLOCK_MARKERS = /^(?:#{1,6}\s|```|>|\s*[-*+]\s|\s*\d+[.)]\s|!\[|(?:-{3,}|\*{3,}|_{3,})\s*$)/m

function withKeys(spans) {
  return spans.map((span, i) => Object.assign({}, span, { key: `s${i}` }))
}

// 标准 Markdown 靠空行分段；只有「有换行、无空行、无块级语法」时才启用纯文本模式
function isPlainText(source) {
  if (!/\n/.test(source)) return false
  if (/\n\s*\n/.test(source)) return false
  return !BLOCK_MARKERS.test(source)
}

function detectHeading(text) {
  // 章节行通常很短、不含句末标点，形如「概念：琐碎定律」「小结：给注意力排个序」
  if (text.length > 30 || /[。！？!?；;]/.test(text)) return null
  if (/^[\u4e00-\u9fa5A-Za-z0-9 ]{2,12}[：:].{1,24}$/.test(text)) {
    return { type: 'heading', level: 3, text }
  }
  if (SECTION_LABELS.indexOf(text) >= 0) {
    return { type: 'heading', level: 3, text }
  }
  return null
}

// 「场景1：」「第一，」「注意，」这类行首引导词加粗，让段落层次一眼可见
function emphasize(text) {
  const lead = LEAD_RE.exec(text)
  if (!lead) return withKeys(parseInline(text))
  const spans = [{ text: lead[0], bold: true }].concat(parseInline(text.slice(lead[0].length)))
  return withKeys(spans)
}

function parsePlainText(source) {
  const blocks = []
  let seq = 0
  source.split('\n').forEach(line => {
    const text = line.trim()
    if (!text) return
    const heading = detectHeading(text)
    if (heading) {
      blocks.push(Object.assign({ key: `b${seq++}` }, heading))
    } else {
      blocks.push({ key: `b${seq++}`, type: 'paragraph', spans: emphasize(text) })
    }
  })
  return blocks
}

function parse(markdown) {
  const source = String(markdown || '').replace(/\r\n/g, '\n')
  if (isPlainText(source)) return parsePlainText(source)
  const lines = source.split('\n')
  const blocks = []
  let paragraph = []
  let list = null
  let codeLines = null

  let seq = 0
  const push = block => {
    blocks.push(Object.assign({ key: 'b' + seq++ }, block))
  }

  const flushParagraph = () => {
    if (paragraph.length) {
      const text = paragraph.join(' ')
      push({ type: 'paragraph', spans: parseInline(text) })
      paragraph = []
    }
  }

  const flushList = () => {
    if (list) {
      list.items = list.items.map((text, i) => ({
        key: 'li' + i,
        spans: parseInline(text)
      }))
      push(list)
      list = null
    }
  }

  lines.forEach(line => {
    const text = line.trim()

    if (codeLines !== null) {
      if (text.indexOf('```') === 0) {
        push({ type: 'code', text: codeLines.join('\n') })
        codeLines = null
      } else {
        codeLines.push(line)
      }
      return
    }

    if (text.indexOf('```') === 0) {
      flushParagraph()
      flushList()
      codeLines = []
      return
    }

    if (!text) {
      flushParagraph()
      flushList()
      return
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(text)
    if (heading) {
      flushParagraph()
      flushList()
      push({ type: 'heading', level: heading[1].length, text: heading[2] })
      return
    }

    const image = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(text)
    if (image) {
      flushParagraph()
      flushList()
      push({ type: 'image', alt: image[1], src: resolveUrl(image[2]) })
      return
    }

    const ordered = /^\d+[.)]\s+(.*)$/.exec(text)
    const unordered = /^[-*+]\s+(.*)$/.exec(text)
    if (ordered || unordered) {
      flushParagraph()
      const isOrdered = !!ordered
      if (!list || list.ordered !== isOrdered) {
        flushList()
        list = { type: 'list', ordered: isOrdered, items: [] }
      }
      list.items.push((ordered || unordered)[1])
      return
    }

    if (/^>\s?/.test(text)) {
      flushParagraph()
      flushList()
      push({ type: 'quote', text: text.replace(/^>\s?/, '') })
      return
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(text)) {
      flushParagraph()
      flushList()
      push({ type: 'divider' })
      return
    }

    flushList()
    paragraph.push(text)
  })

  flushParagraph()
  flushList()
  if (codeLines !== null && codeLines.length) {
    push({ type: 'code', text: codeLines.join('\n') })
  }

  return blocks
}

module.exports = { parse, parseInline, parsePlainText, isPlainText, detectHeading }
