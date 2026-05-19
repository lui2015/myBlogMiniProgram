const { getArticles } = require('../../utils/data')
const poems = require('../../utils/poems')

Page({
  data: {
    // 诗词模块
    currentPoem: null,
    // 数据统计
    stats: [
      { label: '文章', value: '6', unit: '篇', icon: '📝' },
      { label: '视频', value: '3', unit: '个', icon: '🎬' },
      { label: '相册', value: '2', unit: '组', icon: '📷' }
    ],
    // 技能雷达
    skills: [
      { name: 'React/Next.js', percent: 90 },
      { name: 'TypeScript', percent: 85 },
      { name: 'Node.js', percent: 80 },
      { name: 'Python', percent: 75 },
      { name: 'UI/UX Design', percent: 70 },
      { name: 'DevOps', percent: 65 }
    ],
    // 文章
    articles: [],
    // 随机名言
    quote: {
      text: 'Programs must be written for people to read, and only incidentally for machines to execute.',
      author: 'Harold Abelson'
    },
    // 动画
    scrollTop: 0
  },

  onLoad() {
    this.loadArticles()
    this.randomPoem()
  },

  onShow() {
    // 触发数字动画
    this.animateStats()
  },

  loadArticles() {
    const articles = getArticles().slice(0, 3)
    this.setData({ articles })
  },

  randomPoem() {
    const poem = poems.getRandomPoem()
    this.setData({ currentPoem: poem })
  },

  changePoem() {
    this.randomPoem()
  },

  animateStats() {
    // 简单的数字递增动画效果
    const stats = this.data.stats
    const targets = [6, 3, 2]
    const duration = 1000
    const steps = 20
    const interval = duration / steps

    let step = 0
    const timer = setInterval(() => {
      step++
      const progress = step / steps
      const newStats = stats.map((s, i) => ({
        ...s,
        value: String(Math.floor(targets[i] * progress))
      }))
      this.setData({ stats: newStats })
      if (step >= steps) clearInterval(timer)
    }, interval)
  },

  goToCategory(e) {
    const type = e.currentTarget.dataset.type
    if (type === 'article') {
      wx.navigateTo({ url: '/pages/detail/detail?id=1' })
    } else {
      wx.showToast({ title: '即将上线', icon: 'none' })
    }
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    })
  },

  goToBlog() {
    wx.switchTab({
      url: '/pages/index/index'
    })
  },

  previewImage() {
    wx.previewImage({
      current: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800',
      urls: [
        'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800',
        'https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=800',
        'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=800'
      ]
    })
  },

  onPageScroll(e) {
    this.setData({ scrollTop: e.scrollTop })
  },

  onShareAppMessage() {
    return {
      title: '鲁力铭 - 个人赛博空间',
      path: '/pages/index/index'
    }
  }
})
