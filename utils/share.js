// 转发（分享）能力：统一开启右上角胶囊菜单，并输出可诊断的运行环境信息。
// 胶囊里「转发给朋友」置灰时，先在开发者工具 / 真机调试 Console 看 [share] 日志：
// envVersion=develop / trial 是开发版或体验版，release 才是线上正式版。
let warned = false

function envVersion() {
  try {
    const info = wx.getAccountInfoSync && wx.getAccountInfoSync()
    return (info && info.miniProgram && info.miniProgram.envVersion) || 'unknown'
  } catch (err) {
    return 'unknown'
  }
}

function enableShareMenu() {
  const env = envVersion()
  try {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage'],
      success() { console.log('[share] showShareMenu ok, envVersion=' + env) },
      fail(err) { console.warn('[share] showShareMenu fail, envVersion=' + env, err) }
    })
  } catch (err) {
    console.warn('[share] showShareMenu 调用异常', err)
  }
  if (!warned && (env === 'develop' || env === 'trial')) {
    warned = true
    console.warn('[share] 当前为开发版 / 体验版，右上角「转发给朋友」可能置灰；请用正式版或页面内分享按钮验证')
  }
  return env
}

module.exports = { enableShareMenu, envVersion }
