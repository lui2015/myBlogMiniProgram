App({
  globalData: {
    baseUrl: 'https://www.luliming.xyz'
  },

  onLaunch() {
    // 显式开启右上角胶囊的「转发给朋友」；各页面底部另有可见的分享按钮
    try {
      wx.showShareMenu({ menus: ['shareAppMessage'] })
    } catch (err) {
      console.warn('[share] 开启转发菜单失败', err)
    }
    console.log('博客小程序启动，数据源：开放 API')
  }
})
