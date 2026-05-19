Page({
  data: {
    skills: [
      'React', 'Next.js', 'TypeScript', 'Node.js',
      'Python', 'TailwindCSS', 'Three.js', 'Docker',
      'PostgreSQL', 'Redis', 'GraphQL', 'Figma'
    ],
    timeline: [
      { year: '2025', milestone: '全栈创作者', desc: '融合技术与创意，持续输出' },
      { year: '2024', milestone: '技术分享', desc: '开始分享作品和录制技术视频' },
      { year: '2023', milestone: '开源贡献', desc: '参与多个开源项目' },
      { year: '2022', milestone: '深入前端', desc: 'React 生态系统，TypeScript' },
      { year: '2021', milestone: '全栈开发', desc: '学习 Node.js、数据库、云服务' },
      { year: '2020', milestone: '开始编程之旅', desc: '接触 Web 前端开发' }
    ],
    contacts: [
      { name: 'GitHub', value: 'github.com' },
      { name: 'Bilibili', value: 'bilibili.com' },
      { name: 'Email', value: 'hello@example.com' }
    ]
  },

  copyLink() {
    wx.setClipboardData({
      data: 'https://www.luliming.xyz',
      success() {
        wx.showToast({
          title: '链接已复制',
          icon: 'success'
        })
      }
    })
  },

  onShareAppMessage() {
    return {
      title: '鲁力铭 - 全栈开发者',
      path: '/pages/about/about'
    }
  }
})
