import fs from 'fs'
import path from 'path'
import { v4 as uuid } from 'uuid'

// 图片服务配置 - 上传和下载都通过这个服务
const IMAGE_SERVICE_BASE_URL = process.env.IMAGE_SERVICE_BASE_URL || 'http://192.168.2.38'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')

// Ensure upload directory exists
export function ensureUploadDir(teamId: string): string {
  const teamDir = path.join(UPLOAD_DIR, 'teams', teamId)
  if (!fs.existsSync(teamDir)) {
    fs.mkdirSync(teamDir, { recursive: true })
  }
  return teamDir
}

// Generate unique filename preserving extension
export function generateFileName(originalName: string): string {
  const ext = path.extname(originalName)
  // 移除中文字符和空格，只保留安全的字符
  const baseName = path.basename(originalName, ext).replace(/[^\x00-\x7F]/g, '').replace(/\s+/g, '_')
  return `${baseName}_${uuid()}${ext}`
}

// Get public URL path for a file
export function getPublicUrl(teamId: string, fileName: string): string {
  // Normalize Windows backslashes to forward slashes for URLs
  const normalizedFileName = fileName.replace(/\\/g, '/')
  return `/uploads/teams/${teamId}/${normalizedFileName}`
}

// Delete a file
export function deleteFile(teamId: string, fileName: string): void {
  const filePath = path.join(UPLOAD_DIR, 'teams', teamId, fileName)
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }
}

// Get full filesystem path
export function getFilePath(teamId: string, fileName: string): string {
  return path.join(UPLOAD_DIR, 'teams', teamId, fileName)
}

// 保存文件到本地（用于本地开发或切换存储方式）
export async function saveToLocal(
  file: File | Buffer,
  teamId: string,
  subDir: string = '',
  fileName?: string
): Promise<string> {
  // 从 File 对象或参数获取原始文件名
  const originalName = fileName || (file instanceof File ? file.name : 'upload.jpg')
  const finalFileName = generateFileName(originalName)

  // 构建本地保存路径
  const teamDir = ensureUploadDir(teamId)
  const fullDir = subDir ? path.join(teamDir, subDir) : teamDir

  // 确保子目录存在
  if (!fs.existsSync(fullDir)) {
    fs.mkdirSync(fullDir, { recursive: true })
  }

  const filePath = path.join(fullDir, finalFileName)

  // 写入文件
  if (Buffer.isBuffer(file)) {
    fs.writeFileSync(filePath, file)
  } else {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    fs.writeFileSync(filePath, buffer)
  }

  // 返回相对路径
  const relativePath = `/uploads/teams/${teamId}${subDir ? `/${subDir}` : ''}/${finalFileName}`
  console.log(`[saveToLocal] saved to "${relativePath}"`)
  return relativePath
}

// 上传文件到外部图片服务，同时在本地缓存一份
export async function uploadToRemote(
  file: File | Buffer,
  teamId: string,
  userId: string,
  subDir: string = ''
): Promise<string> {
  const formData = new FormData()

  // 从 File 对象获取原始文件名
  const originalName = file instanceof File ? file.name : 'upload.jpg'
  const fileName = generateFileName(originalName)

  // 获取文件 buffer 用于同时保存本地
  let fileBuffer: Buffer
  if (Buffer.isBuffer(file)) {
    fileBuffer = file
  } else {
    const arrayBuffer = await file.arrayBuffer()
    fileBuffer = Buffer.from(arrayBuffer)
  }

  if (Buffer.isBuffer(file)) {
    // 如果是 Buffer，转换为 Uint8Array 再转为 Blob
    const uint8Array = new Uint8Array(file)
    const blob = new Blob([uint8Array], { type: 'image/jpeg' })
    formData.append('file', blob, fileName)
  } else {
    formData.append('file', file, fileName)
  }

  // 构造上传 URL：/uploads/teams/{teamId}/{subDir}/{filename}
  const filePath = `/uploads/teams/${teamId}${subDir ? `/${subDir}` : ''}/${fileName}`
  const uploadUrl = `${IMAGE_SERVICE_BASE_URL}${filePath}`
  console.log(`[uploadToRemote] POST ${uploadUrl}`)

  const response = await fetch(uploadUrl, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`Upload to image service failed: ${response.statusText} (${response.status})`)
  }

  const data = await response.json()
  console.log(`[uploadToRemote] image service returned url="${data.url}"`)

  // 同时保存到本地缓存（使用与远程相同的文件名）
  await saveToLocal(fileBuffer, teamId, subDir, fileName)
  console.log(`[uploadToRemote] local cache saved for "${filePath}"`)

  // 返回相对路径，与数据库存储格式一致
  return data.url
}

// 兼容旧接口，内部调用 uploadToRemote
export async function uploadToImageService(
  file: File | Buffer,
  teamId: string,
  userId: string,
  subDir: string = ''
): Promise<string> {
  return uploadToRemote(file, teamId, userId, subDir)
}

// 获取完整的图片 URL（添加图片服务前缀）
export function getFullImageUrl(relativePath: string | null | undefined): string {
  if (!relativePath) return ''

  // 如果已经是完整 URL，直接返回
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath
  }

  // 对路径进行编码，处理中文和特殊字符
  const encodedPath = relativePath.split('/').map(encodeURIComponent).join('/')

  // 添加图片服务前缀
  const fullUrl = `${IMAGE_SERVICE_BASE_URL}${encodedPath}`
  console.log(`[getFullImageUrl] relativePath="${relativePath}" -> fullUrl="${fullUrl}"`)

  return fullUrl
}

// 获取图片服务基础 URL
export function getImageServiceBaseUrl(): string {
  return IMAGE_SERVICE_BASE_URL
}