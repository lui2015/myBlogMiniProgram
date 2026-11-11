// 内容分类导览：首页与「作品」Tab 共用同一份配置
// section 对应开放 API 模块，用于从 /api/open 索引读取条数
const CATEGORIES = [
  {
    key: 'article', name: '文章', en: 'ARTICLES', icon: '📝',
    desc: '项目管理、研发效能与长文记录', unit: '篇',
    section: 'works', path: '/pages/works/works', tab: true, tone: 'cyan'
  },
  {
    key: 'album', name: '相册', en: 'ALBUMS', icon: '📷',
    desc: '旅行与日常影像，按主题成组', unit: '组',
    section: 'albums', path: '/pages/albums/albums', tab: false, tone: 'purple'
  },
  {
    key: 'video', name: '视频', en: 'VIDEOS', icon: '🎬',
    desc: '作品记录与视频分享', unit: '个',
    section: 'videos', path: '/pages/videos/videos', tab: false, tone: 'pink'
  },
  {
    key: 'poem', name: '诗词', en: 'POEMS', icon: '✒️',
    desc: '偶尔写几行，记录心境与风景', unit: '首',
    section: 'poems', path: '/pages/poems/poems', tab: false, tone: 'cyan'
  },
  {
    key: 'quote', name: '我的思考', en: 'THOUGHTS', icon: '💭',
    desc: '零散念头与阅读摘录', unit: '条',
    section: 'quotes', path: '/pages/quotes/quotes', tab: false, tone: 'purple'
  },
  {
    key: 'software', name: '软件', en: 'SOFTWARE', icon: '🧩',
    desc: '做过的网页与应用小工具', unit: '个',
    section: 'softwares', path: '/pages/softwares/softwares', tab: false, tone: 'pink'
  }
]

function byKey(key) {
  return CATEGORIES.filter(item => item.key === key)[0] || null
}

function bySection(section) {
  return CATEGORIES.filter(item => item.section === section)[0] || null
}

// 生成可直接渲染的导览卡片（编号、条数文案、是否当前页）
function withCounts(counts) {
  const source = counts || {}
  return CATEGORIES.map((item, index) => {
    const raw = Number(source[item.key])
    const count = isFinite(raw) && raw > 0 ? Math.floor(raw) : 0
    return Object.assign({}, item, {
      no: ('0' + (index + 1)).slice(-2),
      count,
      countText: `${count} ${item.unit}`,
      isCurrent: !!item.tab
    })
  })
}

// /api/open 索引里的 sections 带 count，一次请求即可补齐所有分类数量
function countsFromIndex(indexRes) {
  const counts = {}
  const sections = (indexRes && indexRes.sections) || []
  sections.forEach(section => {
    const item = bySection(section.key)
    if (item) counts[item.key] = Number(section.count) || 0
  })
  return counts
}

module.exports = {
  CATEGORIES,
  byKey,
  bySection,
  withCounts,
  countsFromIndex
}
