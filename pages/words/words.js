const game = require('../../utils/ieltsGame')

Page({
  data: {
    stage: 'home',
    total: game.TOTAL,
    roundSize: game.ROUND_SIZE,
    maxLives: game.MAX_LIVES,
    types: game.TYPES,
    wordOfMoment: null,
    stats: null,
    wrongReady: false,
    mode: 'normal',

    round: [],
    index: 0,
    question: null,
    optionStates: [],
    letters: [],
    typed: [],
    emptySlots: [],
    progressText: '',
    progress: 0,
    lives: game.MAX_LIVES,
    livesText: '♥♥♥',
    score: 0,
    streak: 0,
    bestStreak: 0,
    correctCount: 0,
    answered: false,
    lastCorrect: false,
    feedbackTitle: '',
    feedbackWord: '',
    feedbackExample: '',
    feedbackZh: '',
    gainText: '',
    nextText: '下一题',
    previousBest: 0,

    accuracy: 0,
    stars: 0,
    starsText: '☆☆☆',
    newRecord: false,
    fastest: '—',
    wrongWords: [],
    masteredCount: 0,
    masteredPercent: 0
  },

  onLoad() {
    this.roundWrong = []
    this.roundCorrect = []
    this.fastestMs = Infinity
    this.questionStartedAt = Date.now()
    this.refreshWord()
    this.refreshStats()
  },

  onShow() {
    // 每次进入 / 切回都换一个随机开场词
    this.refreshWord()
    this.refreshStats()
  },

  onPullDownRefresh() {
    this.refreshWord()
    this.refreshStats()
    wx.stopPullDownRefresh()
  },

  refreshWord() {
    this.setData({ wordOfMoment: game.randomWord() })
  },

  refreshStats() {
    const stats = game.readStats()
    this.setData({
      stats: {
        best: stats.best,
        played: stats.played,
        masteredCount: stats.mastered.length,
        wrongCount: stats.wrongWords.length,
        accuracy: stats.totalQuestions
          ? Math.round(stats.totalCorrect * 100 / stats.totalQuestions) : 0
      },
      wrongReady: stats.wrongWords.length >= 4
    })
  },

  shuffleWord() {
    this.refreshWord()
  },

  copyWord() {
    const word = this.data.wordOfMoment
    if (!word) return
    wx.setClipboardData({
      data: `${word.w} ${word.p} ${word.t} ${word.m}\n${word.e}\n${word.z}`
    })
  },

  slotArray(size) {
    const out = []
    for (let i = 0; i < Math.max(0, size); i++) out.push(i)
    return out
  },

  renderLives(count) {
    let text = ''
    for (let i = 0; i < game.MAX_LIVES; i++) text += i < count ? '♥' : '♡'
    return text
  },

  onStartTap(e) {
    this.startRound(e.currentTarget.dataset.mode === 'review' ? 'review' : 'normal')
  },

  startRound(mode) {
    const review = mode === 'review'
    const pool = review ? game.wrongPool() : null
    if (review && pool.length < 4) {
      wx.showToast({ title: '先玩一轮，攒够 4 个错词', icon: 'none' })
      return
    }
    const round = game.createRound({ pool })
    this.roundWrong = []
    this.roundCorrect = []
    this.fastestMs = Infinity
    this.questionStartedAt = Date.now()
    const question = round[0] || null
    this.setData({
      stage: 'playing',
      mode: review ? 'review' : 'normal',
      round,
      index: 0,
      question,
      optionStates: question ? question.options.map(() => '') : [],
      letters: question ? question.letters.map(item => Object.assign({}, item)) : [],
      typed: [],
      emptySlots: question && question.type === 'spell' ? this.slotArray(question.spellAnswer.length) : [],
      progressText: `1 / ${round.length}`,
      progress: round.length ? Math.round(100 / round.length) : 0,
      lives: game.MAX_LIVES,
      livesText: this.renderLives(game.MAX_LIVES),
      score: 0,
      streak: 0,
      bestStreak: 0,
      correctCount: 0,
      answered: false,
      lastCorrect: false,
      feedbackTitle: '',
      feedbackWord: '',
      feedbackExample: '',
      feedbackZh: '',
      gainText: '',
      nextText: round.length <= 1 ? '查看成绩' : '下一题',
      previousBest: game.readStats().best
    })
  },

  showQuestion(index) {
    const question = this.data.round[index]
    this.questionStartedAt = Date.now()
    this.setData({
      index,
      question,
      optionStates: question.options.map(() => ''),
      letters: question.letters.map(item => Object.assign({}, item)),
      typed: [],
      emptySlots: question.type === 'spell' ? this.slotArray(question.spellAnswer.length) : [],
      progressText: `${index + 1} / ${this.data.round.length}`,
      progress: Math.round((index + 1) * 100 / this.data.round.length),
      answered: false,
      lastCorrect: false,
      feedbackTitle: '',
      feedbackWord: '',
      feedbackExample: '',
      feedbackZh: '',
      gainText: '',
      nextText: index >= this.data.round.length - 1 ? '查看成绩' : '下一题'
    })
  },

  pickOption(e) {
    if (this.data.answered || !this.data.question || this.data.question.type === 'spell') return
    const picked = Number(e.currentTarget.dataset.index)
    const options = this.data.question.options
    if (isNaN(picked) || picked < 0 || picked >= options.length) return
    this.applyAnswer(picked === this.data.question.answer, picked)
  },

  tapLetter(e) {
    if (this.data.answered || !this.data.question || this.data.question.type !== 'spell') return
    const id = Number(e.currentTarget.dataset.id)
    const letters = this.data.letters.slice()
    const at = letters.findIndex(item => item.id === id)
    if (at < 0 || letters[at].used) return
    const size = this.data.question.spellAnswer.length
    if (this.data.typed.length >= size) return
    letters[at] = Object.assign({}, letters[at], { used: true })
    const typed = this.data.typed.concat([{ id, ch: letters[at].ch }])
    this.setData({ letters, typed, emptySlots: this.slotArray(size - typed.length) })
  },

  undoLetter(e) {
    if (this.data.answered) return
    const id = Number(e.currentTarget.dataset.id)
    const typed = this.data.typed.slice()
    const at = typed.findIndex(item => item.id === id)
    if (at < 0) return
    typed.splice(at, 1)
    const letters = this.data.letters.map(item =>
      item.id === id ? Object.assign({}, item, { used: false }) : item
    )
    this.setData({
      typed,
      letters,
      emptySlots: this.slotArray(this.data.question.spellAnswer.length - typed.length)
    })
  },

  clearLetters() {
    if (this.data.answered || !this.data.question || this.data.question.type !== 'spell') return
    this.setData({
      typed: [],
      letters: this.data.letters.map(item => Object.assign({}, item, { used: false })),
      emptySlots: this.slotArray(this.data.question.spellAnswer.length)
    })
  },

  confirmSpell() {
    if (this.data.answered || !this.data.question || this.data.question.type !== 'spell') return
    const size = this.data.question.spellAnswer.length
    if (this.data.typed.length !== size) {
      wx.showToast({ title: '把字母点满再确认', icon: 'none' })
      return
    }
    const value = this.data.typed.map(item => item.ch).join('')
    this.applyAnswer(value === this.data.question.spellAnswer, -1)
  },

  applyAnswer(correct, pickedIndex) {
    if (this.data.answered) return
    const question = this.data.question
    const elapsed = Date.now() - this.questionStartedAt
    const streak = correct ? this.data.streak + 1 : 0
    const gain = correct ? game.scoreFor(elapsed, streak) : { total: 0, speed: 0, combo: 0 }
    const lives = correct ? this.data.lives : Math.max(0, this.data.lives - 1)
    const optionStates = question.options.map((option, i) => {
      if (i === question.answer) return 'right'
      if (i === pickedIndex) return 'wrong'
      return 'dim'
    })

    if (correct) {
      this.roundCorrect.push(question.word.w)
      if (elapsed < this.fastestMs) this.fastestMs = elapsed
    } else {
      this.roundWrong.push(question.word.w)
    }

    const last = this.data.index >= this.data.round.length - 1 || lives <= 0
    this.setData({
      answered: true,
      lastCorrect: correct,
      optionStates,
      score: this.data.score + gain.total,
      streak,
      bestStreak: Math.max(this.data.bestStreak, streak),
      correctCount: this.data.correctCount + (correct ? 1 : 0),
      lives,
      livesText: this.renderLives(lives),
      feedbackTitle: correct
        ? `✓ 答对  +${gain.total} 分${gain.combo ? ` · 连击 ×${streak}` : ''}`
        : `✗ 正确答案：${question.type === 'meaning' ? question.word.m : question.word.w}`,
      feedbackWord: `${question.word.w}  ${question.word.p}  ${question.word.t}  ${question.word.m}`,
      feedbackExample: question.word.e,
      feedbackZh: question.word.z,
      gainText: correct
        ? `速度 +${gain.speed} · 连击 +${gain.combo} · ${(elapsed / 1000).toFixed(1)}s`
        : '别灰心，这个词已加入错词本',
      nextText: last ? '查看成绩' : '下一题'
    })
  },

  next() {
    const index = this.data.index + 1
    if (index >= this.data.round.length || this.data.lives <= 0) return this.finish()
    this.showQuestion(index)
  },

  finish() {
    const total = this.data.round.length || 1
    const stats = game.saveRound({
      score: this.data.score,
      correct: this.data.correctCount,
      total,
      wrongWords: this.roundWrong,
      correctWords: this.roundCorrect
    })
    const accuracy = Math.round(this.data.correctCount * 100 / total)
    const stars = accuracy >= 90 ? 3 : accuracy >= 70 ? 2 : accuracy >= 50 ? 1 : 0
    let starsText = ''
    for (let i = 0; i < 3; i++) starsText += i < stars ? '★' : '☆'
    this.setData({
      stage: 'result',
      wrongWords: this.roundWrong.slice(),
      accuracy,
      stars,
      starsText,
      newRecord: this.data.score > this.data.previousBest,
      fastest: isFinite(this.fastestMs) ? `${(this.fastestMs / 1000).toFixed(1)}s` : '—',
      masteredCount: stats.mastered.length,
      masteredPercent: Math.min(100, Number((stats.mastered.length * 100 / game.TOTAL).toFixed(1)))
    })
    this.refreshStats()
  },

  restart() {
    this.startRound('normal')
  },

  reviewWrong() {
    this.startRound('review')
  },

  quitRound() {
    this.setData({ stage: 'home' })
  },

  backToTools() {
    if (getCurrentPages().length > 1) wx.navigateBack()
    else wx.switchTab({ url: '/pages/tools/tools' })
  },

  onShareAppMessage() {
    return { title: '背单词 · 3000 雅思核心词随机挑战', path: '/pages/words/words' }
  }
})
