const share = require('./utils/share')

App({
  globalData: {
    baseUrl: 'https://www.luliming.xyz'
  },

  onLaunch() {
    // 显式开启右上角胶囊的「转发给朋友」；各页面底部另有可见的分享按钮
    const env = share.enableShareMenu()
    console.log('博客小程序启动，数据源：开放 API，envVersion=' + env)
  },

  onShow() {
    // 从后台切回时再开一次：部分机型在启动阶段调用 showShareMenu 不生效
    share.enableShareMenu()
  }
})
