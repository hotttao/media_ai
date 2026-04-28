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
  const baseName = path.basename(originalName, ext)
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

// 上传文件到外部图片服务
export async function uploadToImageService(
  file: File | Buffer,
  teamId: string,
  subDir: string = ''
): Promise<string> {
  const formData = new FormData()

  if (Buffer.isBuffer(file)) {
    // 如果是 Buffer，转换为 Uint8Array 再转为 Blob
    const uint8Array = new Uint8Array(file)
    const blob = new Blob([uint8Array], { type: 'image/jpeg' })
    formData.append('file', blob, 'upload.jpg')
  } else {
    formData.append('file', file)
  }

  formData.append('teamId', teamId)
  if (subDir) {
    formData.append('subDir', subDir)
  }

  const response = await fetch(`${IMAGE_SERVICE_BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`Upload to image service failed: ${response.statusText}`)
  }

  const data = await response.json()
  // 返回完整的图片服务 URL
  return `${IMAGE_SERVICE_BASE_URL}${data.url}`
}

// 获取完整的图片 URL（添加图片服务前缀）
export function getFullImageUrl(relativePath: string | null | undefined): string {
  if (!relativePath) return ''

  // 如果已经是完整 URL，直接返回
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath
  }

  // 添加图片服务前缀
  return `${IMAGE_SERVICE_BASE_URL}${relativePath}`
}

// 获取图片服务基础 URL
export function getImageServiceBaseUrl(): string {
  return IMAGE_SERVICE_BASE_URL
}