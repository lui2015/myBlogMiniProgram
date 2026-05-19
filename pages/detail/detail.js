const { getArticleById } = require('../../utils/data')

Page({
  data: {
    article: null
  },

  onLoad(options) {
    const { id } = options
    const article = getArticleById(id)
    if (article) {
      this.setData({ article })
      wx.setNavigationBarTitle({ title: article.title })
    }
  },

  onShareAppMessage() {
    const { article } = this.data
    return {
      title: article ? article.title : '鲁力铭的博客',
      path: `/pages/detail/detail?id=${article.id}`
    }
  }
})
