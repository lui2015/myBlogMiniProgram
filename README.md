# 博客小程序（开放 API 版）

个人主体小程序**不支持 `web-view`**，因此本项目不使用网页嵌入，改为**调用博客开放 API，用原生页面渲染全部内容**，并提供原生实用工具。

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

- `request` 用于调用所有 `/api/open/...` 接口，以及站点节假日数据 `/workday/holidays.json`。
- `downloadFile` 用于 `wx.previewImage` 预览照片、文章封面、相册图片、软件作品封面。
- 站点图片里还有 `picsum.photos`（示例占位图），如后续换成其他图床，需同步加入白名单。
- 域名必须 HTTPS、已备案、不带端口和路径。
- **开发阶段**可在微信开发者工具「详情 → 本地设置」勾选 **不校验合法域名** 临时调试。

## 页面与数据模块

| 页面 | 路径 | 使用的接口模块 |
|------|------|----------------|
| 首页 | `pages/index/index` | `hero` `photos` `poems` `myskills` `works` `softwares` `quotes` `albums` |
| 作品（分类导览 + 全站搜索 + 文章） | `pages/works/works` | 5 类作品（`q` 并发搜索）+ `/api/open` 索引 + `works`（分类筛选） |
| 文章详情 | `pages/detail/detail` | `works/{id}`，Markdown 正文解析渲染 |
| 软件作品 | `pages/softwares/softwares` | `softwares`（网格 + 详情弹层） |
| 技能作品 | `pages/myskills/myskills` | `myskills`（全量列表 + 复制地址） |
| 工具集合 | `pages/tools/tools` | 本地工具入口 |
| 工作日计算器 | `pages/workday/workday` | `/workday/holidays.json` + 内置兜底数据 |
| 大事件倒计时 | `pages/countdown/countdown` | 本地存储 + 工作日计算 |
| 尺子 | `pages/ruler/ruler` | 无接口，校准值存本机 |
| 相册列表 | `pages/albums/albums` | `albums` |
| 相册详情 | `pages/album/album` | `albums/{id}` |
| 诗词 | `pages/poems/poems` | `poems`（`q` 搜索） |
| 我的思考 | `pages/quotes/quotes` | `quotes`（分页加载，共 146 条） |
| 关于 | `pages/about/about` | `about`（单例对象）+ `hero`（头像兜底） |

底部 TabBar：**首页 / 作品 / 工具 / 关于**。相册已改为二级页面，从首页或「作品」Tab 的分类导览进入。

> 「关于我」的姓名、职位、简介、头像、社交链接、SKILL TREE、TIMELINE 全部来自 `GET /api/open/about`（文档 4.10）。请求带 `_t` 时间戳防缓存，页面**每次显示（含 Tab 切回）**与下拉刷新都会重新拉取，底部显示同步时间与「刷新数据」按钮；`utils/about.js` 只做字段归一化，不内置任何静态内容，后台把字段清空时小程序同步清空。接口暂时不可用时显示上次成功同步的数据并标注「当前离线」，从未成功过则显示错误与重试；头像优先 `about.avatar`，加载失败回退 `hero.avatarUrl`，再回退文字头像。

## 分类导览

5 个内容分类（文章 / 相册 / 诗词 / 我的思考 / 软件）统一由 `utils/categories.js` 维护：名称、英文、图标、引导文案、单位、目标路径与对应 API 模块；数量取自 `GET /api/open` 索引里各模块的 `count`。视频模块已按个人主体类目要求移除。

- **首页**：`CATEGORY GUIDE` 横向滑动卡片作为快捷引导，右上角「全部作品」进入作品 Tab。
- **作品 Tab**：2 列分类网格，点击非文章分类进入对应二级页；点击「文章」滚动到本页下方的文章列表（分类筛选保持不变）。
- **全站搜索**：作品 Tab 的搜索框并发查询 `works / albums / poems / quotes / softwares` 五个模块的 `q` 参数，结果按类型分组（每组最多 5 条，显示总条数）。文章 / 相册 / 软件进详情页，诗词 / 思考进对应列表页并带上同一关键词；「查看全部」同理，文章组则清空搜索回到本页列表。清空关键词恢复文章列表。搜索期间有防抖、过期结果丢弃，单个模块失败不影响其它类型。

## 首页文章作品（LATEST WORKS）

数据来自 `GET /api/open/works`，首页取最新 3 篇，以「左封面 + 右文字」的图文卡片展示：封面 `cover`（相对路径由 `utils/util.js` 补全）、渐变蒙层与序号角标，右侧为分类 / 日期、标题（最多 2 行）、简介（1 行）、标签与阅读时长。后台未配封面或图片加载失败时自动回退到 `NO COVER` 占位块，不会出现破图；点击卡片进入文章详情页。

## 首页技能作品（SKILLS）

数据来自 `GET /api/open/myskills`（10 项：`name` / `description` / `url`），与网站「SKILLS // 技能作品」同源，替换了原来的技能雷达进度条（`skills` 模块不再在小程序首页使用）。首页固定显示最新 5 项，右上角「查看全部 →」跳转到 `pages/myskills/myskills` 列表页（全量条目、完整描述、下拉刷新、错误重试）；每行展示名称与单行描述。小程序不能打开站外网页，且技能地址多为 GitHub 链接，因此点击条目只做中性的「复制技能地址」（仅允许 http/https），页面不展示、不跳转外链。

## 首页软件作品（SOFTWARE）

