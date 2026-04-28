import { describe, expect, it, vi, beforeEach } from 'vitest'

// 模拟 uuid
vi.mock('uuid', () => ({ v4: () => 'test-uuid-1234' }))

// Mock fs and path with importOriginal pattern
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>()
  return {
    ...actual,
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    unlinkSync: vi.fn(),
  }
})

vi.mock('path', async (importOriginal) => {
  const actual = await importOriginal<typeof import('path')>()
  return {
    ...actual,
    join: vi.fn((...args: string[]) => args.join('/')),
    extname: vi.fn((f: string) => '.' + f.split('.').pop()),
    basename: vi.fn((f: string, _ext: string) => f.split('/').pop()!.replace(/\.[^.]+$/, '')),
  }
})

describe('saveToLocal path format', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('返回路径格式与数据库存储格式一致', async () => {
    const { saveToLocal } = await import('./file-upload')

    const teamId = '18982144-3d42-4a51-98d8-4d6959332d66'
    const subDir = 'model-images'
    const file = new File([new ArrayBuffer(1)], 'test.png', { type: 'image/png' })

    const result = await saveToLocal(file, teamId, subDir)

    // 验证路径格式：/uploads/teams/{teamId}/{subDir}/{baseName}_{uuid}.{ext}
    expect(result).toBe(`/uploads/teams/${teamId}/${subDir}/test_test-uuid-1234.png`)
  })

  it('无 subDir 时路径格式正确', async () => {
    const { saveToLocal } = await import('./file-upload')

    const teamId = '18982144-3d42-4a51-98d8-4d6959332d66'
    const file = new File([new ArrayBuffer(1)], 'avatar.jpg', { type: 'image/jpeg' })

    const result = await saveToLocal(file, teamId)

    expect(result).toBe(`/uploads/teams/${teamId}/avatar_test-uuid-1234.jpg`)
  })

  it('Buffer 类型返回路径格式正确', async () => {
    const { saveToLocal } = await import('./file-upload')

    const teamId = '18982144-3d42-4a51-98d8-4d6959332d66'
    const subDir = 'model-images'
    const buffer = Buffer.from([1, 2, 3])

    const result = await saveToLocal(buffer, teamId, subDir)

    expect(result).toBe(`/uploads/teams/${teamId}/${subDir}/upload_test-uuid-1234.jpg`)
  })
})

describe('uploadToRemote path format', () => {
  it('上传 URL 路径格式正确', async () => {
    const { uploadToRemote } = await import('./file-upload')

    const teamId = '18982144-3d42-4a51-98d8-4d6959332d66'
    const subDir = 'model-images'
    const file = new File([new ArrayBuffer(1)], 'result-01.png', { type: 'image/png' })

    // Mock fetch
    const mockResponse = {
      ok: true,
      json: async () => ({ url: `/uploads/teams/${teamId}/${subDir}/result-01_test-uuid-1234.png` }),
    }
    global.fetch = vi.fn(() => Promise.resolve(mockResponse)) as any

    const result = await uploadToRemote(file, teamId, 'user-1', subDir)

    // 验证返回的是相对路径
    expect(result).toBe(`/uploads/teams/${teamId}/${subDir}/result-01_test-uuid-1234.png`)

    // 验证 fetch 被调用时的 URL 格式正确
    const fetchCall = (global.fetch as any).mock.calls[0]
    const calledUrl = fetchCall[0]
    expect(calledUrl).toBe(`http://192.168.2.38/uploads/teams/${teamId}/${subDir}/result-01_test-uuid-1234.png`)

    global.fetch = undefined as any
  })
})

describe('路径格式与数据库格式对比', () => {
  const EXPECTED_FORMAT = '/uploads/teams/18982144-3d42-4a51-98d8-4d6959332d66/model-images/result-01_50d394b8-de94-4925-bbba-a7e4e03ec381.png'

  it('saveToLocal 返回格式与标准格式一致', async () => {
    const { saveToLocal } = await import('./file-upload')

    const teamId = '18982144-3d42-4a51-98d8-4d6959332d66'
    const subDir = 'model-images'
    const file = new File([new ArrayBuffer(1)], 'result-01.png', { type: 'image/png' })

    const result = await saveToLocal(file, teamId, subDir)

    // 结果应该符合格式：/uploads/teams/{teamId}/{subDir}/{baseName}_{uuid}.{ext}
    const regex = /^\/uploads\/teams\/18982144-3d42-4a51-98d8-4d6959332d66\/model-images\/result-01_test-uuid-1234\.png$/
    expect(result).toMatch(regex)
  })

  it('uploadToRemote 返回格式与标准格式一致', async () => {
    const { uploadToRemote } = await import('./file-upload')

    const teamId = '18982144-3d42-4a51-98d8-4d6959332d66'
    const subDir = 'model-images'
    const file = new File([new ArrayBuffer(1)], 'result-01.png', { type: 'image/png' })

    const mockResponse = {
      ok: true,
      json: async () => ({ url: EXPECTED_FORMAT }),
    }
    global.fetch = vi.fn(() => Promise.resolve(mockResponse)) as any

    const result = await uploadToRemote(file, teamId, 'user-1', subDir)

    expect(result).toBe(EXPECTED_FORMAT)

    global.fetch = undefined as any
  })
})
