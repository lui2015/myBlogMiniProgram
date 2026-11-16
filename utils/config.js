// 小程序端展示开关
module.exports = {
  // 首页 SOFTWARE 模块开关，默认展示。
  // 站点软件作品多为股票 / 基金 / 投资类内容，个人主体小程序提审时
  // 可临时改为 false 隐藏首页该模块（数据接口与软件作品列表页不受影响）。
  showSoftwareOnHome: true,

  // 小白财经数据源：
  // 'public'（默认）：站点公开只读接口 /XiaoBaiFinance/api/...，无需密钥、开箱即用
  // 'open'：开放平台 v1 接口（文档 /api/open/docs?doc=data），需要 API Key
  //   正式发布请把 xiaoBaiProxyBase 指向自己的服务端代理（由代理注入密钥），
  //   不要把明文密钥打包进小程序；xiaoBaiApiKey 仅供本地调试使用。
  xiaoBaiSource: 'public',
  xiaoBaiProxyBase: '',
  xiaoBaiApiKey: '',

  // 财经科普内容在个人主体小程序提审时可能有类目风险，可临时改为 false 隐藏入口
  showXiaoBaiTool: true
}
