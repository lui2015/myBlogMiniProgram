// 点菜助手：按人数与场合推算菜数与结构（纯数据逻辑，不联网、不上传）
const STORAGE_KEY = 'dining_helper_v1'
const TABLE_SIZE = 10
const MAX_PEOPLE = 60
const DEFAULT_PEOPLE = 4

// bonus：每桌在「人数 = 热菜数」基础上加几道；cold：凉菜基数偏移
const SCENES = [
  { key: 'daily', name: '日常便餐', hint: '吃饱吃好 · 不浪费', bonus: 0, cold: -1 },
  { key: 'gathering', name: '朋友聚餐', hint: '热闹一点 · 多尝几样', bonus: 1, cold: 0 },
  { key: 'banquet', name: '宴请请客', hint: '冷热汤主食齐全', bonus: 2, cold: 1 }
]

const clamp = (num, min, max) => Math.max(min, Math.min(max, num))

function sceneByKey(key) {
  return SCENES.find(item => item.key === key) || SCENES[0]
}

// 只接受正整数人数，非法输入返回 0（页面据此显示空态）
function toPeople(value) {
  const raw = String(value == null ? '' : value).trim()
  if (!/^\d+$/.test(raw)) return 0
  const num = Number(raw)
  if (!isFinite(num) || num < 1) return 0
  return Math.min(Math.floor(num), MAX_PEOPLE)
}

function plan(people, sceneKey) {
  const count = toPeople(people)
  const scene = sceneByKey(sceneKey)
  if (!count) return null

  // 超过一桌时先拆桌，每桌按同一份清单点，避免 20 人直接点 20 道菜
  const tables = Math.ceil(count / TABLE_SIZE)
  const tablePeople = Math.ceil(count / tables)

  const hot = clamp(tablePeople + scene.bonus, 2, 12)
  const meat = clamp(Math.round(hot * 0.6), 1, hot - 1)
  const veggie = hot - meat
  const cold = clamp(Math.floor(tablePeople / 4) + scene.cold, 0, 4)
  const soup = scene.key === 'daily' && tablePeople <= 3 ? 0 : 1
  const staple = scene.key === 'daily' && tablePeople <= 4
    ? 0
    : (tablePeople >= 9 ? 2 : tablePeople >= 3 ? 1 : 0)

  const perTablePlan = {
    hot, meat, veggie, cold, soup, staple,
    all: hot + cold + soup + staple
  }
  const total = {}
  Object.keys(perTablePlan).forEach(key => { total[key] = perTablePlan[key] * tables })

  const categories = [
    { key: 'meat', name: '荤菜 · 主菜', count: total.meat, hint: '鸡鸭鱼肉 / 海鲜 / 蛋类，做法错开，留一道拿得出手的硬菜' },
    { key: 'veggie', name: '素菜 · 蔬菜', count: total.veggie, hint: '绿叶菜 / 菌菇 / 豆制品，至少一道清爽解腻的' },
    { key: 'cold', name: '凉菜 · 开胃', count: total.cold, hint: '先上桌垫场，食材别跟热菜重复' },
    { key: 'soup', name: '汤 · 羹', count: total.soup, hint: '一桌一汤，清淡为主，别和主菜同料' },
    { key: 'staple', name: '主食 · 点心', count: total.staple, hint: '米饭之外的面点 / 饼 / 炒饭，放在最后点' }
  ]

  const commonTips = [
    '荤素约 6:4，热菜里留 1–2 道清淡的，别满桌重油重辣。',
    '同一食材只出现一次：点了鱼就别再点鱼丸汤，点了鸡就少点鸡翅。',
    '做法分散到炒 / 蒸 / 炖 / 凉拌，上菜节奏更顺，后厨也不打架。',
    '有老人或小孩时留一道软烂、一道不辣；不确定口味先问忌口。',
    '拿不准就先按清单下限点，吃到中途再补，比一开始就点多好收拾。'
  ]
  const sceneTips = {
    daily: [
      '一人食优先「一荤一素 + 主食」，凑数多点不如吃得干净。',
      '2–3 人按「人数 = 热菜数」就够，汤和主食看饭量再加。'
    ],
    gathering: [
      '在人数基础上多留 1 道招牌菜，给「大家都想尝」的那道留位置。',
      '先点 1 道凉菜垫桌，等齐人再补热菜，不容易点多。'
    ],
    banquet: [
      '凉菜先上、热菜居中、汤和主食收尾，顺序比数量更显体面。',
      '先定一道硬菜（整鱼 / 牛排 / 蟹）当主菜，其余围着它配。'
    ]
  }
  const tips = (sceneTips[scene.key] || []).concat(commonTips)
  if (tables > 1) {
    tips.unshift(`按 ${TABLE_SIZE} 人一桌拆成 ${tables} 桌，每桌照同一份清单点，别按总人数堆菜。`)
  }

  const formula = `每桌 ${tablePeople} 人 ${scene.bonus ? `+ ${scene.bonus} 道（${scene.name}）` : `（${scene.name}不加菜）`} = ${hot} 道热菜 · 共 ${tables} 桌`
  const summary = `${count} 人 · ${scene.name} · 建议共 ${total.all} 道菜${tables > 1 ? `（${tables} 桌）` : ''}`

  return {
    people: count, scene, tables, tablePeople,
    perTablePlan, total, categories, tips, formula, summary
  }
}

// 复制给朋友的纯文本清单，不含任何用户输入之外的内容
function textPlan(result) {
  if (!result) return ''
  const lines = [
    `点菜清单 · ${result.people} 人 / ${result.scene.name}`,
    `${result.summary}`,
    result.formula,
    ''
  ]
  result.categories.forEach(item => {
    lines.push(`· ${item.name}：${item.count ? `${item.count} 道` : '可不点'} —— ${item.hint}`)
  })
  lines.push('', '搭配原则：')
  result.tips.forEach((tip, i) => lines.push(`${i + 1}. ${tip}`))
  return lines.join('\n')
}

function readSettings() {
  const fallback = { people: DEFAULT_PEOPLE, scene: SCENES[0].key }
  try {
    const raw = wx.getStorageSync(STORAGE_KEY)
    if (!raw || typeof raw !== 'object') return fallback
    return {
      people: toPeople(raw.people) || DEFAULT_PEOPLE,
      scene: sceneByKey(raw.scene).key
    }
  } catch (err) {
    return fallback
  }
}

function saveSettings(settings) {
  const next = {
    people: toPeople(settings && settings.people) || DEFAULT_PEOPLE,
    scene: sceneByKey(settings && settings.scene).key
  }
  try {
    wx.setStorageSync(STORAGE_KEY, next)
  } catch (err) {
    // 本机存储不可用时推荐结果仍然有效，只是下次不回填
  }
  return next
}

function previewText() {
  const settings = readSettings()
  const result = plan(settings.people, settings.scene)
  if (!result) return '输入人数 · 推荐该点几道菜'
  return `${settings.people} 人 · ${result.scene.name} · 建议 ${result.total.all} 道菜`
}

module.exports = {
  SCENES,
  TABLE_SIZE,
  MAX_PEOPLE,
  DEFAULT_PEOPLE,
  sceneByKey,
  toPeople,
  plan,
  textPlan,
  readSettings,
  saveSettings,
  previewText
}
