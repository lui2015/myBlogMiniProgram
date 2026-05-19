const articles = [
  {
    id: '1',
    title: '打造赛博朋克风格 UI 设计系统',
    category: '技术',
    summary: '探索如何使用 CSS 动画和现代前端技术实现令人惊叹的赛博朋克视觉效果，包括霓虹发光、Glitch 动画、粒子系统等。',
    tags: ['CSS', '动画'],
    date: '2026-05-01',
    readTime: '8 min',
    content: '<h2 style="color:#ffffff;">赛博朋克 UI 设计系统</h2><p style="color:#d1d1e0;line-height:1.8;">赛博朋克风格以其独特的霓虹色彩、暗色背景和未来感设计著称。本文将介绍如何使用现代 CSS 技术来实现这些效果。</p><h3 style="color:#00d4ff;">1. 霓虹发光效果</h3><p style="color:#d1d1e0;line-height:1.8;">通过 CSS box-shadow 和 text-shadow 属性，我们可以轻松实现霓虹灯光效果。关键在于多层阴影的叠加，从内到外逐渐增大模糊半径。</p><h3 style="color:#00d4ff;">2. Glitch 动画</h3><p style="color:#d1d1e0;line-height:1.8;">故障艺术（Glitch Art）是赛博朋克的标志性视觉元素。使用 CSS clip-path 和 animation，可以模拟信号干扰的视觉效果。</p><h3 style="color:#00d4ff;">3. 粒子系统</h3><p style="color:#d1d1e0;line-height:1.8;">使用 Canvas API 创建粒子动画，配合连线效果，打造科幻感十足的背景动效。</p>'
  },
  {
    id: '2',
    title: 'Next.js 性能优化实战指南',
    category: '技术',
    summary: '从 SSR 到 ISR，深入理解 Next.js 渲染策略，掌握图片优化、代码分割、缓存策略等核心技巧。',
    tags: ['Next.js', '性能'],
    date: '2026-04-25',
    readTime: '12 min',
    content: '<h2 style="color:#ffffff;">Next.js 性能优化</h2><p style="color:#d1d1e0;line-height:1.8;">Next.js 提供了多种渲染策略，合理选择可以大幅提升应用性能。</p><h3 style="color:#00d4ff;">1. 渲染策略选择</h3><p style="color:#d1d1e0;line-height:1.8;">SSR（服务端渲染）适合 SEO 敏感和数据实时性要求高的页面；SSG（静态生成）适合内容不频繁变化的页面；ISR（增量静态再生）则兼顾了两者的优点。</p><h3 style="color:#00d4ff;">2. 图片优化</h3><p style="color:#d1d1e0;line-height:1.8;">使用 next/image 组件自动处理图片的懒加载、尺寸适配和格式转换（WebP/AVIF）。</p><h3 style="color:#00d4ff;">3. 代码分割</h3><p style="color:#d1d1e0;line-height:1.8;">利用 dynamic import 和 React.lazy 实现按需加载，减少首屏加载时间。</p>'
  },
  {
    id: '3',
    title: '创意编程：用代码绘制艺术',
    category: '创意',
    summary: '利用 Canvas 和 WebGL 创造令人着迷的生成艺术作品，探索算法之美。',
    tags: ['Canvas', 'WebGL'],
    date: '2026-04-18',
    readTime: '6 min',
    content: '<h2 style="color:#ffffff;">创意编程</h2><p style="color:#d1d1e0;line-height:1.8;">创意编程是技术与艺术的完美结合，通过代码表达创意和美感。</p><h3 style="color:#00d4ff;">1. Canvas 基础</h3><p style="color:#d1d1e0;line-height:1.8;">HTML5 Canvas 提供了强大的 2D 绘图 API，可以用来创建动态的视觉效果和交互式艺术作品。</p><h3 style="color:#00d4ff;">2. 生成艺术</h3><p style="color:#d1d1e0;line-height:1.8;">通过噪声函数（Perlin Noise）、分形几何和粒子系统等算法，可以生成无限可能的艺术图案。</p><h3 style="color:#00d4ff;">3. WebGL 进阶</h3><p style="color:#d1d1e0;line-height:1.8;">WebGL 让我们能在浏览器中使用 GPU 进行 3D 渲染，创造更加震撼的视觉体验。</p>'
  },
  {
    id: '4',
    title: '程序员的日常：代码之外的生活',
    category: '生活',
    summary: '工作与生活的平衡、保持创造力的方法、以及我日常的一些思考和感悟。',
    tags: ['生活', '思考'],
    date: '2026-04-10',
    readTime: '5 min',
    content: '<h2 style="color:#ffffff;">代码之外的生活</h2><p style="color:#d1d1e0;line-height:1.8;">程序员不只是写代码的机器，生活中有很多值得我们去感受和探索的事情。</p><h3 style="color:#00d4ff;">工作与生活的平衡</h3><p style="color:#d1d1e0;line-height:1.8;">设定明确的工作时间边界，学会说不，给自己留出充电的空间。运动、阅读、旅行，这些都是让大脑重启的好方式。</p><h3 style="color:#00d4ff;">保持创造力</h3><p style="color:#d1d1e0;line-height:1.8;">尝试不同领域的事物，跨界思考往往能带来意想不到的灵感。摄影、音乐、画画，都可以成为编程之外的创意来源。</p>'
  },
  {
    id: '5',
    title: 'TypeScript 高级类型体操',
    category: '技术',
    summary: '深入理解 TypeScript 条件类型、映射类型、模板字面量类型等高级特性。',
    tags: ['TypeScript', '类型系统'],
    date: '2026-04-05',
    readTime: '15 min',
    content: '<h2 style="color:#ffffff;">TypeScript 高级类型</h2><p style="color:#d1d1e0;line-height:1.8;">TypeScript 的类型系统非常强大，掌握高级类型技巧可以让代码更加安全和优雅。</p><h3 style="color:#00d4ff;">1. 条件类型</h3><p style="color:#d1d1e0;line-height:1.8;">条件类型类似于三元表达式，可以根据类型关系动态推导出新的类型。配合 infer 关键字，可以实现类型提取。</p><h3 style="color:#00d4ff;">2. 映射类型</h3><p style="color:#d1d1e0;line-height:1.8;">映射类型允许我们基于已有类型创建新类型，通过 keyof 遍历属性并进行转换。Partial、Required、Readonly 都是内置的映射类型。</p><h3 style="color:#00d4ff;">3. 模板字面量类型</h3><p style="color:#d1d1e0;line-height:1.8;">模板字面量类型让我们可以在类型层面进行字符串操作，创建更精确的类型约束。</p>'
  },
  {
    id: '6',
    title: '关于时间、效率和内卷的思考',
    category: '随笔',
    summary: '在信息爆炸的时代，如何找到自己的节奏，避免无意义的焦虑。',
    tags: ['思考', '效率'],
    date: '2026-03-28',
    readTime: '4 min',
    content: '<h2 style="color:#ffffff;">关于时间与效率</h2><p style="color:#d1d1e0;line-height:1.8;">在这个什么都在加速的时代，慢下来反而成了一种奢侈。</p><h3 style="color:#00d4ff;">找到自己的节奏</h3><p style="color:#d1d1e0;line-height:1.8;">不必跟着所有人的脚步走，每个人都有自己的时区。重要的不是比别人快，而是走在正确的方向上。</p><h3 style="color:#00d4ff;">深度工作</h3><p style="color:#d1d1e0;line-height:1.8;">减少无效的信息摄入，把时间花在真正重要的事情上。关掉通知，给自己一段不被打扰的时间，专注于当下的任务。</p><h3 style="color:#00d4ff;">接受不完美</h3><p style="color:#d1d1e0;line-height:1.8;">完美主义是效率的敌人。先完成，再完善。八十分的作品发布出来，比一百分的作品永远躺在草稿箱里要好得多。</p>'
  }
]

function getArticles(category) {
  if (!category || category === '全部') {
    return articles
  }
  return articles.filter(a => a.category === category)
}

function getArticleById(id) {
  return articles.find(a => a.id === id)
}

module.exports = {
  getArticles,
  getArticleById
}
