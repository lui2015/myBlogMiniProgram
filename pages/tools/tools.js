const workday = require('../../utils/workday')
const holidayLoader = require('../../utils/holidayLoader')
const localData = require('../../utils/holidays')
const rulerStorage = require('../../utils/ruler')
const thinkingApi = require('../../utils/thinkingApi')
const experienceApi = require('../../utils/experienceApi')
const finance = require('../../utils/xiaobaiApi')
const englishApi = require('../../utils/englishApi')
const api = require('../../utils/api')
const ieltsGame = require('../../utils/ieltsGame')
const salaryCalc = require('../../utils/salary')

const STORAGE_KEY = 'countdown_events_v1'
// 上次成功同步的工具配置，接口不可用时离线兜底
const TOOLS_SYNC_KEY = 'mini_program_tools_v1'
const TONES = ['cyan', 'pink', 'purple', 'amber', 'green', 'slate']

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
    key: 'salary',
    group: 'work',
    icon: '💰',
    name: '薪酬计算器',
    desc: '输入年薪或月薪，算出每天 / 每时 / 每分 / 每秒薪酬，并以秒为单位实时累计当前收入；支持全年无休与标准工时两种口径。',
    tag: '本机计算',
    preview: '',
    path: '/pages/salary/salary'
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
    key: 'experience',
    group: 'thought',
    icon: '🗂️',
    name: '经验沉淀',
    desc: '站点经验沉淀库：按分类浏览、全文检索，原生排版阅读完整正文与表格。',
    tag: '站点同步',
    preview: '',
    path: '/pages/experience/experience'
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
  },
  {
    key: 'english',
    group: 'study',
    icon: '🔤',
    name: '每日英语',
    desc: '每天一句英文美句与一篇短美文，中英对照、重点词汇、配音跟读，可回看往期并在本机打卡。',
    tag: '站点同步',
    preview: '',
    path: '/pages/english/english'
  },
  {
    key: 'words',
    group: 'enjoyment',
    icon: '🎴',
    name: '背单词',
    desc: '随机抽雅思高频词，四选一猜中文释义，10 题一轮：连击计分、即时例句、错词回顾，离线也能玩。',
    tag: '本机词库',
    preview: '',
    path: '/pages/words/words'
  }
]

