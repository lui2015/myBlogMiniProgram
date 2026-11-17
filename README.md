# 博客小程序（开放 API 版）

个人主体小程序**不支持 `web-view`**，因此本项目不使用网页嵌入，改为**调用博客开放 API，用原生页面渲染全部内容**，并提供原生实用工具。

- 站点：https://www.luliming.xyz
- 接口文档：https://github.com/lui2015/PersonalBlog/blob/main/docs/OPEN_API.md
- 思维模型接口文档：https://www.luliming.xyz/thinkingModel/platform/docs
- 小白财经接口文档：https://www.luliming.xyz/XiaoBaiFinance/api/open/docs?doc=data
- 数据实时读取，站点后台更新内容后小程序刷新即可生效

## 必做配置：服务器域名

登录 [微信公众平台](https://mp.weixin.qq.com/) → **开发管理 → 开发设置 → 服务器域名**（个人小程序也有这一项）：

| 类型 | 域名 |
|------|------|
| request 合法域名 | `https://www.luliming.xyz` |
| downloadFile 合法域名 | `https://www.luliming.xyz`、`https://picsum.photos` |

说明：

- `request` 用于调用所有 `/api/open/...` 接口、站点节假日数据 `/workday/holidays.json`、思维模型只读接口 `/thinkingModel/api/v1/...`，以及小白财经只读接口 `/XiaoBaiFinance/api/...`（或开放平台 v1 `/XiaoBaiFinance/api/open/v1/...`）。
- `downloadFile` 用于 `wx.previewImage` 预览照片、文章封面、相册图片、软件作品封面、自媒体二维码、技能证书，以及 `<image src>` 加载小白财经的文章分享图（SVG）。若 `xiaoBaiProxyBase` 指向自有代理域名，也需把该域名加入白名单。
- 站点图片里还有 `picsum.photos`（示例占位图），如后续换成其他图床，需同步加入白名单。
- 域名必须 HTTPS、已备案、不带端口和路径。
- **开发阶段**可在微信开发者工具「详情 → 本地设置」勾选 **不校验合法域名** 临时调试。

## 页面与数据模块

| 页面 | 路径 | 使用的接口模块 |
|------|------|----------------|
| 首页 | `pages/index/index` | `hero` `albums`（相框照片 + 分类数量）`photos`（仅兜底）`poems` `myskills` `works` `softwares` `quotes` |
| 作品（分类导览 + 全站搜索 + 文章） | `pages/works/works` | 6 类作品（`q` 并发搜索）+ `/api/open` 索引 + `works`（分类筛选） |
| 文章详情 | `pages/detail/detail` | `works/{id}`，Markdown 正文解析渲染 |
| 软件作品 | `pages/softwares/softwares` | `softwares`（网格 + 详情弹层） |
| 技能作品 | `pages/myskills/myskills` | `myskills`（全量列表 + `q` 搜索 + 复制地址） |
| 工具集合 | `pages/tools/tools` | 本地工具入口，按 WORK / LIFE / THOUGHT / STUDY / ENJOYMENT / OTHER 六类折叠分组 |
| 工作日计算器 | `pages/workday/workday` | `/workday/holidays.json` + 内置兜底数据 |
| 大事件倒计时 | `pages/countdown/countdown` | 本地存储 + 工作日计算 |
| 尺子 | `pages/ruler/ruler` | 无接口，校准值存本机 |
| 思维模型库 | `pages/thinking/thinking` | `/thinkingModel/api/v1/models`（分页拉全量）`/categories` `/stats`，搜索用 `q` |
| 思维模型详情 | `pages/thinkingDetail/thinkingDetail` | `/thinkingModel/api/v1/models/{slug}` |
| 小白财经 | `pages/xiaobai/xiaobai` | `/XiaoBaiFinance/api/articles`（分页拉全量）`/categories` |
| 小白财经详情 | `pages/xiaobaiDetail/xiaobaiDetail` | `/XiaoBaiFinance/api/articles/{id}` + `/articles/{id}/image` 分享图；默认图片 / 网页原版 HTML / 纯文本 |
| 相册列表 | `pages/albums/albums` | `albums` |
| 相册详情 | `pages/album/album` | `albums/{id}` |
| 诗词 | `pages/poems/poems` | `poems`（`q` 搜索） |
| 我的思考 | `pages/quotes/quotes` | `quotes`（分页加载，共 146 条） |
| 关于 | `pages/about/about` | `about`（单例对象）+ `hero`（头像兜底）+ `socialMedia`（二维码卡片） |

底部 TabBar：**首页 / 作品 / 工具 / 关于**。相册已改为二级页面，从首页或「作品」Tab 的分类导览进入。

> 「关于我」的姓名、职位、简介、头像、SKILL TREE、TIMELINE 全部来自 `GET /api/open/about`（文档 4.10）；底部 SOCIAL MEDIA 卡片来自 `GET /api/open/socialMedia`。请求带 `_t` 时间戳防缓存，页面**每次显示（含 Tab 切回）**与下拉刷新都会重新拉取，底部显示同步时间与「刷新数据」按钮；`utils/about.js` 只做字段归一化，不内置任何静态内容，后台把字段清空时小程序同步清空。接口暂时不可用时显示上次成功同步的数据并标注「当前离线」，从未成功过则显示错误与重试；头像优先 `about.avatar`，加载失败回退 `hero.avatarUrl`，再回退文字头像。

## SKILL TREE 技能标签

`about.skillTree` 已升级为 `{ id, name, certificate }[]`（线上当前 8 项），`utils/about.js` 同时兼容历史 `string[]`。标签按接口顺序以 4 列展示；`certificate` 非空时标签右上角显示 📜，点击用 `wx.previewImage` 预览证书大图，空值则不响应。证书地址由 `utils/util.js` 补全并过滤危险协议。

## 关于我底部区块

- **SOCIAL MEDIA**：2 列卡片，数据来自 `GET /api/open/socialMedia`（接口当前 6 个平台：`name` / `icon` / `desc` / `qr` / `color`）。点击卡片用 `wx.previewImage` 预览对应二维码（可长按识别），不跳转第三方平台；`qr` 为站内相对路径时由 `utils/util.js` 补全，`color` 仅接受 `#rrggbb` 并用于卡片顶部描边。卡片数量与顺序完全跟随接口。
- **VISIT BLOG**：展示站点地址，优先取接口的 `blogUrl` / `website`，否则用 `utils/api.js` 的 `BASE_URL`；点击复制，不引导打开浏览器。

## 分类导览

6 个内容分类（文章 / 相册 / 诗词 / 我的思考 / 软件 / 技能）统一由 `utils/categories.js` 维护：名称、英文、图标、引导文案、单位、目标路径与对应 API 模块；数量取自 `GET /api/open` 索引里各模块的 `count`。「技能」对应 `myskills` 模块与 `pages/myskills/myskills` 列表页；视频模块已按个人主体类目要求移除。

- **首页**：`CATEGORY GUIDE` 横向滑动卡片作为快捷引导，右上角「全部作品」进入作品 Tab；卡片数量文案由 `guides.length` 动态生成。
- **作品 Tab**：2 列分类网格，点击非文章分类进入对应二级页；点击「文章」滚动到本页下方的文章列表（分类筛选保持不变）。
- **全站搜索**：作品 Tab 的搜索框并发查询 `works / albums / poems / quotes / softwares / myskills` 六个模块的 `q` 参数，结果按类型分组（每组最多 5 条，显示总条数）。文章 / 相册 / 软件进详情页，诗词 / 思考 / 技能进对应列表页并带上同一关键词；「查看全部」同理，文章组则清空搜索回到本页列表。清空关键词恢复文章列表。搜索期间有防抖、过期结果丢弃，单个模块失败不影响其它类型。

## 首页「查看更多」入口

- 照片、文章、诗词、思考四个区块标题栏右侧的「查看更多 →」复用 `utils/categories.js` 的路径：照片 → `pages/albums/albums`（相册列表），文章 → `pages/works/works`（作品 Tab，用 `switchTab`），诗词 → `pages/poems/poems`，思考 → `pages/quotes/quotes`。
- 诗词卡片「⟳ 换一首」与思考卡片「⟳ 换一句」在本页已加载的列表里随机切换，并避免连续显示同一条；数据来自 `poems` / `quotes` 接口，下拉刷新可重新拉取。

## 首页照片相框（PHOTO FRAME）

与「查看更多 →」进入的相册页同源，数据来自 `GET /api/open/albums`：摊平各相册的 `photos`（相册内无照片时用 `cover`），最多取 9 张；`src` 为站内相对路径时由 `utils/util.js` 补全，标题取照片标题、缺省回退相册名。后台在「摄影相册」里增删照片后，首页**切回本 Tab 或下拉刷新**即同步，无需再单独维护「首页照片」模块。`albums` 请求失败时才回退 `GET /api/open/photos`（站点当前的 `picsum` 示例图）。点击相框用 `wx.previewImage` 预览当前批次全部图片。

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
- **思维模型**：对齐网页版 `/thinkingModel/` 的模型库——191 个模型 / 10 大分类 / 难度星级，每日一模型（按日期稳定选取，可「换一个」）、关键词搜索、分类与难度筛选、分页加载、我的收藏。数据走站点公开只读接口 `/thinkingModel/api/v1/`：列表按 `limit=100` 分页拉全量并缓存 24 小时，搜索用服务端 `q`（可匹配介绍等精简列表没有的字段），失败时退回本机缓存过滤；详情页读 `/models/{slug}`，渲染通俗介绍、核心洞察、记忆口诀、适用场景 / 步骤 / 误区 / 搭配、实战案例、延伸阅读与关联模型，可收藏、复制书名、跳转关联模型、分享直达详情。封装在 `utils/thinkingApi.js`，收藏仅存本机。
- **小白财经**：对齐网页版 `/XiaoBaiFinance/` 的文章库——132 篇财经知识漫画、7 大分类（含子分类）、标题/摘要搜索、最新/最多阅读排序、分页加载、我的收藏。列表页按 `size=50` 分页拉全量并缓存；详情页读 `/articles/{id}` 与 `/articles/{id}/image`，**默认调用图片接口以图片形式展示**（1080×1440 SVG 分享图，点击放大，加载失败自动回退正文），可切换「网页原版」（原生 `rich-text`，保留原漫画的配色、渐变与对话气泡版式）与「纯文本」查看完整正文；另有目录、上一篇下一篇、相关文章、收藏与分享。封装在 `utils/xiaobaiApi.js`、`utils/xiaobaiHtml.js`（HTML 清洗 / CSS 内联）与 `utils/xiaobaiContent.js`（纯文本 blocks），页面顶部与底部都有「不构成投资建议」风险提示。

工具集合页按 **WORK**（工作日计算器）、**LIFE**（大事件倒计时、尺子）、**THOUGHT**（思维模型）、**STUDY**（小白学财经）、**ENJOYMENT**、**OTHER**（均为暂无工具的预留分类）六个分类**默认收起**，点击分组标题可展开或收起该组工具（各组独立，可同时展开多个），每组是一张带独立配色的折叠卡片，展开的工具以卡片内行呈现；空分类展开后显示「这个分类的工具还在准备中，敬请期待」；`showXiaoBaiTool` 设为 `false` 时 STUDY 分类整体隐藏，分组数量随之变化。页面还会显示本机实时计算出的预览（如「本周 5 个工作日」、尺子是否已校准、今日模型、最新财经文章数）。节假日数据优先从站点 `holidays.json`（2024–2028）拉取，失败时回退到 `utils/holidays.js` 内置数据，断网也能用。思维模型、小白财经数据优先读站点只读接口，只在本机缓存，断网可看已缓存内容，下拉刷新可强制同步。尺子不联网、不申请任何权限。

## 小白财经数据源与 API Key

- 参考站点：`/XiaoBaiFinance/`；数据接口文档：`GET /XiaoBaiFinance/api/open/docs?doc=data`（v1.1 新增文章分享图接口），能力索引 `GET /XiaoBaiFinance/api/open/v1`。
- 默认 `xiaoBaiSource: 'public'`，走**站内公开只读接口** `/XiaoBaiFinance/api/articles`、`/articles/{id}`、`/articles/{id}/image`、`/categories`，无需密钥、开箱即用；返回结构与文档 v1 基本一致（v1 分类多包一层 `data.list`、`hasMore`，站内由 `total/page/size` 推算）。
- 文档里的开放平台 v1 接口 `/XiaoBaiFinance/api/open/v1/*` **需要 API Key**（`Authorization: Bearer <key>`），且文档明确要求服务端到服务端调用、不要把明文密钥放进前端。如需切换：把 `xiaoBaiSource` 改为 `'open'`，并把 `xiaoBaiProxyBase` 指向自己的服务端代理（代理负责注入密钥，小程序端不带 Key）；`xiaoBaiApiKey` 仅供本地调试，切勿提交仓库或打包发布。**图片接口是例外**：`<image src>` 与 `wx.previewImage` 都无法自定义请求头，所以未配置代理时 `getArticleImageUrl()` 返回空地址，详情页自动退回正文模式；走代理时图片路径与数据接口共用 `xiaoBaiProxyBase`，代理域名须一并加入 `downloadFile` 合法域名。
- 文章 `contentHtml` 是带内联样式的完整 HTML 漫画页（含 87 条 CSS 规则与内联 SVG）。`utils/xiaobaiHtml.js` 会剔除 `script` / `style` 块 / `svg` / 伪元素，按标签、属性、CSS 声明白名单重建 HTML，并把 class 规则**内联**到 `style`（`rich-text` 不认 class 与 `<style>`），渐变另补纯色兜底；「网页原版」模式用原生 `rich-text` 渲染，不打开外部网页、不加载外部脚本与样式。`utils/xiaobaiContent.js` 另生成纯文本 blocks 作为「纯文本」模式与兜底。缓存只存清洗后的富文本（单篇约 30 KB）与纯文本，不缓存原始 HTML（单篇可达数百 KB）。
- **图片形式（默认）**：文档 v1.1 新增 `GET /articles/{idOrSlug}/image`，返回 **1080×1440 竖版 SVG 分享图**（`Content-Type: image/svg+xml`），内容为品牌头、分类、标题、摘要、发布日期与风险提示；开放平台列表 `list[].imageUrl` 与详情 `data.imageUrl` 是该地址的发现方式。站内公开同源接口 `GET /XiaoBaiFinance/api/articles/{id}/image` 无需鉴权、返回同一张图（实测 200，约 3.4 KB），可直接交给小程序 `<image>`；站内公开 JSON **暂不返回** `imageUrl`，故 `utils/xiaobaiApi.js` 按文档路径用文章 `id` 构造，只拼接白名单基址与 `encodeURIComponent` 后的编号，且只接受 HTTPS 结果，不把接口返回的任意链接传给 `<image>`。详情页默认「图片」模式以 `<image mode="widthFix">` 展示、点击 `wx.previewImage` 放大；SVG 不含脚本、不引用外部资源，中文字体依赖系统字体，个别机型不渲染时 `binderror` 会自动切到正文。分享图是标题卡片而非全文长图，完整正文请切「网页原版」或「纯文本」。个人主体小程序不支持 `web-view`，因此没有采用直接嵌入网页的方案。
- 接口时间为 UTC，展示按北京时间（UTC+8）换算。
- **审核提示**：财经科普内容对个人主体可能存在类目风险，提审前可把 `utils/config.js` 的 `showXiaoBaiTool` 改为 `false` 隐藏工具入口（页面与接口封装仍保留）。

## 目录结构

```
├── app.js / app.json / app.wxss      # 全局配置与公共样式
├── project.config.json               # 项目配置（AppID）
├── sitemap.json
├── images/                           # TabBar 图标
├── utils/
│   ├── api.js                        # wx.request 封装（只读）
│   ├── util.js                       # 图片地址补全 / 安全校验
│   ├── config.js                     # 展示开关、数据源与代理配置
│   ├── categories.js                 # 内容分类导览配置（首页 / 作品共用）
│   ├── markdown.js                   # Markdown → 结构化 blocks
│   ├── about.js                      # 「关于我」接口字段归一化（无静态内容）
│   ├── ruler.js                      # 尺子校准值本地存储
│   ├── workday.js                    # 日期 / 工作日计算纯函数
│   ├── holidays.js                   # 节假日内置兜底数据
│   ├── holidayLoader.js              # 节假日数据加载与兜底
│   ├── thinkingApi.js                # 思维模型 v1 只读接口 + 缓存 / 收藏
│   ├── xiaobaiApi.js                 # 小白财经只读接口 + 缓存 / 收藏
│   ├── xiaobaiHtml.js                # 财经正文 HTML 清洗 + CSS 内联（rich-text）
│   └── xiaobaiContent.js             # 财经正文 → 结构化纯文本 blocks
└── pages/                            # 18 个页面
```

## 安全说明

- **只读展示**：只调用 `GET` 接口，不含任何 `POST/PUT/DELETE`；小程序端不写入站点数据。思维模型接口公开只读、免鉴权；小白财经默认走无需密钥的站内公开接口，仓库内不含任何 API Key。
- **不含凭据**：项目里没有管理员账号密码、AppSecret、开放平台 API Key 等敏感信息；`xiaoBaiApiKey` 默认为空，仅用于本地调试，正式发布应通过服务端代理注入。
- 博客文章正文由结构化 blocks 交给原生组件渲染，不拼接 HTML 字符串；小白财经的 HTML 正文**先经白名单清洗再由 `rich-text` 渲染**：标签映射为固定白名单，属性只保留 `style` / `src` / `colspan` / `rowspan`，CSS 属性与值也走白名单（拒绝 `url()`、`javascript:`、事件、脚本、伪元素与外链资源），图片 `src` 只接受 HTTPS。因此不执行脚本、不加载外部资源；「纯文本」模式完全不渲染 HTML。外部颜色值经格式校验后才用于样式。小白财经分享图地址由白名单基址与编码后的文章 `id` 拼成、只接受 HTTPS，不把接口返回的任意链接交给 `<image>`，SVG 由小程序原生组件渲染、绝不当作 HTML 插入页面。
- 作品地址、站点地址仅做中性的「复制」交互，不引导跳转浏览器或第三方平台；VISIT BLOG 的站点地址只允许 http/https。底部 SOCIAL MEDIA 的二维码来自 `socialMedia` 模块，仅用 `wx.previewImage` 预览站内图片，不跳转第三方平台；颜色值经 `#rrggbb` 白名单校验，二维码地址由 `resolveUrl` 过滤危险协议。思维模型详情里的延伸阅读同样只做「复制」，不展示、不跳转外链。
- 倒计时事件、尺子校准值、思维模型与小白财经的收藏及缓存仅存本机、不上传，不构成用户发布内容；尺子不联网、不申请定位或相机等权限；「关于我」不含软件下载。金融投资类内容集中在首页 SOFTWARE 模块与「小白财经」工具，可分别通过 `showSoftwareOnHome`、`showXiaoBaiTool` 一键隐藏。
- **不含视频服务**：首页视频区块、视频列表页、`<video>` 播放组件及 `videos` 接口调用已全部移除，分类导览与全站搜索也不再包含视频类型；SOCIAL MEDIA 仅展示平台二维码，不提供任何视频播放能力，避免个人主体小程序涉及未开放的视频服务类目。

## 已知数据情况

- 部分图片字段是站内相对路径（`/uploads/...`、`/images/...`，如 `about.avatar`），`utils/util.js` 会自动补全为完整 HTTPS 地址。
- `about.avatar` / `hero.avatarUrl` 等图片若加载失败，会回退显示 `avatarText` 文字头像；`GET /api/open/about` 失败时「关于我」显示上次成功同步的内容（或错误重试页），不会回退到写死的旧数据。其它页面在 `onLoad` 拉取数据，后台修改后下拉刷新即可同步；首页相框还会在 `onShow`（Tab 切回）静默重新拉取。
- 小白财经站内公开接口不支持关键词搜索（未知 query 参数会被忽略），因此列表页搜索基于接口拉回的全量精简列表在本机过滤；切换到文档 v1 接口后仍使用同一套本地筛选逻辑。原 HTML 里的内联 SVG 插画（占正文体积约 95%）`rich-text` 不支持，网页原版模式会跳过这些矢量图，文字内容与配色、气泡版式保留。站内公开列表 / 详情 JSON 目前不含文档 v1.1 的 `imageUrl` 字段，分享图地址按文档路径由文章 `id` 构造；该图是静态 SVG 标题卡片，不是正文长图。

## 使用

1. 用微信开发者工具导入本目录。
2. 按上文配置服务器域名（或先勾选不校验合法域名）。
3. 编译预览；下拉刷新可重新拉取数据。
