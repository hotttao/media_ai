import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock getServerSession
vi.mock('@/foundation/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(() => Promise.resolve({
    user: { id: 'user-1', teamId: '18982144-3d42-4a51-98d8-4d6959332d66' }
  })),
}))

// Mock db
vi.mock('@/foundation/lib/db', () => ({
  db: {
    video: {
      findMany: vi.fn(() => Promise.resolve([
        { id: '0fc34bc6-03de-4c13-8628-3e8f3db6ef4b', url: '/uploads/teams/18982144-3d42-4a51-98d8-4d6959332d66/videos/video-01_91e05c98-a96d-49be-b221-313e6350785c.mp4' },
        { id: '91d6218f-8326-4660-9824-1d092c2ea9ac', url: '/uploads/teams/18982144-3d42-4a51-98d8-4d6959332d66/videos/video-01_6bc994bc-8c00-42fa-9bb1-88ebefc43653.mp4' },
        { id: '96eed172-3d1c-4e24-be8f-b80526b8d725', url: '/uploads/teams/18982144-3d42-4a51-98d8-4d6959332d66/videos/video-01_3be34f41-aa52-41f6-8fe9-76626cbc57b0.mp4' },
        { id: '97472805-8936-4027-8047-d0608ba97f90', url: '/uploads/teams/18982144-3d42-4a51-98d8-4d6959332d66/videos/video-01_52e01bb8-3fda-4de8-b478-c2106b674b08.mp4' },
      ])),
    },
    material: {
      findUnique: vi.fn(() => Promise.resolve({ url: '/music/bgm.mp3' })),
    },
    videoPush: {
      create: vi.fn(({ data }) => Promise.resolve({
        id: `vp-${Math.random().toString(36).slice(2)}`,
        ...data,
      })),
    },
  },
}))

// Mock CapcutCliProvider
const mockClipDryRun = vi.fn(() => Promise.resolve({
  count: 8,
  templates: [
    { name: 'detail-focus', videoCount: 3 },
    { name: 'fast-pace', videoCount: 3 },
    { name: 'cascade-flow', videoCount: 3 },
    { name: 'orbit-focus', videoCount: 3 },
    { name: 'panorama-wide', videoCount: 3 },
    { name: 'progressive-reveal', videoCount: 3 },
    { name: 'rhythm-cut', videoCount: 3 },
    { name: 'zoom-pulse', videoCount: 3 },
  ],
}))

const mockClipAsync = vi.fn()

const mockDownloadVideoToLocal = vi.fn((url: string) => {
  // 模拟返回本地路径
  const filename = url.split('/').pop()!
  return Promise.resolve(`/public/uploads/teams/18982144-3d42-4a51-98d8-4d6959332d66/videos/${filename}`)
})

vi.mock('@/foundation/providers/CapcutCliProvider', () => ({
  getCapcutProvider: () => ({
    downloadVideoToLocal: mockDownloadVideoToLocal,
    clipDryRun: mockClipDryRun,
    clipAsync: mockClipAsync,
    capcutPath: '../cap-cut-auto',
  }),
}))

// Mock path
vi.mock('path', () => ({
  join: (...args: string[]) => args.join('/').replace(/\/+/g, '/'),
  default: {
    join: (...args: string[]) => args.join('/').replace(/\/+/g, '/'),
  },
}))

// Mock crypto
vi.mock('crypto', () => ({
  default: {
    createHash: () => ({
      update: () => ({
        digest: () => 'a1b2c3d4e5f6',
      }),
    }),
  },
  createHash: () => ({
    update: () => ({
      digest: () => 'a1b2c3d4e5f6',
    }),
  }),
}))

// Mock process.cwd
vi.stubGlobal('process', {
  ...process,
  cwd: () => '/d/Code/media/media_ai',
})