// 每个分组各拷一份工具对象，避免 setData 局部更新污染模块级常量；空分类作为占位保留
function buildSections(tools) {
  return GROUPS.map((group, index) => {
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

// 后台工具 id → 本地能力 key；后台改了工具名称时仍能识别，否则按名称匹配
const TOOL_IDS = {
  tool_workdays: 'workday',
  tool_countdown: 'countdown',
  tool_ruler: 'ruler',
  tool_mwnij7g3rhs19: 'thinking',
  tool_mwnijtrbig9av: 'experience',
  tool_mwnildjn1v14v: 'xiaobai',
  tool_mwnilsjhrou6x: 'english'
}

function findLocalTool(tool) {
  const id = String((tool && tool.id) || '')
  const name = String((tool && tool.name) || '').trim()
  const byId = TOOL_IDS[id] && TOOLS.find(item => item.key === TOOL_IDS[id])
  return byId || TOOLS.find(item => item.name === name)
}

// 只放行站内页面路径，后台新增的工具不会带来外链跳转
function safeRoute(route) {
  const value = String(route || '')
  return /^\/pages\/[A-Za-z0-9_/-]+$/.test(value) ? value : ''
}

// 默认接口只返回 visibleOnly 的分组，后台隐藏的分组 / 工具不会出现。
// 用 ?all=1 的全量配置判断「后台是否已经收录过」：收录过（哪怕隐藏或留空）就完全以接口为准；
// 后台从未收录过的本地新工具才补到对应分组——分组已渲染就追加，分组没渲染且后台也没建过才新建。
// 全量配置拿不到时不补充，隐藏优先。
function mergeLocalGroups(sections, prevSections, allGroups) {
  if (!Array.isArray(allGroups)) return sections
  const backendGroups = {}
  const backendTools = {}
  allGroups.forEach(group => {
    if (!group) return
    const label = String(group.name || '').trim().toUpperCase()
    if (label) backendGroups[label] = true
    ;(Array.isArray(group.tools) ? group.tools : []).forEach(tool => {
      const name = String((tool && tool.name) || '').trim()
      if (name) backendTools[name] = true
    })
  })

  const merged = sections.slice()
  const prevByLabel = {}
  const previewMap = {}
  ;(prevSections || []).forEach(section => {
    prevByLabel[String(section.label || '').trim().toUpperCase()] = section
    ;(section.tools || []).forEach(tool => {
      if (tool.preview) previewMap[tool.key] = tool.preview
    })
  })

  const renderedKeys = {}
  const renderedNames = {}
  const labelOf = section => String(section.label || '').trim().toUpperCase()
  merged.forEach(section => {
    ;(section.tools || []).forEach(tool => {
      renderedKeys[tool.key] = true
      renderedNames[String(tool.name || '').trim()] = true
    })
  })

  TOOLS.forEach(tool => {
    if (renderedKeys[tool.key] || renderedNames[tool.name] || backendTools[tool.name]) return
    const preset = GROUPS.find(group => group.key === tool.group)
    if (!preset) return
    let section = merged.find(item => labelOf(item) === preset.label)
    if (!section) {
      // 后台建过该分组却没渲染 = 后台隐藏了它，不补
      if (backendGroups[preset.label]) return
      section = {
        key: `local_${preset.key}`,
        label: preset.label,
        name: preset.name,
        tone: preset.tone,
        no: '',
        open: !!(prevByLabel[preset.label] && prevByLabel[preset.label].open),
        countText: '敬请期待',
        tools: []
      }
      merged.push(section)
    }
    section.tools.push(Object.assign({}, tool, { preview: previewMap[tool.key] || '' }))
    section.countText = `${section.tools.length} 项`
    renderedKeys[tool.key] = true
    renderedNames[tool.name] = true
  })

  merged.forEach((section, i) => {
    section.no = i + 1 < 10 ? `0${i + 1}` : String(i + 1)
  })
  return merged
}

// 接口只给出「显示哪些分组 / 工具」与名称，页面路径与预览能力由本地注册表提供。
// 服务端已过滤隐藏项，这里按返回顺序渲染，并保留展开状态与已算好的预览。
function normalizeSections(groups, prevSections) {
  const openMap = {}
  const openLabelMap = {}
  const previewMap = {}
  ;(prevSections || []).forEach(section => {
    openMap[section.key] = !!section.open
    // 随包默认分组用 work / life 作 key，接口用 group_work 等；按名称再兜一层，避免首次同步时展开状态丢失
    openLabelMap[String(section.label || '').trim().toUpperCase()] = !!section.open
    ;(section.tools || []).forEach(tool => {
      if (tool.preview) previewMap[tool.key] = tool.preview
    })
  })

  const visible = (Array.isArray(groups) ? groups : [])
    .filter(group => group && group.enabled !== false)
  return visible.map((group, gi) => {
    const item = group || {}
    const preset = GROUPS.find(g => g.label === String(item.name || '').trim().toUpperCase())
    const key = String(item.id || `group_${gi}`)
    const tools = (Array.isArray(item.tools) ? item.tools : [])
      .filter(raw => raw && raw.enabled !== false)
      .map((raw, ti) => {
        const tool = raw || {}
        const local = findLocalTool(tool)
        const toolKey = local ? local.key : String(tool.id || `tool_${gi}_${ti}`)
        return {
          key: toolKey,
          name: String(tool.name || (local && local.name) || '未命名工具'),
          desc: local ? local.desc : String(tool.desc || ''),
          icon: local ? local.icon : String(tool.icon || '◆'),
          tag: local ? local.tag : String(tool.badge || ''),
          path: local ? local.path : safeRoute(tool.route),
          preview: previewMap[toolKey] || ''
        }
      })
    return {
      key,
      label: String(item.name || (preset && preset.label) || ''),
      name: String(item.subtitle || (preset && preset.name) || ''),
      tone: preset ? preset.tone : TONES[gi % TONES.length],
      no: gi + 1 < 10 ? `0${gi + 1}` : String(gi + 1),
      open: !!openMap[key] || !!openLabelMap[String(item.name || '').trim().toUpperCase()],
      countText: tools.length ? `${tools.length} 项` : '敬请期待',
      tools
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
    sections: buildSections(TOOLS),
    toolTitle: 'TOOL LIST',
    toolsHint: ''
  },

  onLoad() {
    // 冷启动先用上次同步的配置渲染，避免闪一下随包的默认分组
    try {
      const cached = wx.getStorageSync(TOOLS_SYNC_KEY)
      if (cached && Array.isArray(cached.groups)) {
        this.applySections(cached.groups, cached.title, '', cached.allGroups)
      }
    } catch (err) {
      console.warn('[tools] 配置缓存读取失败', err)
    }
    this.refreshPreview()
    this.refreshThinkingPreview()
    this.refreshFinancePreview()
    this.refreshEnglishPreview()
    this.refreshExperiencePreview()
    this.refreshWordsPreview()
    this.refreshSalaryPreview()
    // 取到站点最新节假日数据后，用真实数据刷新预览
    holidayLoader.load().then(({ index }) => this.refreshPreview(index))
  },

  onShow() {
    // 每次进入都重新拉配置，后台隐藏分组 / 工具后无需发版即时生效
    this.syncTools()
    this.refreshPreview(this.cachedIndex)
    this.refreshThinkingPreview()
    this.refreshFinancePreview()
    this.refreshEnglishPreview()
    this.refreshExperiencePreview()
    this.refreshWordsPreview()
    this.refreshSalaryPreview()
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

  // 显示 / 隐藏完全由站点接口控制（文档 4.12 / 6.5）：visibleOnly 决定渲染，
  // ?all=1 的全量配置只用来判断后台是否已收录某个分组 / 工具，避免把隐藏项补回来
  syncTools() {
    return Promise.all([
      api.getMiniProgramTools(),
      api.getMiniProgramToolsAll().catch(() => null)
    ])
      .then(results => {
        const res = results[0]
        const allRes = results[1]
        if (!res || res.ok === false || !Array.isArray(res.groups)) {
          throw new Error('工具配置格式不正确')
        }
        // 必须确认拿到的是含隐藏项的全量配置，否则宁可不补充本地分组
        const allGroups = allRes && allRes.visibleOnly === false && Array.isArray(allRes.groups)
          ? allRes.groups
          : null
        try {
          wx.setStorageSync(TOOLS_SYNC_KEY, { groups: res.groups, allGroups, title: res.title })
        } catch (err) {
          console.warn('[tools] 配置缓存写入失败', err)
        }
        this.applySections(res.groups, res.title, '', allGroups)
      })
      .catch(err => {
        // 断网时用上次成功的配置；从未成功过则保留随包的默认列表
        console.warn('[tools] 配置同步失败，使用离线配置', err)
        let cached = null
        try {
          cached = wx.getStorageSync(TOOLS_SYNC_KEY)
        } catch (e) {
          cached = null
        }
        const hint = '离线配置 · 点击分类展开 ▾'
        if (cached && Array.isArray(cached.groups)) {
          this.applySections(cached.groups, cached.title, hint, cached.allGroups)
        } else {
          this.setData({ toolsHint: hint })
        }
      })
  },

  applySections(groups, title, hint, allGroups) {
    const sections = mergeLocalGroups(
      normalizeSections(groups, this.data.sections),
      this.data.sections,
      allGroups
    )
    const toolTitle = String(title || '').trim().slice(0, 24) || 'TOOL LIST'
    this.setData({ sections, toolTitle, toolsHint: hint || '' })
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
    // 后台把「小白学财经」设为隐藏时，不必再拉它的文章预览
    if (!this.findTool('xiaobai')) return
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

  // 每日英语预览：先读本机缓存，再静默同步今日一句
  refreshEnglishPreview() {
    const today = englishApi.todayStr()
    const cached = englishApi.getOfflineDaily(today)
    const show = daily => {
      if (!daily) return
      const quote = daily.quote && daily.quote.english
      const essay = daily.essay && daily.essay.title
      const text = quote || essay || ''
      const short = text.length > 18 ? `${text.slice(0, 18)}…` : text
      this.setPreview('english', short ? `今日 · ${short}` : '每日一句 + 今日美文')
    }
    if (cached) show(cached)
    englishApi.getDaily(today)
      .then(res => { if (res && res.data) show(res.data) })
      .catch(() => {
        if (!cached) this.setPreview('english', '每日一句 + 今日美文 · 联网后可见')
      })
  },

  // 经验沉淀预览：先读本机缓存立即显示，再静默同步站点最新列表
  refreshExperiencePreview() {
    const cached = experienceApi.getOfflineExperiences()
    const show = total => {
      this.setPreview('experience', `共 ${total} 篇经验 · 分类浏览 / 全文检索`)
    }
    if (cached.total) show(cached.total)
    experienceApi.getExperiences()
      .then(res => {
        const data = res && res.data
        if (data && Array.isArray(data.items) && data.items.length) {
          show(Number(data.total) || data.items.length)
        }
      })
      .catch(() => {
        if (!cached.total) this.setPreview('experience', '经验沉淀 · 联网后可浏览全部经验')
      })
  },

  // 背单词预览：词库与成绩都在本机，直接读统计，不发起请求
  refreshWordsPreview() {
    this.setPreview('words', ieltsGame.previewText())
  },

  // 薪酬计算器预览：年薪与口径都存在本机，直接换算每秒金额
  refreshSalaryPreview() {
    this.setPreview('salary', salaryCalc.previewText())
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
    if (path) {
      wx.navigateTo({ url: path })
    } else {
      wx.showToast({ title: '该工具暂未开放', icon: 'none' })
    }
  },

  onShareAppMessage() {
    return { title: '实用小工具 · 鲁力铭', path: '/pages/tools/tools' }
  }
})
