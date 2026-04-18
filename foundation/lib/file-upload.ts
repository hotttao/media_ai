import fs from 'fs'
import path from 'path'
import { v4 as uuid } from 'uuid'

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