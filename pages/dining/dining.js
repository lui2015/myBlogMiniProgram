const dining = require('../../utils/dining')

Page({
  data: {
    peopleInput: '',
    people: 0,
    sceneKey: 'daily',
    scenes: dining.SCENES,
    quickPeople: [2, 4, 6, 8, 10, 12],
    maxPeople: dining.MAX_PEOPLE,
    hasPlan: false,
    plan: null,
    categories: [],
    tips: []
  },

  onLoad() {
    const settings = dining.readSettings()
    this.setData({ peopleInput: String(settings.people) })
    this.apply(settings.people, settings.scene)
  },

  apply(people, sceneKey) {
    const key = dining.sceneByKey(sceneKey).key
    const result = dining.plan(people, key)
    this.setData({
      people,
      sceneKey: key,
      hasPlan: !!result,
      plan: result,
      categories: result ? result.categories.map(item => Object.assign({}, item, {
        countText: item.count ? `${item.count} 道` : '可不点'
      })) : [],
      tips: result ? result.tips.map((text, i) => ({
        no: i + 1 < 10 ? `0${i + 1}` : String(i + 1),
        text
      })) : []
    })
    if (result) dining.saveSettings({ people, scene: key })
  },

  onPeopleInput(e) {
    const raw = String(e.detail.value || '')
    const people = dining.toPeople(raw)
    // 超过上限时回填钳制后的值，避免输入框与结果不一致
    this.setData({ peopleInput: people ? String(people) : raw })
    this.apply(people, this.data.sceneKey)
  },

  stepPeople(e) {
    const delta = Number(e.currentTarget.dataset.delta)
    if (delta !== 1 && delta !== -1) return
    const base = this.data.people || 0
    const people = Math.max(1, Math.min(dining.MAX_PEOPLE, base + delta))
    this.setData({ peopleInput: String(people) })
    this.apply(people, this.data.sceneKey)
  },

  onQuickTap(e) {
    const people = dining.toPeople(e.currentTarget.dataset.people)
    if (!people) return
    this.setData({ peopleInput: String(people) })
    this.apply(people, this.data.sceneKey)
  },

  onSceneTap(e) {
    const picked = dining.SCENES.find(item => item.key === e.currentTarget.dataset.key)
    if (!picked || picked.key === this.data.sceneKey) return
    this.apply(this.data.people, picked.key)
  },

  copyPlan() {
    if (!this.data.plan) return
    wx.setClipboardData({ data: dining.textPlan(this.data.plan) })
  },

  backToTools() {
    if (getCurrentPages().length > 1) wx.navigateBack()
    else wx.switchTab({ url: '/pages/tools/tools' })
  },

  onShareAppMessage() {
    return { title: '点菜助手 · 按人数算该点几道菜', path: '/pages/dining/dining' }
  }
})
