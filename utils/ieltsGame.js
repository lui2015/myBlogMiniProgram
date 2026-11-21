// 背单词游戏：混合题型出题、计分、错词本与本机成绩（纯逻辑，不联网）
const { WORDS } = require('./ieltsWords')

const TOTAL = WORDS.length
const ROUND_SIZE = 10
const MAX_LIVES = 3
const STORAGE_KEY = 'ielts_words_game_v2'
const MAX_WRONG_WORDS = 120
const LETTERS = ['A', 'B', 'C', 'D']

// 一轮里按权重混搭四种题型，避免从头到尾都是「看词选释义」
const TYPES = [
  { key: 'meaning', name: '释义选择', icon: '🎯', desc: '看单词选中文释义', weight: 36 },
  { key: 'reverse', name: '看义选词', icon: '🔁', desc: '看释义反选英文单词', weight: 22 },
  { key: 'cloze', name: '例句填空', icon: '✍️', desc: '在真实例句里选词', weight: 22 },
  { key: 'spell', name: '字母拼写', icon: '🔤', desc: '点字母拼出完整单词', weight: 20 }
]

const TITLES = {
  meaning: '选出正确的中文释义',
  reverse: '选出对应的英文单词',
  cloze: '哪个词填进句子最合适？',
  spell: '点字母，拼出这个单词'
}

function escapeRe(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function shuffle(list, random) {
  const arr = list.slice()
  const rnd = typeof random === 'function' ? random : Math.random
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    const swap = arr[i]
    arr[i] = arr[j]
    arr[j] = swap
  }
  return arr
}

// 例句里的目标词（含常见词形变化）替换成空格；匹配不到就不出填空题
function blankExample(sentence, word) {
  const re = new RegExp('\\b(' + escapeRe(word) + '(?:s|es|ed|d|ing|ies)?)\\b', 'i')
  if (!re.test(sentence)) return ''
  return sentence.replace(re, '______')
}

function pickType(word, rnd) {
  const available = TYPES.filter(type => {
    if (type.key === 'cloze') return !!word.cloze && !!blankExample(word.e, word.w)
    if (type.key === 'spell') return word.w.length >= 4 && word.w.length <= 12
    return true
  })
  const total = available.reduce((sum, type) => sum + type.weight, 0)
  let roll = rnd() * total
  for (let i = 0; i < available.length; i++) {
    roll -= available[i].weight
    if (roll <= 0) return available[i]
  }
  return available[0]
}

// 从全库随机取 3 个干扰项，字段值与正确答案不重复（释义在词库生成时已全局去重）
function pickDistractors(word, field, count, rnd) {
  const usedWords = Object.create(null)
  const usedTexts = Object.create(null)
  usedWords[word.w] = true
  usedTexts[word[field]] = true
  const out = []
  let guard = 0
  while (out.length < count && guard++ < 300) {
    const candidate = WORDS[Math.floor(rnd() * WORDS.length)]
    if (!candidate || usedWords[candidate.w] || usedTexts[candidate[field]]) continue
    usedWords[candidate.w] = true
    usedTexts[candidate[field]] = true
    out.push(candidate[field])
  }
  return out
}

function buildQuestion(word, rnd) {
  const type = pickType(word, rnd)
  const question = {
    type: type.key,
    typeName: type.name,
    typeIcon: type.icon,
    title: TITLES[type.key],
    tag: `${word.topic} · ${word.level}`,
    word: {
      w: word.w, p: word.p, t: word.t, m: word.m,
      e: word.e, z: word.z
    },
    options: [],
    answer: -1,
    letters: [],
    spellAnswer: ''
  }

  if (type.key === 'meaning') {
    question.display = word.w
    question.sub = `${word.p}  ${word.t}`
  } else if (type.key === 'reverse' || type.key === 'spell') {
    question.display = word.m
    question.sub = type.key === 'spell'
      ? `${word.t} · ${word.p} · ${word.w.length} 个字母`
      : `${word.t} · ${word.topic} · ${word.level}`
  } else {
    question.display = blankExample(word.e, word.w)
    question.sub = word.z
  }

  if (type.key === 'spell') {
    question.spellAnswer = word.w
    question.letters = shuffle(
      word.w.split('').map((ch, i) => ({ id: i, ch, used: false })),
      rnd
    )
    question.hint = `首字母 ${word.w[0].toUpperCase()} · 共 ${word.w.length} 个字母`
    return question
  }

  const field = type.key === 'meaning' ? 'm' : 'w'
  const correct = word[field]
  const texts = shuffle([correct].concat(pickDistractors(word, field, 3, rnd)), rnd)
  question.options = texts.map((text, i) => ({ key: LETTERS[i], text }))
  question.answer = texts.indexOf(correct)
  return question
}

