export type VideoTaskStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'

export interface VideoTraceResource {
  id: string
  url?: string | null
  name?: string | null
  prompt?: string | null
  content?: string | null
  clothing?: string | null
  composition?: string | null
  createdAt?: string | Date
}

export interface VideoTaskInfo {
  id: string
  status: VideoTaskStatus
  error?: string | null
  createdAt?: string | Date
  startedAt?: string | Date | null
  completedAt?: string | Date | null
  params?: Record<string, unknown> | null
  result?: Record<string, unknown> | null
  workflow?: {
    id: string
    code: string
    name: string
  } | null
  ip?: {
    id: string
    nickname: string
  } | null
}

export interface VideoListItem {
  id: string
  name?: string | null
  url: string
  thumbnail?: string | null
  prompt?: string | null
  createdAt: string | Date
  product?: {
    id: string
    name: string
  } | null
  ip?: {
    id: string
    nickname: string
    avatarUrl?: string | null
  } | null
  task?: VideoTaskInfo | null
  trace?: {
    movement?: VideoTraceResource | null
    firstFrame?: VideoTraceResource | null
    scene?: VideoTraceResource | null
    pose?: VideoTraceResource | null
    styleImage?: VideoTraceResource | null
    modelImage?: VideoTraceResource | null
  } | null
}

export interface VideoDetail extends VideoListItem {
  product?: (NonNullable<VideoListItem['product']> & {
    images?: Array<{
      id: string
      url: string
      isMain: boolean
      order: number
    }>
  }) | null
  ip?: {
    id: string
    nickname: string
    avatarUrl?: string | null
    fullBodyUrl?: string | null
  } | null
  relatedVideos: VideoListItem[]
}

export function getTaskStatusLabel(status?: string | null) {
  switch (status) {
    case 'RUNNING':
      return '生成中'
    case 'COMPLETED':
      return '已完成'
    case 'FAILED':
      return '失败'
    default:
      return '等待中'
  }
}

export function formatDateTime(value?: string | Date | null) {
  if (!value) {
    return '未记录'
  }

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '未记录'
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