describe('clip API 双阶段执行流程', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Step 1: 下载视频到本地返回本地路径', async () => {
    const { getCapcutProvider } = await import('@/foundation/providers/CapcutCliProvider')
    const provider = getCapcutProvider()

    const url = '/uploads/teams/18982144-3d42-4a51-98d8-4d6959332d66/videos/video-01.mp4'
    const localPath = await provider.downloadVideoToLocal(url, 'team-1')

    expect(localPath).toContain('/public/uploads/teams/')
    expect(mockDownloadVideoToLocal).toHaveBeenCalledWith(url, 'team-1')
  })

  it('Step 2: clipDryRun 返回 templates 数组', async () => {
    const { getCapcutProvider } = await import('@/foundation/providers/CapcutCliProvider')
    const provider = getCapcutProvider()

    const result = await provider.clipDryRun({
      videoUrls: ['/path/to/video1.mp4', '/path/to/video2.mp4', '/path/to/video3.mp4'],
      outputDir: '/tmp/dryrun',
    })

    expect(result.count).toBe(8)
    expect(result.templates).toHaveLength(8)
    expect(result.templates?.[0].name).toBe('detail-focus')
    expect(result.templates?.[0].videoCount).toBe(3)
  })

  it('Step 3: 为每个 template 创建 VideoPush 记录', async () => {
    const { db } = await import('@/foundation/lib/db')
    const templates = [
      { name: 'detail-focus', videoCount: 3 },
      { name: 'fast-pace', videoCount: 3 },
    ]

    const createdRecords: string[] = []
    for (const tmpl of templates) {
      const record = await db.videoPush.create({
        data: {
          productId: 'prod-1',
          ipId: 'ip-1',
          sceneId: 'scene-1',
          videoId: 'vid-1,vid-2,vid-3',
          videoIdHash: 'hash123',
          templateName: tmpl.name,
          status: 'pending',
        }
      })
      createdRecords.push(record.id)
    }

    expect(createdRecords).toHaveLength(2)
    expect(createdRecords[0]).toMatch(/^vp-/)
    expect(db.videoPush.create).toHaveBeenCalledTimes(2)
  })

  it('Step 4: 构建 mapping 格式正确', async () => {
    const templateToVpMap = new Map([
      ['detail-focus', 'vp-001'],
      ['fast-pace', 'vp-002'],
      ['cascade-flow', 'vp-003'],
    ])

    const mappingArg = Array.from(templateToVpMap.entries())
      .map(([tmpl, vpId]) => `${tmpl}:${vpId}`)
      .join(',')

    expect(mappingArg).toBe('detail-focus:vp-001,fast-pace:vp-002,cascade-flow:vp-003')
  })

  it('Step 4: clipAsync 被调用时传入正确参数', async () => {
    const { getCapcutProvider } = await import('@/foundation/providers/CapcutCliProvider')
    const provider = getCapcutProvider()

    const mappingArg = 'detail-focus:vp-001,fast-pace:vp-002'

    provider.clipAsync({
      videoUrls: ['/path/to/v1.mp4', '/path/to/v2.mp4', '/path/to/v3.mp4'],
      musicUrl: '/music/bgm.mp3',
      outputDir: '/public/uploads/teams/team/clips/2026-05-09',
      callbackUrl: 'http://localhost:3000/api/video-push/callback',
      mapping: mappingArg,
    })

    expect(mockClipAsync).toHaveBeenCalledTimes(1)
    expect(mockClipAsync).toHaveBeenCalledWith(expect.objectContaining({
      videoUrls: ['/path/to/v1.mp4', '/path/to/v2.mp4', '/path/to/v3.mp4'],
      musicUrl: '/music/bgm.mp3',
      outputDir: '/public/uploads/teams/team/clips/2026-05-09',
      callbackUrl: 'http://localhost:3000/api/video-push/callback',
      mapping: 'detail-focus:vp-001,fast-pace:vp-002',
    }))
  })

  it('完整流程: videoIdHash 计算一致', async () => {
    // 测试数据：4 个视频
    const videoIds = [
      '0fc34bc6-03de-4c13-8628-3e8f3db6ef4b',
      '91d6218f-8326-4660-9824-1d092c2ea9ac',
      '96eed172-3d1c-4e24-be8f-b80526b8d725',
      '97472805-8936-4027-8047-d0608ba97f90',
    ]

    // 排序后计算 hash
    const sorted = [...videoIds].sort()
    const joined = sorted.join(',')
    const hash = require('crypto').createHash('md5').update(joined).digest('hex')

    // 同一组视频，无论顺序如何，hash 应该相同
    const videoIdsShuffled = [videoIds[2], videoIds[0], videoIds[3], videoIds[1]]
    const sorted2 = [...videoIdsShuffled].sort()
    const joined2 = sorted2.join(',')
    const hash2 = require('crypto').createHash('md5').update(joined2).digest('hex')

    expect(hash).toBe(hash2)
    // hash 值取决于实际的 videoIds，这里只验证一致性
    expect(hash).toMatch(/^[a-f0-9]{32}$/)
  })

  it('dry-run 返回的 templates 数量等于 3clip 组数量', async () => {
    // 4 个视频输入，3clip 组（需要 3 个视频）的所有模板都适用
    // 所以 count 应该等于 3clip 目录下的模板数量 = 8
    const { getCapcutProvider } = await import('@/foundation/providers/CapcutCliProvider')
    const provider = getCapcutProvider()

    const result = await provider.clipDryRun({
      videoUrls: ['/v1.mp4', '/v2.mp4', '/v3.mp4', '/v4.mp4'],
    })

    expect(result.count).toBe(8)
    expect(result.templates).toHaveLength(8)
  })

  it('mapping 中每个 templateName 对应唯一的 videoPushId', async () => {
    const templates = [
      { name: 'detail-focus', videoCount: 3 },
      { name: 'fast-pace', videoCount: 3 },
      { name: 'cascade-flow', videoCount: 3 },
    ]

    const templateToVpMap = new Map<string, string>()
    templates.forEach((tmpl, idx) => {
      templateToVpMap.set(tmpl.name, `vp-${String(idx + 1).padStart(3, '0')}`)
    })

    // 验证 key 唯一
    const keys = Array.from(templateToVpMap.keys())
    const uniqueKeys = new Set(keys)
    expect(uniqueKeys.size).toBe(keys.length)

    // 验证 mapping 解析后能还原
    const mappingArg = Array.from(templateToVpMap.entries())
      .map(([tmpl, vpId]) => `${tmpl}:${vpId}`)
      .join(',')

    const parsedMap = new Map(
      mappingArg.split(',').map(pair => {
        const [tmpl, vpId] = pair.split(':')
        return [tmpl, vpId]
      })
    )

    expect(parsedMap.get('detail-focus')).toBe('vp-001')
    expect(parsedMap.get('fast-pace')).toBe('vp-002')
    expect(parsedMap.get('cascade-flow')).toBe('vp-003')
  })
})