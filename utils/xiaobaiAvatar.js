// 小白财经角色头像：来源是文章 contentHtml 内嵌的 base64 PNG（见 utils/xiaobaiHtml.js）
// 两个固定角色固化为随包图片，<image> 对代码包内路径最可靠，
// 不依赖 FileSystemManager / USER_DATA_PATH，也不需要新增合法域名。
const SAFE_ID = /^[a-zA-Z0-9_-]{1,40}$/
const SAFE_EXT = { png: 'png', jpg: 'jpg', webp: 'webp' }
const MAX_BASE64 = 400000
const FILE_PREFIX = 'xb_avatar_'
const STATIC_AVATARS = {
  'zhu-bajie': '/images/xiaobai/zhu-bajie.png',
  'tang-seng': '/images/xiaobai/tang-seng.png'
}

function normalize(id, avatar) {
  if (!SAFE_ID.test(id) || !avatar || !avatar.data) return null
  const ext = SAFE_EXT[avatar.ext] || 'png'
  const data = String(avatar.data).replace(/\s+/g, '')
  if (!data || data.length > MAX_BASE64 || !/^[A-Za-z0-9+/=]+$/.test(data)) return null
  return { ext, data }
}

// 接口以后新增的未知角色：仍尝试写本机文件，失败则回退到文字头像
function writeAvatar(id, avatar) {
  const safe = normalize(id, avatar)
  if (!safe) return ''
  try {
    const fs = wx.getFileSystemManager()
    const dir = wx.env.USER_DATA_PATH
    if (!dir || !fs || typeof fs.writeFileSync !== 'function') return ''
    const filePath = `${dir}/${FILE_PREFIX}${id}.${safe.ext}`
    fs.writeFileSync(filePath, safe.data, 'base64')
    return filePath
  } catch (err) {
    return ''
  }
}

function saveAvatars(avatars) {
  const out = {}
  Object.keys(avatars || {}).forEach(id => {
    if (STATIC_AVATARS[id] && normalize(id, avatars[id])) {
      out[id] = STATIC_AVATARS[id]
      return
    }
    const path = writeAvatar(id, avatars[id])
    if (path) out[id] = path
  })
  return out
}

function fallback(id) {
  if (id === 'zhu-bajie') return '🐷'
  if (id === 'tang-seng') return '🙏'
  return '👤'
}

module.exports = { saveAvatars, fallback, STATIC_AVATARS }
