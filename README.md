# 博客小程序（开放 API 版）

个人主体小程序**不支持 `web-view`**，因此本项目不使用网页嵌入，改为**调用博客开放 API，用原生页面渲染全部内容**，并提供原生实用工具。

- 站点：https://www.luliming.xyz
- 接口文档：https://github.com/lui2015/PersonalBlog/blob/main/docs/OPEN_API.md （工具显示 / 隐藏配置见 4.12，小程序调用示例见 6.5）
- 思维模型接口文档：https://www.luliming.xyz/thinkingModel/platform/docs
- 小白财经接口文档：https://www.luliming.xyz/XiaoBaiFinance/api/open/docs?doc=data
- 数据实时读取，站点后台更新内容或调整工具显示开关后，小程序刷新 / 重新进入页面即可生效

## 必做配置：服务器域名

登录 [微信公众平台](https://mp.weixin.qq.com/) → **开发管理 → 开发设置 → 服务器域名**（个人小程序也有这一项）：

| 类型 | 域名 |
|------|------|
| request 合法域名 | `https://www.luliming.xyz` |
| downloadFile 合法域名 | `https://www.luliming.xyz`、`https://lyman-1258661753.cos.ap-guangzhou.myqcloud.com`、`https://picsum.photos`、`https://staticedu-wps-cache.iciba.com` |

说明：

- `request` 用于调用所有 `/api/open/...` 接口、站点节假日数据 `/workday/holidays.json`、思维模型只读接口 `/thinkingModel/api/v1/...`、经验沉淀公开只读接口 `/experience/api/v1/open/...`、小白财经只读接口 `/XiaoBaiFinance/api/...`（或开放平台 v1 `/XiaoBaiFinance/api/open/v1/...`），以及每日英语只读接口 `/EglishStudy/api/daily`。
- `downloadFile` 用于 `wx.previewImage` 预览照片、文章封面、相册图片、软件作品封面、自媒体二维码、技能证书，以及每日英语的配图与配音（金山词霸静态资源 `staticedu-wps-cache.iciba.com`）。
- 站点图片主要存放在腾讯云 COS `lyman-1258661753.cos.ap-guangzhou.myqcloud.com`（文章封面、相册封面、软件作品封面等），另有 `picsum.photos` 示例占位图；作品 Tab 内容类型切换后的列表缩略图也来自 COS，换图床需同步加入白名单。
- 域名必须 HTTPS、已备案、不带端口和路径。
- **开发阶段**可在微信开发者工具「详情 → 本地设置」勾选 **不校验合法域名** 临时调试。

## 页面与数据模块

| 页面 | 路径 | 使用的接口模块 |
|------|------|----------------|
| 首页 | `pages/index/index` | `hero` `albums`（相框照片 + 分类数量）`photos`（仅兜底）`poems` `myskills` `works` `softwares` `quotes` |
| 作品（分类导览 + 类型切换 + 全站搜索） | `pages/works/works` | 6 类作品（`q` 并发搜索 + 类型切换按需拉取）+ `/api/open` 索引 + `works`（文章列表） |
| 文章详情 | `pages/detail/detail` | `works/{id}`，Markdown 正文解析渲染 |
| 软件作品 | `pages/softwares/softwares` | `softwares`（网格 + 详情弹层） |
| 技能作品 | `pages/myskills/myskills` | `myskills`（全量列表 + `q` 搜索 + 复制地址） |
| 工具集合 | `pages/tools/tools` | `GET /api/miniprogram/tools`（分组 / 工具显示开关）+ 本地工具入口与折叠分组 |
| 工作日计算器 | `pages/workday/workday` | `/workday/holidays.json` + 内置兜底数据 |
| 大事件倒计时 | `pages/countdown/countdown` | 本地存储 + 工作日计算 |
| 尺子 | `pages/ruler/ruler` | 无接口，校准值存本机 |
| 思维模型库 | `pages/thinking/thinking` | `/thinkingModel/api/v1/models`（分页拉全量）`/categories` `/stats`，搜索用 `q` |
| 思维模型详情 | `pages/thinkingDetail/thinkingDetail` | `/thinkingModel/api/v1/models/{slug}` |
| 经验沉淀 | `pages/experience/experience` | `/experience/api/v1/open/meta` `/experiences`（一次拉全量）`/search`（全文检索） |
| 经验沉淀详情 | `pages/experienceDetail/experienceDetail` | `/experience/api/v1/open/experiences/{id}/html`（完整 HTML 报告），CSS 变量展开 + 纯单 class 规则内联 + 标签级基础排版 + 移动端单栏重排后 `rich-text` 渲染，支持全屏与横屏 |
| 小白财经 | `pages/xiaobai/xiaobai` | `/XiaoBaiFinance/api/articles`（分页拉全量）`/categories` |
| 小白财经详情 | `pages/xiaobaiDetail/xiaobaiDetail` | `/XiaoBaiFinance/api/articles/{id}`，网页原版 HTML（分段清洗后 `rich-text` 渲染正文，文章内嵌头像转本机图片显示） |
| 每日英语 | `pages/english/english` | `/EglishStudy/api/daily?date=YYYY-MM-DD`，每日一句 / 今日美文 / 重点词汇 / 本机打卡 |
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
- **作品 Tab**：2 列分类网格，点击非文章分类进入对应二级页；点击「文章」滚动到下方列表并切回文章类型。`LATEST ARTICLES` 上方还有一排**内容类型切换**（文章 / 相册 / 诗词 / 我的思考 / 软件 / 技能），选中非文章类型时本页按需 `GET /api/open/{section}?pageSize=200` 拉取该模块并渲染通用行，结果按类型缓存、下拉刷新可强制更新，底部「查看全部」进入对应二级页；文章类型下直接展示全部文章（已移除「全部 / 分类」二级筛选），区块标题与结果计数随类型变化。诗词类型会在列表行内直接展开完整诗句（标题与朝代 / 作者 / 日期下方是紫色引文块），全站搜索命中诗词时同样显示诗句上下文；**思考类型完整展示接口返回的思考全文**，不再截成 42 字加省略号、也不受通用标题两行截断限制。列表行左侧展示图片：相册用 `cover`（缺失时取首张照片 `src`）、软件用 `image`，地址均经 `resolveUrl` 过滤危险协议；诗词 / 思考 / 技能等无图类型显示分类图标占位，图片加载失败也会自动回退为图标。
- **全站搜索**：作品 Tab 的搜索框并发查询 `works / albums / poems / quotes / softwares / myskills` 六个模块的 `q` 参数，结果按类型分组（每组最多 5 条，显示总条数）。文章 / 相册 / 软件进详情页，诗词 / 思考 / 技能进对应列表页并带上同一关键词；「查看全部」同理，文章组则清空搜索回到本页列表。清空关键词恢复当前内容类型的列表。搜索期间有防抖、过期结果丢弃，单个模块失败不影响其它类型。

## 首页「查看更多」入口

- 照片、文章、诗词、思考四个区块标题栏右侧的「查看更多 →」复用 `utils/categories.js` 的路径：照片 → `pages/albums/albums`（相册列表），文章 → `pages/works/works`（作品 Tab，用 `switchTab`），诗词 → `pages/poems/poems`，思考 → `pages/quotes/quotes`。
- 诗词卡片「⟳ 换一首」与思考卡片「⟳ 换一句」在本页已加载的列表里随机切换，并避免连续显示同一条；数据来自 `poems` / `quotes` 接口，下拉刷新可重新拉取。**两块都自动轮播**：诗词 10 秒、思考 13 秒（错开避免同时切换），`onShow` 起表、`onHide` / `onUnload` 停表避免后台空转，手动点按钮会重新计时；不设开关按钮，始终自动播放。切换动画用 A/B 两套不同名 `@keyframes` 配合交替 class 强制重播：卡片淡入上移 + 轻微缩放 / 模糊消散 + 青紫光晕闪现，标题与诗句逐行错峰浮现（每行延迟 90ms）；`.poem-body` / `.quote-text` 按 4 行设最小高度，自动切换不会因文字长短导致页面跳动。

## 首页照片相框（PHOTO FRAME）

与「查看更多 →」进入的相册页同源，数据来自 `GET /api/open/albums`：摊平各相册的 `photos`（相册内无照片时用 `cover`），最多取 9 张；`src` 为站内相对路径时由 `utils/util.js` 补全，标题取照片标题、缺省回退相册名。后台在「摄影相册」里增删照片后，首页**切回本 Tab 或下拉刷新**即同步，无需再单独维护「首页照片」模块。`albums` 请求失败时才回退 `GET /api/open/photos`（站点当前的 `picsum` 示例图）。点击相框用 `wx.previewImage` 预览当前批次全部图片。

## 首页文章作品（LATEST WORKS）

数据来自 `GET /api/open/works`，首页取最新 3 篇，以「左封面 + 右文字」的图文卡片展示：封面 `cover`（相对路径由 `utils/util.js` 补全）、渐变蒙层与序号角标，右侧为分类 / 日期、标题（最多 2 行）、简介（1 行）、标签与阅读时长。后台未配封面或图片加载失败时自动回退到 `NO COVER` 占位块，不会出现破图；点击卡片进入文章详情页。

## 首页技能作品（SKILLS）

数据来自 `GET /api/open/myskills`（10 项：`name` / `description` / `url`），与网站「SKILLS // 技能作品」同源，替换了原来的技能雷达进度条（`skills` 模块不再在小程序首页使用）。首页固定显示最新 5 项，右上角「查看全部 →」跳转到 `pages/myskills/myskills` 列表页（全量条目、完整描述、下拉刷新、错误重试）；每行展示名称与单行描述。小程序不能打开站外网页，且技能地址多为 GitHub 链接，因此点击条目只做中性的「复制技能地址」（仅允许 http/https），页面不展示、不跳转外链。

## 首页软件作品（SOFTWARE）

数据来自 `GET /api/open/softwares`（12 项），封面为站内相对路径，由 `utils/util.js` 补全为完整 HTTPS 地址。

- 首页：横向滚动卡片（全部 12 个），展示封面、名称、简介与「软件」角标；右上角「查看全部」进入列表页。**每 3 秒自动前进约一张卡片并循环**：到末尾先关掉 `scroll-with-animation` 瞬间回到起点、下一拍再恢复平滑滚动；手指触摸时暂停自动滚动，松开 4 秒后恢复，`onHide` / `onUnload` 统一停表。不再提供「下一组」按钮；标题下方保留「自动轮播 · 共 N 个作品」与 `1 / N` 页码，卡片下方保留随 `bindscroll` 更新的进度条。
- 点击单张卡片进入列表页并自动展开该作品详情弹层（大图 + 完整介绍 + 复制地址）。
- 小程序不能打开站外网页，因此作品地址只做中性「复制」，不引导跳转浏览器。

**审核提示**：站点软件作品多为股票 / 基金 / 投资类内容，属于个人主体**未开放的金融类目**，放在首页会显著增加被拒风险。提审前把 `utils/config.js` 中的 `showSoftwareOnHome` 改为 `false` 即可临时隐藏首页该模块（数据接口与列表页仍保留）。这里只控制首页的内容模块；工具集合页的分组 / 工具显示与隐藏已改为由站点接口控制，不在此开关内。若要长期展示，建议改用企业主体并准备相应资质，或在站点后台把这些作品替换为非金融类内容。

## 实用小工具

- **工作日计算器**：对齐网页版 `/workday/` 的核心能力——日期区间工作日统计、快捷区间（今天/本周/本月/本季度/今年）、N 个工作日推算（支持负数与常用值）、日历可视化、年度节假日一览（点击可回填计算器）。自动识别法定节假日与调休补班。
- **大事件倒计时**：对齐网页版 `/dajishi/` 的添加表单——事件名称、目标日期、自然日/工作日两种计算方式、12 个图标、卡片主题，支持删除确认。数据仅保存在本机 `wx.setStorageSync`，不做云端同步、无登录。
- **尺子**：屏幕刻度尺，支持厘米 / 英寸（1 mm 或 1/16 in 小格）、横向 / 竖向，主刻度带 `0 / 1 / 2…` 数字标注，拖动 A / B 双游标读出间距并可复制结果。点「全屏」会隐藏所有面板让尺子铺满视口，顶部保留结果、底部保留单位 / 方向 / 重置 / 复制；页面配置了 `pageOrientation: auto`，手机横放时会自动重新测量刻度。手机系统不提供屏幕 PPI，因此提供三种校准方式：实体尺量屏幕宽度自动换算、滑块微调（含 ±0.1 / ±1 步进）、银行卡 / 1 元硬币 / A4 纸参考线对齐；校准值由 `utils/ruler.js` 存本机。精度取决于校准结果，仅供日常估测。
- **思维模型**：对齐网页版 `/thinkingModel/` 的模型库——191 个模型 / 10 大分类 / 难度星级，每日一模型（按日期稳定选取，可「换一个」）、关键词搜索、分类与难度筛选、分页加载、我的收藏。数据走站点公开只读接口 `/thinkingModel/api/v1/`：列表按 `limit=100` 分页拉全量并缓存 24 小时，搜索用服务端 `q`（可匹配介绍等精简列表没有的字段），失败时退回本机缓存过滤；详情页读 `/models/{slug}`，渲染通俗介绍、核心洞察、记忆口诀、适用场景 / 步骤 / 误区 / 搭配、实战案例、延伸阅读与关联模型，可收藏、复制书名、跳转关联模型、分享直达详情。封装在 `utils/thinkingApi.js`，收藏仅存本机。
- **经验沉淀**：对齐网页版 `/experience/` 的经验库——6 个分类（互联网项目管理、金融投资、思维认知等）、36 篇经验，横向分类切换、标题/简介本机过滤 + 服务端全文检索（可命中正文并展示命中片段）、离线缓存与下拉刷新。详情页读公开接口返回的**完整 HTML 报告**（含 `<!DOCTYPE html>`、内联 CSS 与交互组件）：展开 `:root` CSS 变量、把窄屏 `@media` 规则提升为无条件生效、去掉 `rich-text` 不支持的 grid / flex / gap 等布局声明并重排为移动端单栏；**只保留纯单 class 选择器**，丢弃 `.hero h1 em` 这类后代选择器（否则会被内联器误归到父容器，让标题卡拿到渐变背景、`transparent` 文字色和 38px 字号），标题、正文、列表与表格改用标签级基础排版，表格另收紧字号与单元格内边距，保留浅色配色、渐变卡片与标题层级；点「全屏」隐藏所有面板铺满阅读，页面配置 `pageOrientation: auto` 可横屏自动重排。正文容器沿用网页原版浅色底。封装在 `utils/experienceApi.js`（只读 GET、24 小时缓存、正文缓存只留最近 6 篇）与 `utils/experienceHtml.js`（复用 `xiaobaiHtml.js` 的清洗器）。
- **小白财经**：对齐网页版 `/XiaoBaiFinance/` 的文章库——132 篇财经知识漫画、7 大分类（含子分类）、标题/摘要搜索、最新/最多阅读排序、分页加载、我的收藏。列表页按 `size=50` 分页拉全量并缓存；详情页读 `/articles/{id}`，正文以**网页原版 HTML** 呈现（原生 `rich-text`，保留原漫画的配色、渐变与对话气泡版式），角色介绍与对话头像取自文章内嵌图片、由原生 `image` 显示，接口没有 HTML 时用结构化文字兜底；另有目录、上一篇下一篇、相关文章、收藏与分享。封装在 `utils/xiaobaiApi.js`、`utils/xiaobaiHtml.js`（HTML 分段清洗 / CSS 内联 / 头像提取）、`utils/xiaobaiAvatar.js`（头像转本机图片）与 `utils/xiaobaiContent.js`（纯文本 blocks 兜底），页面顶部与底部都有「不构成投资建议」风险提示。
- **每日英语**：对齐网页版 `/EglishStudy/`（站点标题「一日英文」）——每天一句英文美句（中英对照、可隐藏中文自测、配音跟读、复制句子）与一篇短美文（分段中英对照、重点词汇），支持按日期回看往期、本机学习打卡（连续天数 / 本月天数）。数据来自站内公开只读接口 `/EglishStudy/api/daily`，按日期缓存、断网可看已缓存内容，下拉刷新可强制同步。封装在 `utils/englishApi.js`，打卡记录仅存本机。

工具集合页的**分组与工具显示 / 隐藏完全由站点接口控制**：每次进入页面都请求 `GET /api/miniprogram/tools`（公开只读，服务端已过滤隐藏项与空分组，文档 4.12 / 6.5），按返回顺序渲染，不再有 `showXiaoBaiTool` 之类的本地开关。当前后台配置为 **WORK**（工作日计算器）、**LIFE**（大事件倒计时、尺子）、**THOUGHT**（思维模型、经验沉淀）、**STUDY**（小白学财经、每日英语）4 组 7 项，ENJOYMENT / OTHER 这类空分组不会出现；后台把某个分组 / 工具设为隐藏或关掉总开关后，小程序无需发版即生效，全部隐藏时显示空态提示。分组标题、数量、序号与工具名称跟随接口；页面跳转路径、图标、描述与预览仍由本地能力注册表提供，后台新增的工具只有配置了站内 `/pages/...` 路径（白名单校验，外链一律拒绝）或名称 / id 能匹配内置工具才可点击跳转，否则提示「暂未开放」。接口不可用时读上次成功同步的配置并标注「离线配置」，从未成功过则退回随包的 6 组默认列表；冷启动先读缓存，避免闪一下默认分组。

分组**默认收起**，点击标题展开或收起（各组独立，可同时展开多个），每组是一张带独立配色的折叠卡片，展开的工具以卡片内行呈现；空分类展开后显示「这个分类的工具还在准备中，敬请期待」；配置刷新时保留展开状态与已算好的预览。页面还会显示本机实时计算出的预览（如「本周 5 个工作日」、尺子是否已校准、今日模型、经验篇数、最新财经文章数、今日英文句），财经工具被后台隐藏时不再拉取它的文章预览。节假日数据优先从站点 `holidays.json`（2024–2028）拉取，失败时回退到 `utils/holidays.js` 内置数据，断网也能用。思维模型、经验沉淀、小白财经数据优先读站点只读接口，只在本机缓存，断网可看已缓存内容，下拉刷新可强制同步。尺子不联网、不申请任何权限。

## 小白财经数据源与 API Key

- 参考站点：`/XiaoBaiFinance/`；数据接口文档：`GET /XiaoBaiFinance/api/open/docs?doc=data`（v1.1），能力索引 `GET /XiaoBaiFinance/api/open/v1`。
- 默认 `xiaoBaiSource: 'public'`，走**站内公开只读接口** `/XiaoBaiFinance/api/articles`、`/articles/{id}`、`/categories`，无需密钥、开箱即用；返回结构与文档 v1 基本一致（v1 分类多包一层 `data.list`、`hasMore`，站内由 `total/page/size` 推算）。
- 文档里的开放平台 v1 接口 `/XiaoBaiFinance/api/open/v1/*` **需要 API Key**（`Authorization: Bearer <key>`），且文档明确要求服务端到服务端调用、不要把明文密钥放进前端。如需切换：把 `xiaoBaiSource` 改为 `'open'`，并把 `xiaoBaiProxyBase` 指向自己的服务端代理（代理负责注入密钥，小程序端不带 Key）；`xiaoBaiApiKey` 仅供本地调试，切勿提交仓库或打包发布。
- 文章 `contentHtml` 是带内联样式的完整 HTML 漫画页（含 87 条 CSS 规则与内联 SVG）。`utils/xiaobaiHtml.js` 会剔除 `script` / `style` 块 / 无关的 `svg` / 伪元素，按标签、属性、CSS 声明白名单重建 HTML，并把 class 规则**内联**到 `style`（`rich-text` 不认 class 与 `<style>`），渐变另补纯色兜底；正文用原生 `rich-text` 渲染，不打开外部网页、不加载外部脚本与样式。`utils/xiaobaiContent.js` 另生成纯文本 blocks，仅作为接口没有 HTML 时的兜底。缓存只存清洗后的片段（单篇约 20–30 KB）与纯文本，不缓存原始 HTML（单篇可达数百 KB）。
- **角色头像**：详情页接口与开放平台文档都**没有独立头像字段或头像接口**，头像是 `contentHtml` 内嵌的两张 SVG `<symbol>`（`<image href="data:image/png;base64,...">`，合计约 236 KB），正文用 12 处 `<svg><use href="#tang-seng|#zhu-bajie"></use></svg>` 引用；探测站内 `/avatars/*`、`/images/*`、`/api/avatars` 等静态路径均为 404。由于 `rich-text` 的 `<img>` **只支持网络图片**（base64 与本地路径都不渲染），`utils/xiaobaiHtml.js` 会把「角色介绍区 / 对话块」按 div 配平抽成独立片段，用原生 `image` 组件还原头像与气泡版式，其余正文仍交给 `rich-text`。两张头像从接口提取后固化为随包资源 `images/xiaobai/{zhu-bajie,tang-seng}.png`（256×256，共约 181 KB），`utils/xiaobaiAvatar.js` 对这两个固定角色直接返回代码包内路径——`<image>` 加载代码包资源最可靠，不依赖 `FileSystemManager` / `USER_DATA_PATH`，也不需要新增合法域名；接口以后新增的未知角色才尝试写本机文件，加载失败统一回退到 🐷 / 🙏 文字头像。既不重复把 236 KB base64 塞进每篇文章缓存，也不依赖外部图床。站点若更换头像，重新提取这两张 PNG 覆盖即可。
- **详情缓存升级**：`getArticleView` 只认带 `segments` 的新版详情缓存；升级前只有 `richHtml` 的旧缓存会被判为过期并自动联网重建（断网时仍退回旧数据可读），避免页面一直走旧渲染、头像不显示。下拉刷新同样会强制重建。
- 文档 v1.1 还提供 `GET /articles/{idOrSlug}/image`（1080×1440 SVG 分享图），但小程序**只保留网页原版**，不调用该接口、不展示分享图。个人主体小程序不支持 `web-view`，因此没有采用直接嵌入网页的方案。
- 接口时间为 UTC，展示按北京时间（UTC+8）换算。
- **审核提示**：财经科普内容对个人主体可能存在类目风险，提审前在站点后台「小程序工具」栏目把「小白学财经」设为隐藏（也可隐藏整个 STUDY 分组或关掉总开关）即可隐藏工具入口，小程序无需改代码或重新发版；页面与接口封装仍保留，恢复显示同样在后台操作。

## 每日英语数据源

- 参考站点：`/EglishStudy/`（页面标题「一日英文」）；数据接口：`GET https://www.luliming.xyz/EglishStudy/api/daily?date=YYYY-MM-DD`，**站内公开只读、无需 API Key**，小程序只请求已在白名单内的 `www.luliming.xyz`。不带 `date` 返回当天，带合法日期可回看往期；非法或未来日期返回 `400 {"error":"日期不正确"}`。
- 返回的是**裸 JSON**（不是 `{ code, data }` 包装）：`{ date, quote, essay, quoteError, essayError }`。`quote` 含 `english` / `chinese` / `author` / `audioUrl` / `imageUrl` / `localImageUrl` / `sourceName`；`essay` 含 `title` / `english` / `chinese` / `wordCount` / `chunks[{english, chinese}]` / `keywords[{word, meaning}]` / `source` / `addedOn`。句子与配图引自金山词霸，美文为本站原创。
- 需求里附的 `GET /XiaoBaiFinance/api/open/docs?doc=data` 是**小白财经**开放平台文档（v1.1），其中不含英语接口；每日英语走上面这个站内公开接口，不需要 API Key，也没有代理配置。
- `utils/englishApi.js` 负责日期校验与生成、字段归一化、URL 白名单、按日期缓存（6 小时）与断网兜底，以及本机打卡存储；`pages/english/english` 只把文本交给原生 `text` 组件渲染，不拼接 HTML、不打开站外网页。
- **配音与配图**：`quote.audioUrl` / `quote.imageUrl` 指向金山词霸静态资源 `staticedu-wps-cache.iciba.com`，代码只放行该域名的 HTTPS 链接；真机播放 / 显示需在微信公众平台把该域名加入 `downloadFile` 合法域名。外链配图加载失败会自动回退到接口给出的站内插画 `localImageUrl`（`/EglishStudy/art/5.svg`）；来源链接只显示名称、不跳转。

## 经验沉淀数据源

- 参考站点：`/experience/`（如分类页 `/experience/c/pm`）；接口文档 `https://www.luliming.xyz/experience/docs`，OpenAPI 规范 `GET /experience/openapi.json`。
- 小程序只使用**公开只读**的 `/experience/api/v1/open/...`：`GET /meta`（分类）、`GET /experiences?page=&page_size=`（列表，单页上限 100，当前 36 篇一次取全）、`GET /experiences/{id}`（详情元数据，仅分享直达时兜底）、`GET /experiences/{id}/html`（完整 HTML 报告，`?download=true` 可作附件下载）、`GET /search?q=&mode=content&limit=`（全文检索，返回 `experience_id` 与命中片段）。
- 文档里的 `POST /experience/api/v1/open/experiences`（写入）、`/open/stats`、`/api/v1/groups` 等**需要登录**，小程序一律不调用；参考页面提供的登录账号密码**没有也不会写入代码、缓存或配置**，小程序不含任何站点凭据。
- OpenAPI 文档已升级到 **v1.1.0**：`GET /open/experiences/{id}/html` 返回**完整自包含 HTML 文档**（`<!DOCTYPE html>` + 内联 CSS/JS + 交互组件，与站内「报告详情页」完全一致），列表 / 详情接口的 `html_url` 即该地址。旧的「剥离样式语义片段」已废弃，正文缓存前缀随之升到 `experience_cache_v2_`，让旧缓存整体失效。
- 网页原版是浅色报告（`:root` 定义 `--bg` / `--ink` / `--pri` 等变量，约 460 处 `class`），桌面用 `.g3` / `.g4` 等 `display:grid` 多栏、靠 `@media(max-width:680px)` 才改单栏；`rich-text` 没有布局引擎，直接内联会把卡片挤成窄条。`utils/api.js` 的 `request(path, { dataType: 'text' })` 关闭自动 JSON 解析；`utils/experienceHtml.js` 抽出 `<style>` → 展开全部 `var(--xxx)`（含标签 inline style）→ 把窄屏 `@media` 规则提升为无条件生效、丢弃 print / keyframes → 删除 `grid` / `flex` / `gap` / `position:sticky` / `white-space:nowrap` / `overflow:hidden` 与 `color:transparent` / 白色文字等无法正确渲染的声明 → **只保留 `^\.[\w-]+$` 的纯单 class 规则**（后代 / 元素 / 伪类选择器一律丢弃，避免 `.hero h1 em` 的渐变裁字被错误内联到 `<header class="hero">`）→ 给 `.card` / `.stage` / `.phase` 等补纵向间距，并给 `h1`–`h5` / `p` / `li` / `table` / `th` / `td` 等补标签级基础排版（表格字号与内边距按手机宽度收紧），最后复用 `xiaobaiHtml.js` 做 class 内联与标签 / 属性 / CSS 白名单清洗。固定侧栏目录、进度条、脚本、危险标签与外链都不渲染，文内链接仅保留文字。详情页正文容器沿用网页原版 `#f6f7fb` 浅色底，避免白底卡片 / 深字在深色页上失真；全屏时铺满、横屏自动重排；旧格式（无内联 CSS 的语义片段）另有浅色基础排版兜底。
- 列表与分类缓存 24 小时，正文只缓存最近 6 篇；联网失败退回本机缓存并标注「网络不可用」，下拉刷新强制同步。工具页卡片预览读同一份缓存。

## 目录结构

```
├── app.js / app.json / app.wxss      # 全局配置与公共样式
├── project.config.json               # 项目配置（AppID）
├── sitemap.json
├── images/                           # TabBar 图标
├── utils/
│   ├── api.js                        # wx.request 封装（只读）
│   ├── util.js                       # 图片地址补全 / 安全校验
│   ├── config.js                     # 首页 SOFTWARE 展示开关、数据源与代理配置
│   ├── categories.js                 # 内容分类导览配置（首页 / 作品共用）
│   ├── markdown.js                   # Markdown → 结构化 blocks
│   ├── about.js                      # 「关于我」接口字段归一化（无静态内容）
│   ├── ruler.js                      # 尺子校准值本地存储
│   ├── workday.js                    # 日期 / 工作日计算纯函数
│   ├── holidays.js                   # 节假日内置兜底数据
│   ├── holidayLoader.js              # 节假日数据加载与兜底
│   ├── thinkingApi.js                # 思维模型 v1 只读接口 + 缓存 / 收藏
│   ├── xiaobaiApi.js                 # 小白财经只读接口 + 缓存 / 收藏
│   ├── xiaobaiHtml.js                # 财经正文 HTML 分段清洗 + CSS 内联 + 头像提取
│   ├── xiaobaiAvatar.js              # 财经角色头像 base64 → 本机图片文件
│   ├── xiaobaiContent.js             # 财经正文 → 结构化纯文本 blocks
│   ├── englishApi.js                 # 每日英语只读接口 + 缓存 / 打卡
│   ├── experienceApi.js              # 经验沉淀公开只读接口 + 缓存 / 全文检索
│   └── experienceHtml.js             # 完整 HTML：变量展开 + 纯单 class 规则 / 标签排版 + 移动端单栏重排 + 白名单清洗
└── pages/                            # 21 个页面
```

## 安全说明

- **只读展示**：只调用 `GET` 接口（含公开只读的 `/api/miniprogram/tools` 工具配置），不含任何 `POST/PUT/DELETE`；小程序端不写入站点数据，也不传管理员凭据。思维模型、经验沉淀、小白财经都走站点公开只读接口、免鉴权；经验沉淀的写入接口与需登录接口一律不调用，仓库内不含任何 API Key。
- **不含凭据**：项目里没有管理员账号密码、AppSecret、开放平台 API Key 等敏感信息；参考站点 `/experience/c/pm` 提供的登录账号密码没有、也不会写入代码、缓存或配置。`xiaoBaiApiKey` 默认为空，仅用于本地调试，正式发布应通过服务端代理注入。
- **经验沉淀正文清洗**：接口返回含 `<script>` 与内联 CSS 的完整 HTML 文档，但小程序只用其中的静态样式：`experienceHtml.js` 先展开 CSS 变量、把窄屏媒体规则提升、删除 grid / flex / sticky 与透明 / 白色文字等声明、只保留纯单 class 规则（避免后代选择器错配）、去掉侧栏，再交给 `xiaobaiHtml.js` 按标签 / 属性 / CSS 白名单重建并内联样式（脚本、外链、事件属性、危险协议一律丢弃），不把接口内容拼接进可执行代码、不执行任何脚本；`rich-text` 内不加载站外资源，文内链接仅保留文字。经验编号走 `^[a-zA-Z0-9_-]{1,64}$` 白名单防路径穿越，缓存只存本机、不上传。
- 博客文章正文由结构化 blocks 交给原生组件渲染，不拼接 HTML 字符串；小白财经的 HTML 正文**先经白名单清洗再由 `rich-text` 渲染**：标签映射为固定白名单，属性只保留 `style` / `src` / `colspan` / `rowspan`，CSS 属性与值也走白名单（拒绝 `url()`、`javascript:`、事件、脚本、伪元素与外链资源），图片 `src` 只接受 HTTPS，没有合法地址的 `img` 直接丢弃。因此不执行脚本、不加载外部资源。外部颜色值经格式校验后才用于样式。角色头像的基线与正文一样先做白名单校验（MIME、字符集、长度 ≤400 KB、id 仅字母数字/`_`/`-`）：两个固定角色使用随包 PNG，页面 `image` 组件只引用写死的代码包路径；未知角色才写入固定前缀的 `wx.env.USER_DATA_PATH` 本机文件，不读取任意路径、不上传、不请求第三方图床；加载失败回退文字头像。每日英语的配图与配音地址只放行 `staticedu-wps-cache.iciba.com` 的 HTTPS 链接、站内插画只放行 `www.luliming.xyz`，不把接口返回的任意外链用于播放、跳转或拼接页面；来源链接只展示名称，不跳转第三方平台。
- 作品地址、站点地址仅做中性的「复制」交互，不引导跳转浏览器或第三方平台；VISIT BLOG 的站点地址只允许 http/https。底部 SOCIAL MEDIA 的二维码来自 `socialMedia` 模块，仅用 `wx.previewImage` 预览站内图片，不跳转第三方平台；颜色值经 `#rrggbb` 白名单校验，二维码地址由 `resolveUrl` 过滤危险协议。思维模型详情里的延伸阅读同样只做「复制」，不展示、不跳转外链。
- 倒计时事件、尺子校准值、思维模型与小白财经的收藏及缓存、每日英语的学习打卡记录仅存本机、不上传，不构成用户发布内容；尺子不联网、不申请定位或相机等权限；「关于我」不含软件下载。金融投资类内容集中在首页 SOFTWARE 模块与「小白财经」工具：前者用 `utils/config.js` 的 `showSoftwareOnHome` 隐藏，后者由站点接口 `GET /api/miniprogram/tools` 的显示开关控制（后台隐藏即生效，无需发版）。
- **不含视频服务**：首页视频区块、视频列表页、`<video>` 播放组件及 `videos` 接口调用已全部移除，分类导览与全站搜索也不再包含视频类型；SOCIAL MEDIA 仅展示平台二维码，不提供任何视频播放能力，避免个人主体小程序涉及未开放的视频服务类目。

## 已知数据情况

- 部分图片字段是站内相对路径（`/uploads/...`、`/images/...`，如 `about.avatar`），`utils/util.js` 会自动补全为完整 HTTPS 地址。
- `about.avatar` / `hero.avatarUrl` 等图片若加载失败，会回退显示 `avatarText` 文字头像；`GET /api/open/about` 失败时「关于我」显示上次成功同步的内容（或错误重试页），不会回退到写死的旧数据。其它页面在 `onLoad` 拉取数据，后台修改后下拉刷新即可同步；首页相框还会在 `onShow`（Tab 切回）静默重新拉取。
- 小白财经站内公开接口不支持关键词搜索（未知 query 参数会被忽略），因此列表页搜索基于接口拉回的全量精简列表在本机过滤；切换到文档 v1 接口后仍使用同一套本地筛选逻辑。原 HTML 里占正文体积约 95% 的内联 SVG 是两张角色头像的 base64 图片，`rich-text` 无法直接渲染，现由详情页分段交给原生 `image` 组件显示；其余矢量插画仍按白名单跳过，文字内容与配色、气泡版式保留。

## 使用

1. 用微信开发者工具导入本目录。
2. 按上文配置服务器域名（或先勾选不校验合法域名）。
3. 编译预览；下拉刷新可重新拉取数据。
