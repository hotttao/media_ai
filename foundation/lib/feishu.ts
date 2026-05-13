// ============ 飞书推送模块 ============

const FEISHU_API_BASE = 'https://open.feishu.cn/open-apis'

interface FeishuConfig {
  appId: string
  appSecret: string
  receiveId: string
  receiveIdType: 'email' | 'open_id' | 'chat_id'
}

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

// ============ 发送消息 ============

async function sendMessage(msgType: string, content: object): Promise<boolean> {
  const config = getConfig()
  const token = await getAccessToken()
  if (!token || !config.receiveId) return false

  const url = `${FEISHU_API_BASE}/im/v1/messages?receive_id_type=${config.receiveIdType}`
  const bodyContent = typeof content === 'string' ? content : JSON.stringify(content)
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      receive_id: config.receiveId,
      msg_type: msgType,
      content: bodyContent,
    }),
  })

  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Feishu API error: ${resp.status} ${resp.statusText}, body: ${text}`)
  }

  const result = await resp.json()
  if (result.code !== 0) {
    throw new Error(`Feishu response error: code=${result.code}, msg=${result.msg}`)
  }
  return true
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
  const imageKey = await uploadImage(imageBuffer, imageName)
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
  const fileKey = await uploadVideo(videoBuffer, videoName)
  if (!fileKey) return false
  return sendMessage('video', { file_key: fileKey, title })
}

// ============ 文件上传 ============

async function uploadImage(imagePath: string): Promise<string> {
  const token = await getAccessToken()
  if (!token) return ''

  // 读取文件
  let imageData: ArrayBuffer
  try {
    const fs = await import('fs')
    imageData = fs.readFileSync(imagePath)
  } catch {
    return ''
  }

  const formData = new FormData()
  formData.append('image', new Blob([new Uint8Array(imageData)]), 'image.png')
  formData.append('image_type', 'message')

  try {
    const resp = await fetch(`${FEISHU_API_BASE}/im/v1/images`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
    const result = await resp.json()
    return result.code === 0 ? result.data?.image_key : ''
  } catch {
    return ''
  }
}

async function uploadVideo(videoPath: string): Promise<string> {
  const token = await getAccessToken()
  if (!token) return ''

  let videoData: ArrayBuffer
  try {
    const fs = await import('fs')
    videoData = fs.readFileSync(videoPath)
  } catch {
    return ''
  }

  const formData = new FormData()
  formData.append('file', new Blob([new Uint8Array(videoData)]), 'video.mp4')

  try {
    const resp = await fetch(`${FEISHU_API_BASE}/im/v1/files`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
    const result = await resp.json()
    return result.code === 0 ? result.data?.file_key : ''
  } catch {
    return ''
  }
}

async function uploadImageBuffer(imageBuffer: Buffer, fileName: string): Promise<string | null> {
  const token = await getAccessToken()
  if (!token) return null

  const formData = new FormData()
  formData.append('image', new Blob([new Uint8Array(imageBuffer)]), fileName)
  formData.append('image_type', 'message')

  try {
    const resp = await fetch(`${FEISHU_API_BASE}/im/v1/images`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
    const result = await resp.json()
    return result.code === 0 ? result.data?.image_key : null
  } catch {
    return null
  }
}

async function uploadVideoBuffer(videoBuffer: Buffer, fileName: string): Promise<string | null> {
  const token = await getAccessToken()
  if (!token) return null

  const formData = new FormData()
  formData.append('file', new Blob([new Uint8Array(videoBuffer)]), fileName)
  formData.append('file_type', 'mp4')

  try {
    const resp = await fetch(`${FEISHU_API_BASE}/im/v1/files`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
    const result = await resp.json()
    return result.code === 0 ? result.data?.file_key : null
  } catch {
    return null
  }
}

/**
 * 发送图片+文字混合消息
 */
export async function sendImageWithText(
  imageBuffer: Buffer,
  title: string,
  content: string
): Promise<boolean> {
  const imageKey = await uploadImageBuffer(imageBuffer, 'image.png')
  if (!imageKey) return false

  const timestamp = new Date().toLocaleString('zh-CN')
  return sendMessage('post', {
    post: {
      zh_cn: {
        title,
        content: [
          [{ tag: 'img', image_key: imageKey }],
          [{ tag: 'text', text: content }],
          [{ tag: 'text', text: `\n\n⏰ ${timestamp}` }],
        ],
      },
    },
  })
}

/**
 * 发送视频+文字混合消息
 */
export async function sendVideoWithText(
  videoBuffer: Buffer,
  title: string,
  content: string,
  videoName = 'video.mp4'
): Promise<boolean> {
  const fileKey = await uploadVideoBuffer(videoBuffer, videoName)
  if (!fileKey) return false

  const timestamp = new Date().toLocaleString('zh-CN')
  const textContent = content?.trim() || title || '视频推送'
  // 先发文本消息
  await sendMessage('text', { text: `${title || '视频推送'}\n\n${textContent}\n\n⏰ ${timestamp}` })
  // 再发视频消息
  return sendMessage('media', { file_key: fileKey, title: title || '视频推送' })
}