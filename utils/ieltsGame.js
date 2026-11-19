// 背单词小游戏的出题与本机成绩，纯数据逻辑，不发起任何网络请求
const { WORDS } = require('./ieltsWords')

const ROUND_SIZE = 10
const MAX_WRONG_WORDS = 60
const STORAGE_KEY = 'ielts_words_game_v1'
const LETTERS = ['A', 'B', 'C', 'D']

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

function buildQuestion(word, random) {
  const distractors = shuffle(
    WORDS.filter(item => item.w !== word.w && item.m !== word.m),
    random
  ).slice(0, LETTERS.length - 1).map(item => item.m)
  const options = shuffle([word.m].concat(distractors), random)
    .map((text, i) => ({ key: LETTERS[i], text }))
  let answer = 0
  options.forEach((option, i) => {
    if (option.text === word.m) answer = i
  })
  return {
    word: word.w,
    phonetic: word.p,
    pos: word.t,
    meaning: word.m,
    example: word.e,
    options,
    answer
  }
}

function createRound(random) {
  const size = Math.min(ROUND_SIZE, WORDS.length)
  return shuffle(WORDS, random).slice(0, size).map(word => buildQuestion(word, random))
}

function emptyStats() {
  return { best: 0, played: 0, wrongWords: [] }
}

function readStats() {
  try {
    const raw = wx.getStorageSync(STORAGE_KEY)
    if (!raw || typeof raw !== 'object') return emptyStats()
    return {
      best: Number(raw.best) || 0,
      played: Number(raw.played) || 0,
      wrongWords: Array.isArray(raw.wrongWords) ? raw.wrongWords.filter(w => typeof w === 'string') : []
    }
  } catch (err) {
    return emptyStats()
  }
}

function saveRound(result) {
  const previous = readStats()
  const merged = previous.wrongWords.concat(Array.isArray(result.wrongWords) ? result.wrongWords : [])
  const seen = Object.create(null)
  const wrongWords = merged.filter(word => {
    if (seen[word]) return false
    seen[word] = true
    return true
  }).slice(-MAX_WRONG_WORDS)
  const score = Number(result.score) || 0
  const next = {
    best: Math.max(previous.best, score),
    played: previous.played + 1,
    wrongWords
  }
  try {
    wx.setStorageSync(STORAGE_KEY, next)
  } catch (err) {
    // 本机存储不可用时成绩仍然有效，只是不持久化
  }
  return next
}

function previewText() {
  const stats = readStats()
  return stats.played
    ? `共 ${WORDS.length} 词 · 最佳 ${stats.best}/${ROUND_SIZE}`
    : `共 ${WORDS.length} 词 · 随机 ${ROUND_SIZE} 题挑战`
}

module.exports = { WORDS, ROUND_SIZE, createRound, readStats, saveRound, previewText }
