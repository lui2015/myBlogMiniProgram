const workday = require('../../utils/workday')
const holidayLoader = require('../../utils/holidayLoader')
const localData = require('../../utils/holidays')
const rulerStorage = require('../../utils/ruler')
const thinkingApi = require('../../utils/thinkingApi')
const finance = require('../../utils/xiaobaiApi')
const config = require('../../utils/config')

const STORAGE_KEY = 'countdown_events_v1'

function readEvents() {
  try {
    const list = wx.getStorageSync(STORAGE_KEY)
    return Array.isArray(list) ? list : []
  } catch (err) {
    return []
  }
}

Page({
  data: {
    tools: [
      {
        key: 'workday',
        icon: '📅',
        name: '工作日计算器',
        desc: '计算两个日期之间的工作日数，或推算 N 个工作日后的日期，自动识别法定节假日与调休补班。',
        tag: '原生计算',
        preview: '',
        path: '/pages/workday/workday'
      },
      {
        key: 'countdown',
        icon: '⏳',
        name: '大事件倒计时',
        desc: '记录每一个重要时刻，支持自然日与工作日两种倒计时方式，数据保存在本机。',
        tag: '本机存储',
        preview: '',
        path: '/pages/countdown/countdown'
      },
      {
        key: 'ruler',
        icon: '📏',
        name: '尺子',
        desc: '屏幕刻度尺：厘米 / 英寸刻度与数字、横向 / 竖向、全屏铺满，拖动双游标测量，可用屏幕宽度或银行卡校准。',
        tag: '本机校准',
        preview: '',
        path: '/pages/ruler/ruler'
      },
      {
        key: 'thinking',
        icon: '🧠',
        name: '思维模型',
        desc: '191 个思维模型与完整解读，按 10 大分类浏览、搜索、收藏，每天认识一个模型。',
        tag: '站点同步',
        preview: '',
        path: '/pages/thinking/thinking'
      },
      {
        key: 'xiaobai',
        icon: '📈',
        name: '小白财经',
        desc: '132 篇财经知识漫画，按分类浏览、搜索与收藏，5 章讲透一个概念，正文原生排版阅读。',
        tag: '站点同步',
        preview: '',
        path: '/pages/xiaobai/xiaobai'
      }
    ]
  },

  onLoad() {
    if (!config.showXiaoBaiTool) {
      this.setData({ tools: this.data.tools.filter(item => item.key !== 'xiaobai') })
    }
    this.refreshPreview()
    this.refreshThinkingPreview()
    this.refreshFinancePreview()
    // 取到站点最新节假日数据后，用真实数据刷新预览
    holidayLoader.load().then(({ index }) => this.refreshPreview(index))
  },

  onShow() {
    this.refreshPreview(this.cachedIndex)
    this.refreshThinkingPreview()
    this.refreshFinancePreview()
  },

  // 前三个工具的预览完全由本机 JS 计算，不请求任何网页
  refreshPreview(index) {
    if (index) this.cachedIndex = index
    const holidayIndex = this.cachedIndex || workday.buildIndex(localData)
    const today = workday.todayStr()

    const range = workday.presetRange('week', today)
    const result = workday.countRange(range[0], range[1], true, holidayIndex)
    const weekText = `本周 ${result.stats.workdays} 个工作日 · ${range[0].slice(5)} ~ ${range[1].slice(5)}`

    const events = readEvents()
    let countdownText = '还没有事件 · 点进去添加第一个'
    if (events.length) {
      const sorted = events.slice().sort((a, b) => {
        const da = workday.diffDays(today, a.date)
        const db = workday.diffDays(today, b.date)
        const aFuture = da >= 0
        const bFuture = db >= 0
        if (aFuture !== bFuture) return aFuture ? -1 : 1
        return aFuture ? (a.date < b.date ? -1 : 1) : (a.date > b.date ? -1 : 1)
      })
      const next = sorted[0]
      const days = workday.diffDays(today, next.date)
      countdownText = `${events.length} 个事件 · ${next.name} ${days >= 0 ? `还有 ${days} 天` : `已过去 ${-days} 天`}`
    }

    const cal = rulerStorage.read()
    const rulerText = cal.calibrated
      ? `已校准 · 1 cm ≈ ${cal.value.toFixed(1)} px`
      : '未校准 · 进入后用屏幕宽度或银行卡对齐'

    const patch = {}
    const put = (key, text) => {
      const i = this.data.tools.findIndex(item => item.key === key)
      if (i >= 0) patch[`tools[${i}].preview`] = text
    }
    put('workday', weekText)
    put('countdown', countdownText)
    put('ruler', rulerText)
    this.setData(patch)
  },

  // 按 key 定位，避免以后插入新卡片时预览索引错位
  setPreview(key, text) {
    const index = this.data.tools.findIndex(item => item.key === key)
    if (index >= 0) this.setData({ [`tools[${index}].preview`]: text })
  },

  // 思维模型预览：先读本机缓存立即显示，再静默同步站点最新列表
  refreshThinkingPreview() {
    const cached = thinkingApi.getOfflineModels()
    const show = models => {
      const daily = thinkingApi.dailyModel(models, new Date())
      const text = daily
        ? `今日模型 · ${daily.title} · 共 ${models.length} 个模型`
        : '191 个模型 · 10 大分类 · 每日一模型'
      this.setPreview('thinking', text)
    }
    if (cached.length) show(cached)
    thinkingApi.getAllModels()
      .then(models => { if (models && models.length) show(models) })
      .catch(() => {
        if (!cached.length) this.setPreview('thinking', '思维模型库 · 联网后可浏览全部模型')
      })
  },

  // 小白财经预览：缓存立即显示，再静默同步站点最新文章
  refreshFinancePreview() {
    if (!config.showXiaoBaiTool) return
    const cached = finance.getOfflineArticles()
    const show = articles => {
      const sorted = articles.slice().sort((a, b) => String(b.publishAt).localeCompare(String(a.publishAt)))
      const latest = sorted[0]
      if (!latest) return
      const title = latest.title.replace(/^小白学财经[：:]\s*/, '')
      const short = title.length > 14 ? `${title.slice(0, 14)}…` : title
      this.setPreview('xiaobai', `共 ${articles.length} 篇 · 最新《${short}》`)
    }
    if (cached.length) show(cached)
    finance.getAllArticles()
      .then(articles => { if (articles && articles.length) show(articles) })
      .catch(() => {
        if (!cached.length) this.setPreview('xiaobai', '小白财经 · 联网后可浏览全部文章')
      })
  },

  goTool(e) {
    const path = e.currentTarget.dataset.path
    if (path) wx.navigateTo({ url: path })
  },

  onShareAppMessage() {
    return { title: '实用小工具 · 鲁力铭', path: '/pages/tools/tools' }
  }
})
