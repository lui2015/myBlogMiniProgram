# 博客小程序（开放 API 版）

个人主体小程序**不支持 `web-view`**，因此本项目不使用网页嵌入，改为**调用博客开放 API，用原生页面渲染全部内容**。

- 站点：https://www.luliming.xyz
- 接口文档：https://github.com/lui2015/PersonalBlog/blob/main/docs/OPEN_API.md
- 数据实时读取，站点后台更新内容后小程序刷新即可生效

## 必做配置：服务器域名

登录 [微信公众平台](https://mp.weixin.qq.com/) → **开发管理 → 开发设置 → 服务器域名**（个人小程序也有这一项）：

| 类型 | 域名 |
|------|------|
| request 合法域名 | `https://www.luliming.xyz` |
| downloadFile 合法域名 | `https://www.luliming.xyz`、`https://picsum.photos` |

说明：

- `request` 用于调用所有 `/api/open/...` 接口。
- `downloadFile` 用于 `wx.previewImage` 预览照片、封面、二维码。
- 站点图片里还有 `picsum.photos`（示例占位图），如后续换成其他图床，需同步加入白名单。
- 域名必须 HTTPS、已备案、不带端口和路径。
- **开发阶段**可在微信开发者工具「详情 → 本地设置」勾选 **不校验合法域名** 临时调试。

## 页面与数据模块

| 页面 | 路径 | 使用的接口模块 |
|------|------|----------------|
| 首页 | `pages/index/index` | `hero` `photos` `poems` `videos` `skills` `works` `quotes` `albums` |
| 文章列表 | `pages/works/works` | `works`（`q` 搜索 + 分类筛选） |
| 文章详情 | `pages/detail/detail` | `works/{id}`，Markdown 正文解析渲染 |
| 相册列表 | `pages/albums/albums` | `albums` |
| 相册详情 | `pages/album/album` | `albums/{id}` |
| 视频 | `pages/videos/videos` | `videos` |
| 诗词 | `pages/poems/poems` | `poems`（`q` 搜索） |
| 我的思考 | `pages/quotes/quotes` | `quotes`（分页加载，共 146 条） |
| 关于 | `pages/about/about` | `hero` `stats` `softwares` `myskills` `socialMedia` |

底部 TabBar：首页 / 文章 / 相册 / 关于。

## 目录结构

```
├── app.js / app.json / app.wxss      # 全局配置与公共样式
├── project.config.json               # 项目配置（AppID）
├── sitemap.json
├── images/                           # TabBar 图标
├── utils/
│   ├── api.js                        # wx.request 封装（只读）
│   ├── util.js                       # 图片地址补全 / 安全校验
│   └── markdown.js                   # Markdown → 结构化 blocks
└── pages/                            # 9 个页面
```

## 安全说明

- **只读展示**：只调用 `GET /api/open/...`，不含任何 `POST/PUT/DELETE`。
- **不含凭据**：项目里没有管理员账号密码、AppSecret 等敏感信息；写操作请留在管理员端。个人主体小程序含「用户发布内容」能力可能影响审核。
- 正文由结构化 blocks 交给原生组件渲染，不拼接 HTML 字符串；外部颜色值经格式校验后才用于样式，避免注入。
- 站外网页链接一律通过「复制链接」引导到浏览器打开。

## 已知数据情况

- `videos` 的 `src` 字段目前均为空字符串，视频页会降级为预览封面并提示；站点补齐播放地址后，小程序会自动启用内置播放器，无需改代码。
- 部分图片字段是站内相对路径（`/uploads/...`、`/images/...`），`utils/util.js` 会自动补全为完整 HTTPS 地址。
- `hero.avatarUrl` 等图片若加载失败，会回退显示 `avatarText` 文字头像。

## 使用

1. 用微信开发者工具导入本目录。
2. 按上文配置服务器域名（或先勾选不校验合法域名）。
3. 编译预览；下拉刷新可重新拉取数据。
