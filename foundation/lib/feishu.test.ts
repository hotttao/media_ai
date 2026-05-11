import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('Feishu 模块', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('sendTextMessage 返回 boolean', async () => {
    // Mock token response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        code: 0,
        tenant_access_token: 'test-token',
        expire: 7200,
      }),
    }).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ code: 0 }),
    })

    const { sendTextMessage } = await import('@/foundation/lib/feishu')
    const result = await sendTextMessage('测试', '内容')

    // 返回值应该是 boolean
    expect(typeof result).toBe('boolean')
  })

  it('无配置时 sendTextMessage 返回 false', async () => {
    // 确保环境变量未设置
    delete process.env.FEISHU_APP_ID
    delete process.env.FEISHU_APP_SECRET

    const { sendTextMessage } = await import('@/foundation/lib/feishu')
    const result = await sendTextMessage('测试', '内容')

    expect(result).toBe(false)
  })

  afterEach(() => {
    vi.unstubGlobal('fetch')
  })
})