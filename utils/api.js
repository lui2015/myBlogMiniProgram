// 博客开放接口封装（只读）
// 文档：https://github.com/lui2015/PersonalBlog/blob/main/docs/OPEN_API.md
const BASE_URL = 'https://www.luliming.xyz'

function buildQuery(params) {
  return Object.keys(params)
    .filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(String(params[k]))}`)
    .join('&')
}

function request(path, options = {}) {
  const { method = 'GET', data } = options
  const url = /^https?:\/\//i.test(path) ? path : BASE_URL + path

  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method,
      data: data || {},
      timeout: 15000,
      header: { 'Content-Type': 'application/json' },
      success(res) {
        const body = res.data
        if (res.statusCode >= 200 && res.statusCode < 300 && body && body.ok !== false) {
          resolve(body)
        } else {
          const msg = (body && body.error) || `请求失败 (${res.statusCode})`
          reject(new Error(msg))
        }
      },
      fail(err) {
        reject(new Error((err && err.errMsg) || '网络连接异常'))
      }
    })
  })
}

// 获取模块数据。hero 返回对象，其余返回 { items, total, page, hasMore }
function getSection(section, params = {}) {
  const query = buildQuery(params)
  const path = `/api/open/${encodeURIComponent(section)}${query ? `?${query}` : ''}`

  return request(path).then(res => {
    if (res.kind === 'object' || section === 'hero') {
      return res.data || {}
    }
    return {
      items: Array.isArray(res.items) ? res.items : [],
      total: typeof res.total === 'number' ? res.total : 0,
      page: res.page || 1,
      pageSize: res.pageSize || 20,
      hasMore: !!res.hasMore
    }
  })
}

// 一次性取某模块全部数据（pageSize 上限 200）
function getList(section, params = {}) {
  return getSection(section, Object.assign({ pageSize: 200 }, params))
}

// 分页取数据
function getPage(section, page, pageSize = 20, params = {}) {
  return getSection(section, Object.assign({ page, pageSize }, params))
}

// 单条详情
function getDetail(section, id) {
  return request(`/api/open/${encodeURIComponent(section)}/${encodeURIComponent(id)}`)
    .then(res => res.data || null)
}

// 首页信息（单例）
function getHero() {
  return getSection('hero')
}

// 接口索引 / 数据字典
function getIndex() {
  return request('/api/open')
}

module.exports = {
  BASE_URL,
  request,
  getSection,
  getList,
  getPage,
  getDetail,
  getHero,
  getIndex
}
