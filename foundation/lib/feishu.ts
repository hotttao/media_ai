// ============ 飞书推送模块 ============

const FEISHU_API_BASE = 'https://open.feishu.cn/open-apis'

interface FeishuConfig {
  appId: string
  appSecret: string
  receiveId: string
  receiveIdType: 'email' | 'open_id' | 'chat_id'
}

// 获取配置
function getConfig(): FeishuConfig {
  return {
    appId: process.env.FEISHU_APP_ID || '',
    appSecret: process.env.FEISHU_APP_SECRET || '',
    receiveId: process.env.FEISHU_RECEIVE_ID || '',
    receiveIdType: (process.env.FEISHU_RECEIVE_ID_TYPE as FeishuConfig['receiveIdType']) || 'chat_id',
  }
}

// ============ Access Token 管理 ============

let _accessToken = ''
let _tokenExpiresAt = 0

async function getAccessToken(): Promise<string> {
  const config = getConfig()
  if (!config.appId || !config.appSecret) {
    console.warn('[Feishu] App ID or Secret not configured')
    return ''
  }

  // 缓存未过期时直接返回
  if (_accessToken && Date.now() < _tokenExpiresAt - 60 * 1000) {
    return _accessToken
  }

  const url = `${FEISHU_API_BASE}/auth/v3/tenant_access_token/internal`
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: config.appId, app_secret: config.appSecret }),
  })

  if (!resp.ok) {
    console.error('[Feishu] Failed to get access token:', resp.status)
    return ''
  }

  const result = await resp.json()
  if (result.code === 0) {
    _accessToken = result.tenant_access_token
    _tokenExpiresAt = Date.now() + (result.expire || 7200) * 1000
    return _accessToken
  }

  console.error('[Feishu] Access token error:', result.msg)
  return ''
}

// ============ 上传文件 ============

async function uploadFile(
  fileBuffer: Buffer,
  fileName: string,
  fileType: 'image' | 'video' | 'file'
): Promise<string | null> {
  const token = await getAccessToken()
  if (!token) return null

  const endpoint = fileType === 'image' ? '/im/v1/images' : '/im/v1/files'
  const formData = new FormData()

  const blob = new Blob([new Uint8Array(fileBuffer)])
  formData.append(fileType === 'image' ? 'image' : 'file', blob, fileName)
  if (fileType === 'image') {
    formData.append('image_type', 'message')
  }

  const resp = await fetch(`${FEISHU_API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })

  if (!resp.ok) {
    console.error(`[Feishu] Upload ${fileType} failed:`, resp.status)
    return null
  }

  const result = await resp.json()
  if (result.code === 0) {
    // 图片返回 image_key，视频/文件返回 file_key
    return result.data?.image_key || result.data?.file_key || null
  }

  console.error(`[Feishu] Upload ${fileType} error:`, result.msg)
  return null
}

// ============ 发送消息 ============

async function sendMessage(msgType: string, content: object): Promise<boolean> {
  const config = getConfig()
  const token = await getAccessToken()
  if (!token || !config.receiveId) return false

  const url = `${FEISHU_API_BASE}/im/v1/messages?receive_id_type=${config.receiveIdType}`
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      receive_id: config.receiveId,
      msg_type: msgType,
      content: JSON.stringify(content),
    }),
  })

  if (!resp.ok) {
    console.error('[Feishu] Send message failed:', resp.status)
    return false
  }

  const result = await resp.json()
  return result.code === 0
}

// ============ 对外 API ============

/**
 * 发送文本消息
 */
export async function sendTextMessage(title: string, content: string): Promise<boolean> {
  const timestamp = new Date().toLocaleString('zh-CN')
  return sendMessage('text', { text: `${title}\n${content}\n\n⏰ ${timestamp}` })
}

/**
 * 发送 Markdown 消息
 */
export async function sendMarkdownMessage(title: string, content: string): Promise<boolean> {
  const timestamp = new Date().toLocaleString('zh-CN')
  return sendMessage('post', {
    post: {
      zh_cn: {
        title,
        content: [[{ tag: 'text', text: `${content}\n\n⏰ ${timestamp}` }]],
      },
    },
  })
}

/**
 * 上传图片并发送
 */
export async function sendImage(imageBuffer: Buffer, imageName = 'image.png'): Promise<boolean> {
  const imageKey = await uploadFile(imageBuffer, imageName, 'image')
  if (!imageKey) return false
  return sendMessage('image', { image_key: imageKey })
}

/**
 * 上传视频并发送
 */
export async function sendVideo(
  videoBuffer: Buffer,
  title = '视频',
  videoName = 'video.mp4'
): Promise<boolean> {
  const fileKey = await uploadFile(videoBuffer, videoName, 'video')
  if (!fileKey) return false
  return sendMessage('video', { file_key: fileKey, title })
}

/**
 * 发送图文混合消息（图片 + 文字）
 */
export async function sendImageWithText(
  imageBuffer: Buffer,
  title: string,
  content: string
): Promise<boolean> {
  const imageKey = await uploadFile(imageBuffer, 'image.png', 'image')
  if (!imageKey) return false

  const timestamp = new Date().toLocaleString('zh-CN')
  return sendMessage('post', {
    post: {
      zh_cn: {
        title,
        content: [
          [{ tag: 'img', image_key: imageKey }],
          [{ tag: 'text', text: content }],
          [{ tag: 'text', text: `\n⏰ ${timestamp}` }],
        ],
      },
    },
  })
}

/**
 * 发送视频 + 文字混合消息
 */
export async function sendVideoWithText(
  videoBuffer: Buffer,
  title: string,
  content: string,
  videoName = 'video.mp4'
): Promise<boolean> {
  const fileKey = await uploadFile(videoBuffer, videoName, 'video')
  if (!fileKey) return false

  const timestamp = new Date().toLocaleString('zh-CN')
  return sendMessage('post', {
    post: {
      zh_cn: {
        title,
        content: [
          [{ tag: 'video', file_key: fileKey, title }],
          [{ tag: 'text', text: content }],
          [{ tag: 'text', text: `\n⏰ ${timestamp}` }],
        ],
      },
    },
  })
}