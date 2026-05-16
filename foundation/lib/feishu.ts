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
  if (!token || !config.receiveId) {
    const errMsg = `飞书配置错误: token=${!!token}, receiveId=${!!config.receiveId}`
    console.error('[Feishu] sendMessage:', errMsg)
    throw new Error(errMsg)
  }

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

  const text = await resp.text()
  if (!resp.ok) {
    const errMsg = `飞书发送消息HTTP错误: ${resp.status} ${resp.statusText}, body: ${text}`
    console.error('[Feishu] sendMessage HTTP error:', errMsg)
    throw new Error(errMsg)
  }

  const result = JSON.parse(text)
  if (result.code !== 0) {
    const errMsg = `飞书发送消息失败: code=${result.code}, msg=${result.msg}`
    console.error('[Feishu] sendMessage logic error:', errMsg)
    throw new Error(errMsg)
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
  if (!token) {
    console.error('[Feishu] uploadImage: no token')
    throw new Error('飞书未配置 App ID 或 App Secret')
  }

  // 读取文件
  let imageData: Buffer
  try {
    const fs = await import('fs')
    imageData = fs.readFileSync(imagePath)
  } catch (err) {
    console.error('[Feishu] uploadImage: read file error', err)
    throw new Error(`读取图片文件失败: ${imagePath}`)
  }

  const formData = new FormData()
  formData.append('image', new Blob([new Uint8Array(imageData)]), 'image.png')
  formData.append('image_type', 'message')

  const resp = await fetch(`${FEISHU_API_BASE}/im/v1/images`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  const result = await resp.json()
  if (result.code !== 0) {
    const errMsg = `飞书上上传图片失败: code=${result.code}, msg=${result.msg}`
    console.error('[Feishu] uploadImage API error:', errMsg)
    throw new Error(errMsg)
  }
  return result.data?.image_key || ''
}

async function uploadVideo(videoPath: string): Promise<string> {
  const token = await getAccessToken()
  if (!token) {
    console.error('[Feishu] uploadVideo: no token')
    throw new Error('飞书未配置 App ID 或 App Secret')
  }

  let videoData: Buffer
  try {
    const fs = await import('fs')
    videoData = fs.readFileSync(videoPath)
  } catch (err) {
    console.error('[Feishu] uploadVideo: read file error', err)
    throw new Error(`读取视频文件失败: ${videoPath}`)
  }

  const formData = new FormData()
  formData.append('file', new Blob([new Uint8Array(videoData)]), 'video.mp4')

  const resp = await fetch(`${FEISHU_API_BASE}/im/v1/files`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  const result = await resp.json()
  if (result.code !== 0) {
    const errMsg = `飞书上传视频失败: code=${result.code}, msg=${result.msg}`
    console.error('[Feishu] uploadVideo API error:', errMsg)
    throw new Error(errMsg)
  }
  return result.data?.file_key || ''
}

async function uploadImageBuffer(imageBuffer: Buffer, fileName: string): Promise<string | null> {
  const token = await getAccessToken()
  if (!token) {
    console.error('[Feishu] uploadImageBuffer: no token')
    return null
  }

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
    if (result.code !== 0) {
      const errMsg = `飞书上上传图片失败: code=${result.code}, msg=${result.msg}`
      console.error('[Feishu] uploadImageBuffer failed:', errMsg)
      throw new Error(errMsg)
    }
    return result.data?.image_key || null
  } catch (err) {
    if (err instanceof Error && err.message.includes('飞书')) throw err
    console.error('[Feishu] uploadImageBuffer exception:', err)
    return null
  }
}

async function uploadVideoBuffer(videoBuffer: Buffer, fileName: string): Promise<string | null> {
  const token = await getAccessToken()
  if (!token) {
    console.error('[Feishu] uploadVideoBuffer: no token')
    return null
  }

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
    if (result.code !== 0) {
      const errMsg = `飞书上传视频失败: code=${result.code}, msg=${result.msg}`
      console.error('[Feishu] uploadVideoBuffer failed:', errMsg)
      return null  // 返回 null 不抛异常，让调用方统一处理
    }
    return result.data?.file_key || null
  } catch (err) {
    console.error('[Feishu] uploadVideoBuffer exception:', err)
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
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = []
  const timestamp = new Date().toLocaleString('zh-CN')

  const imageKey = await uploadImageBuffer(imageBuffer, 'image.png')
  if (!imageKey) {
    errors.push(`图片上传失败`)
  } else {
    try {
      await sendMessage('post', {
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
    } catch (err) {
      errors.push(`图片消息发送失败: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return { success: errors.length === 0, errors }
}

/**
 * 发送视频+文字混合消息
 * 视频推送和封面图作为两条独立消息发送，封面图始终推送
 */
export async function sendVideoWithText(
  videoBuffer: Buffer,
  title: string,
  content: string,
  videoName = 'video.mp4',
  thumbnailBuffer?: Buffer | null
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = []
  const timestamp = new Date().toLocaleString('zh-CN')
  const textContent = content?.trim() || title || '视频推送'

  // 1. 先发文本消息
  try {
    await sendMessage('text', { text: `${title || '视频推送'}\n\n${textContent}\n\n⏰ ${timestamp}` })
  } catch (err) {
    errors.push(`文本消息发送失败: ${err instanceof Error ? err.message : String(err)}`)
  }

  // 2. 发视频消息（独立于封面图）
  const fileKey = await uploadVideoBuffer(videoBuffer, videoName)
  if (!fileKey) {
    errors.push(`视频上传失败: 文件大小超过飞书限制或格式不支持`)
  } else {
    try {
      await sendMessage('media', { file_key: fileKey, title: title || '视频推送' })
    } catch (err) {
      errors.push(`视频消息发送失败: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // 3. 封面图始终推送（与视频成功/失败无关）
  if (thumbnailBuffer && thumbnailBuffer.length > 0) {
    const imageKey = await uploadImageBuffer(thumbnailBuffer, 'thumbnail.png')
    if (imageKey) {
      try {
        await sendMessage('image', { image_key: imageKey })
      } catch (err) {
        errors.push(`封面图消息发送失败: ${err instanceof Error ? err.message : String(err)}`)
      }
    } else {
      errors.push(`封面上传失败`)
    }
  }

  return { success: errors.length === 0, errors }
}