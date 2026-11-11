// 节假日数据加载：优先取站点最新数据，失败时使用内置兜底
const api = require('./api')
const localData = require('./holidays')
const workday = require('./workday')

let cachedIndex = null
let cachedSource = ''

function load() {
  if (cachedIndex) {
    return Promise.resolve({ index: cachedIndex, source: cachedSource })
  }

  return api.getHolidays()
    .then(raw => {
      if (!raw || typeof raw !== 'object' || !Object.keys(raw).length) {
        throw new Error('节假日数据为空')
      }
      cachedIndex = workday.buildIndex(raw)
      cachedSource = '站点同步'
      return { index: cachedIndex, source: cachedSource }
    })
    .catch(err => {
      console.warn('[holidays] 使用内置数据', err)
      // 失败不缓存，下次进入仍会尝试联网
      return { index: workday.buildIndex(localData), source: '内置数据' }
    })
}

module.exports = { load }
