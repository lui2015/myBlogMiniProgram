const game = require('../../utils/ieltsGame')

Page({
  data: {
    stage: 'playing',
    totalWords: game.WORDS.length,
    roundSize: game.ROUND_SIZE,
    round: [],
    index: 0,
    question: null,
    optionStates: [],
    progressText: '',
    progress: 0,
    picked: -1,
    answered: false,
    lastCorrect: false,
    score: 0,
    streak: 0,
    bestStreak: 0,
    feedbackTitle: '',
    nextText: '下一题',
    wrongWords: [],
    best: 0,
    played: 0,
    accuracy: 0,
    newRecord: false
  },

  onLoad() {
    this.roundWrong = []
    this.startRound()
  },

  startRound() {
    const round = game.createRound()
    const stats = game.readStats()
    this.roundWrong = []
    this.setData({
      stage: 'playing',
      round,
      index: 0,
      question: round[0] || null,
      optionStates: round[0] ? round[0].options.map(() => '') : [],
      progressText: `1 / ${round.length}`,
      progress: round.length ? Math.round(100 / round.length) : 0,
      picked: -1,
      answered: false,
      lastCorrect: false,
      score: 0,
      streak: 0,
      bestStreak: 0,
      feedbackTitle: '',
      nextText: '下一题',
      wrongWords: [],
      best: stats.best,
      played: stats.played,
      accuracy: 0,
      newRecord: false
    })
  },

  pickOption(e) {
    if (this.data.answered) return
    const picked = Number(e.currentTarget.dataset.index)
    const question = this.data.question
    if (!question || isNaN(picked) || picked < 0 || picked >= question.options.length) return
    const correct = picked === question.answer
    const streak = correct ? this.data.streak + 1 : 0
    if (!correct) this.roundWrong.push(question.word)
    const optionStates = question.options.map((option, i) => {
      if (i === question.answer) return 'right'
      if (i === picked) return 'wrong'
      return 'dim'
    })
    this.setData({
      picked,
      answered: true,
      lastCorrect: correct,
      optionStates,
      score: this.data.score + (correct ? 1 : 0),
      streak,
      bestStreak: Math.max(this.data.bestStreak, streak),
      feedbackTitle: correct ? '✓ 答对了，继续保持' : `✗ 正确答案是「${question.meaning}」`,
      nextText: this.data.index >= this.data.round.length - 1 ? '查看成绩' : '下一题'
    })
  },

  next() {
    const nextIndex = this.data.index + 1
    if (nextIndex >= this.data.round.length) return this.finish()
    const question = this.data.round[nextIndex]
    this.setData({
      index: nextIndex,
      question,
      optionStates: question.options.map(() => ''),
      progressText: `${nextIndex + 1} / ${this.data.round.length}`,
      progress: Math.round((nextIndex + 1) * 100 / this.data.round.length),
      picked: -1,
      answered: false,
      lastCorrect: false,
      feedbackTitle: '',
      nextText: nextIndex >= this.data.round.length - 1 ? '查看成绩' : '下一题'
    })
  },

  finish() {
    const total = this.data.round.length || 1
    const previous = game.readStats()
    const stats = game.saveRound({ score: this.data.score, wrongWords: this.roundWrong })
    this.setData({
      stage: 'result',
      wrongWords: this.roundWrong.slice(),
      best: stats.best,
      played: stats.played,
      accuracy: Math.round(this.data.score * 100 / total),
      newRecord: this.data.score > previous.best
    })
  },

  copyWord() {
    const question = this.data.question
    if (!question) return
    wx.setClipboardData({
      data: `${question.word} ${question.phonetic} ${question.pos} ${question.meaning}`
    })
  },

  restart() {
    this.startRound()
  },

  backToTools() {
    if (getCurrentPages().length > 1) wx.navigateBack()
    else wx.switchTab({ url: '/pages/tools/tools' })
  },

  onPullDownRefresh() {
    this.startRound()
    wx.stopPullDownRefresh()
  },

  onShareAppMessage() {
    return { title: '背单词 · 雅思高频词随机挑战', path: '/pages/words/words' }
  }
})