// pool 传错词数组时只从错词里出题，用于「错词复习」
function createRound(options) {
  const opts = options || {}
  const rnd = typeof opts.random === 'function' ? opts.random : Math.random
  let pool = WORDS
  if (Array.isArray(opts.pool) && opts.pool.length >= 4) {
    const wanted = Object.create(null)
    opts.pool.forEach(word => { wanted[word] = true })
    const review = WORDS.filter(item => wanted[item.w])
    if (review.length >= 4) pool = review
  }
  return shuffle(pool, rnd)
    .slice(0, Math.min(ROUND_SIZE, pool.length))
    .map(word => buildQuestion(word, rnd))
}

// 每次进入页面抽一个随机词做开场卡片
function randomWord(random) {
  const rnd = typeof random === 'function' ? random : Math.random
  const index = Math.floor(rnd() * WORDS.length)
  const word = WORDS[index]
  return {
    w: word.w, p: word.p, t: word.t, m: word.m,
    e: word.e, z: word.z, topic: word.topic,
    level: word.level, index: index + 1
  }
}

// 答得越快、连击越高，得分越高；答错不得分
function scoreFor(elapsedMs, streak) {
  const speed = Math.max(0, 5 - Math.floor(Math.max(0, elapsedMs) / 2000))
  const combo = Math.min(Math.max(0, streak), 5) * 2
  return { total: 10 + speed + combo, speed, combo }
}

function emptyStats() {
  return { best: 0, played: 0, wrongWords: [], mastered: [], totalCorrect: 0, totalQuestions: 0 }
}

function readStats() {
  try {
    const raw = wx.getStorageSync(STORAGE_KEY)
    if (!raw || typeof raw !== 'object') return emptyStats()
    return {
      best: Number(raw.best) || 0,
      played: Number(raw.played) || 0,
      wrongWords: Array.isArray(raw.wrongWords)
        ? raw.wrongWords.filter(w => typeof w === 'string').slice(0, MAX_WRONG_WORDS) : [],
      mastered: Array.isArray(raw.mastered)
        ? raw.mastered.filter(w => typeof w === 'string').slice(0, TOTAL) : [],
      totalCorrect: Number(raw.totalCorrect) || 0,
      totalQuestions: Number(raw.totalQuestions) || 0
    }
  } catch (err) {
    return emptyStats()
  }
}

function uniq(list, limit) {
  const seen = Object.create(null)
  return list.filter(word => {
    if (!word || seen[word]) return false
    seen[word] = true
    return true
  }).slice(-limit)
}

function saveRound(result) {
  const previous = readStats()
  const input = result || {}
  const wrongWords = uniq(
    previous.wrongWords.concat(Array.isArray(input.wrongWords) ? input.wrongWords : []),
    MAX_WRONG_WORDS
  )
  const mastered = uniq(
    previous.mastered.concat(Array.isArray(input.correctWords) ? input.correctWords : []),
    TOTAL
  )
  const score = Number(input.score) || 0
  const next = {
    best: Math.max(previous.best, score),
    played: previous.played + 1,
    wrongWords,
    mastered,
    totalCorrect: previous.totalCorrect + (Number(input.correct) || 0),
    totalQuestions: previous.totalQuestions + (Number(input.total) || 0)
  }
  try {
    wx.setStorageSync(STORAGE_KEY, next)
  } catch (err) {
    // 本机存储不可用时成绩仍然有效，只是不持久化
  }
  return next
}

function wrongPool() {
  return readStats().wrongWords.slice()
}

function previewText() {
  const stats = readStats()
  if (!stats.played) return `共 ${TOTAL} 词 · 4 种题型随机挑战`
  return `共 ${TOTAL} 词 · 最佳 ${stats.best} 分 · 已掌握 ${stats.mastered.length} 词`
}

module.exports = {
  TOTAL,
  ROUND_SIZE,
  MAX_LIVES,
  TYPES,
  createRound,
  randomWord,
  blankExample,
  scoreFor,
  readStats,
  saveRound,
  wrongPool,
  previewText
}
