const workday = require('../../utils/workday')
const holidayLoader = require('../../utils/holidayLoader')
const localData = require('../../utils/holidays')
const rulerStorage = require('../../utils/ruler')
const thinkingApi = require('../../utils/thinkingApi')
const finance = require('../../utils/xiaobaiApi')
const config = require('../../utils/config')

const STORAGE_KEY = 'countdown_events_v1'

// 工具分类：WORK / LIFE / THOUGHT / STUDY / ENJOYMENT / OTHER，tone 对应 WXSS 里的 .tone-* 配色
const GROUPS = [
  { key: 'work', label: 'WORK', name: '工作 · 效率', tone: 'cyan' },
  { key: 'life', label: 'LIFE', name: '生活 · 测量', tone: 'pink' },
  { key: 'thought', label: 'THOUGHT', name: '思考 · 模型', tone: 'purple' },
  { key: 'study', label: 'STUDY', name: '学习 · 阅读', tone: 'amber' },
  { key: 'enjoyment', label: 'ENJOYMENT', name: '休闲 · 娱乐', tone: 'green' },
  { key: 'other', label: 'OTHER', name: '其他 · 杂项', tone: 'slate' }
]

const TOOLS = [
  {
    key: 'workday',
    group: 'work',
    icon: '📅',
    name: '工作日计算器',
    desc: '计算两个日期之间的工作日数，或推算 N 个工作日后的日期，自动识别法定节假日与调休补班。',
    tag: '原生计算',
    preview: '',
    path: '/pages/workday/workday'
  },
  {
    key: 'countdown',
    group: 'life',
    icon: '⏳',
    name: '大事件倒计时',
    desc: '记录每一个重要时刻，支持自然日与工作日两种倒计时方式，数据保存在本机。',
    tag: '本机存储',
    preview: '',
    path: '/pages/countdown/countdown'
  },
  {
    key: 'ruler',
    group: 'life',
    icon: '📏',
    name: '尺子',
    desc: '屏幕刻度尺：厘米 / 英寸刻度与数字、横向 / 竖向、全屏铺满，拖动双游标测量，可用屏幕宽度或银行卡校准。',
    tag: '本机校准',
    preview: '',
    path: '/pages/ruler/ruler'
  },
  {
    key: 'thinking',
    group: 'thought',
    icon: '🧠',
    name: '思维模型',
    desc: '191 个思维模型与完整解读，按 10 大分类浏览、搜索、收藏，每天认识一个模型。',
    tag: '站点同步',
    preview: '',
    path: '/pages/thinking/thinking'
  },
  {
    key: 'xiaobai',
    group: 'study',
    icon: '📈',
    name: '小白学财经',
    desc: '132 篇财经知识漫画，按分类浏览、搜索与收藏，5 章讲透一个概念，正文原生排版阅读。',
    tag: '站点同步',
    preview: '',
    path: '/pages/xiaobai/xiaobai'
  }
]

// 每个分组各拷一份工具对象，避免 setData 局部更新污染模块级常量；
// 空分类作为占位保留；excludeKey 用于整体隐藏某个分类（如提审时隐藏 STUDY）
function buildSections(tools, excludeKey) {
  return GROUPS.filter(group => group.key !== excludeKey).map((group, index) => {
    const list = tools.filter(item => item.group === group.key).map(item => Object.assign({}, item))
    return {
      key: group.key,
      label: group.label,
      name: group.name,
      tone: group.tone,
      no: `0${index + 1}`,
      open: false,
      countText: list.length ? `${list.length} 项` : '敬请期待',
      tools: list
    }
  })
}

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
    sections: buildSections(TOOLS)
  },

  onLoad() {
    if (!config.showXiaoBaiTool) {
      this.setData({ sections: buildSections(TOOLS, 'study') })
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

    this.setPreview('workday', weekText)
    this.setPreview('countdown', countdownText)
    this.setPreview('ruler', rulerText)
  },

  // 按 key 在分组里定位，避免插入 / 隐藏卡片后预览索引错位
  findTool(key) {
    const sections = this.data.sections || []
    for (let i = 0; i < sections.length; i++) {
      const index = sections[i].tools.findIndex(item => item.key === key)
      if (index >= 0) return [i, index]
    }
    return null
  },

  setPreview(key, text) {
    const position = this.findTool(key)
    if (!position) return
    this.setData({ [`sections[${position[0]}].tools[${position[1]}].preview`]: text })
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
        if (!cached.length) this.setPreview('xiaobai', '小白学财经 · 联网后可浏览全部文章')
      })
  },

  // 点击分类标题展开 / 收起该组工具；各组独立，默认全部收起
  toggleGroup(e) {
    const key = e.currentTarget.dataset.key
    const index = this.data.sections.findIndex(section => section.key === key)
    if (index < 0) return
    this.setData({ [`sections[${index}].open`]: !this.data.sections[index].open })
  },

  goTool(e) {
    const path = e.currentTarget.dataset.path
    if (path) wx.navigateTo({ url: path })
  },

  onShareAppMessage() {
    return { title: '实用小工具 · 鲁力铭', path: '/pages/tools/tools' }
  }
})