数据来自 `GET /api/open/softwares`（12 项），封面为站内相对路径，由 `utils/util.js` 补全为完整 HTTPS 地址。

- 首页：横向滑动卡片，展示封面、名称、简介、「软件」角标；右上角「查看全部」进入列表页。
- 点击单张卡片进入列表页并自动展开该作品详情弹层（大图 + 完整介绍 + 复制地址）。
- 小程序不能打开站外网页，因此作品地址只做中性「复制」，不引导跳转浏览器。

**审核提示**：站点软件作品多为股票 / 基金 / 投资类内容，属于个人主体**未开放的金融类目**，放在首页会显著增加被拒风险。提审前把 `utils/config.js` 中的 `showSoftwareOnHome` 改为 `false` 即可临时隐藏首页该模块（数据接口与列表页仍保留）。若要长期展示，建议改用企业主体并准备相应资质，或在站点后台把这些作品替换为非金融类内容。

## 实用小工具

- **工作日计算器**：对齐网页版 `/workday/` 的核心能力——日期区间工作日统计、快捷区间（今天/本周/本月/本季度/今年）、N 个工作日推算（支持负数与常用值）、日历可视化、年度节假日一览（点击可回填计算器）。自动识别法定节假日与调休补班。
- **大事件倒计时**：对齐网页版 `/dajishi/` 的添加表单——事件名称、目标日期、自然日/工作日两种计算方式、12 个图标、卡片主题，支持删除确认。数据仅保存在本机 `wx.setStorageSync`，不做云端同步、无登录。
- **尺子**：屏幕刻度尺，支持厘米 / 英寸（1 mm 或 1/16 in 小格）、横向 / 竖向，主刻度带 `0 / 1 / 2…` 数字标注，拖动 A / B 双游标读出间距并可复制结果。点「全屏」会隐藏所有面板让尺子铺满视口，顶部保留结果、底部保留单位 / 方向 / 重置 / 复制；页面配置了 `pageOrientation: auto`，手机横放时会自动重新测量刻度。手机系统不提供屏幕 PPI，因此提供三种校准方式：实体尺量屏幕宽度自动换算、滑块微调（含 ±0.1 / ±1 步进）、银行卡 / 1 元硬币 / A4 纸参考线对齐；校准值由 `utils/ruler.js` 存本机。精度取决于校准结果，仅供日常估测。

工具集合页会显示本机实时计算出的预览（如「本周 5 个工作日」、尺子是否已校准）。节假日数据优先从站点 `holidays.json`（2024–2028）拉取，失败时回退到 `utils/holidays.js` 内置数据，断网也能用。尺子不联网、不申请任何权限。

## 目录结构

```
├── app.js / app.json / app.wxss      # 全局配置与公共样式
├── project.config.json               # 项目配置（AppID）
├── sitemap.json
├── images/                           # TabBar 图标
├── utils/
│   ├── api.js                        # wx.request 封装（只读）
│   ├── util.js                       # 图片地址补全 / 安全校验
│   ├── config.js                     # 展示开关（含提审开关）
│   ├── categories.js                 # 内容分类导览配置（首页 / 作品共用）
│   ├── markdown.js                   # Markdown → 结构化 blocks
│   ├── about.js                      # 「关于我」接口字段归一化（无静态内容）
│   ├── ruler.js                      # 尺子校准值本地存储
│   ├── workday.js                    # 日期 / 工作日计算纯函数
│   ├── holidays.js                   # 节假日内置兜底数据
│   └── holidayLoader.js              # 节假日数据加载与兜底
└── pages/                            # 14 个页面
```

## 安全说明

- **只读展示**：只调用 `GET` 接口，不含任何 `POST/PUT/DELETE`；小程序端不写入站点数据。
- **不含凭据**：项目里没有管理员账号密码、AppSecret 等敏感信息。
- 正文由结构化 blocks 交给原生组件渲染，不拼接 HTML 字符串；外部颜色值经格式校验后才用于样式。
- 社交地址、作品地址仅做中性的「复制」交互，不引导跳转浏览器或第三方平台；「关于我」的社交链接来自 `about.socialLinks`，复制前会去掉 `mailto:` 前缀并过滤危险协议。
- 倒计时事件、尺子校准值仅存本机、不上传，不构成用户发布内容；尺子不联网、不申请定位或相机等权限；「关于我」不含软件下载与二维码引流。金融投资类内容仅集中在首页 SOFTWARE 模块，可通过 `utils/config.js` 一键隐藏。
- **不含视频服务**：首页视频区块、视频列表页、`<video>` 播放组件及 `videos` 接口调用已全部移除，分类导览与全站搜索也不再包含视频类型，避免个人主体小程序涉及未开放的视频服务类目。

## 已知数据情况

- 部分图片字段是站内相对路径（`/uploads/...`、`/images/...`，如 `about.avatar`），`utils/util.js` 会自动补全为完整 HTTPS 地址。
- `about.avatar` / `hero.avatarUrl` 等图片若加载失败，会回退显示 `avatarText` 文字头像；`GET /api/open/about` 失败时「关于我」显示上次成功同步的内容（或错误重试页），不会回退到写死的旧数据。其它页面在 `onLoad` 拉取数据，后台修改后下拉刷新即可同步。

## 使用

1. 用微信开发者工具导入本目录。
2. 按上文配置服务器域名（或先勾选不校验合法域名）。
3. 编译预览；下拉刷新可重新拉取数据。
