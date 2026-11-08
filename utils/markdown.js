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

function parse(markdown) {
  const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n')
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

module.exports = { parse, parseInline }
