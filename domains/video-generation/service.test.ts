/**
 * service 模块单元测试
 * 测试 generateModelImage 的去重逻辑
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateModelImage } from './service'

// Mock execute function
const mockExecute = vi.fn()

// Mock database
vi.mock('@/foundation/lib/db', () => ({
  db: {
    virtualIp: {
      findUnique: vi.fn(),
    },
    modelImage: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}))

// Mock provider registry
vi.mock('@/foundation/providers/registry', () => ({
  providerRegistry: {
    get: vi.fn(() => ({
      execute: mockExecute,
    })),
  },
}))

describe('generateModelImage deduplication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns existing model image if already generated', async () => {
    const { db } = await import('@/foundation/lib/db')
    const mockIp = { fullBodyUrl: 'https://example.com/body.jpg' }
    const existingImage = {
      id: 'existing-id',
      url: 'https://example.com/model.jpg',
      productId: 'product-1',
      ipId: 'ip-1',
    }

    vi.mocked(db.virtualIp.findUnique).mockResolvedValue(mockIp as any)
    vi.mocked(db.modelImage.findUnique).mockResolvedValue(existingImage as any)

    const result = await generateModelImage('product-1', 'ip-1', 'https://example.com/product.jpg', [])

    expect(result.modelImageId).toBe('existing-id')
    expect(result.modelImageUrl).toBe('https://example.com/model.jpg')
    expect(db.modelImage.create).not.toHaveBeenCalled()
  })

  it('generates new model image if not exists', async () => {
    const { db } = await import('@/foundation/lib/db')
    const mockIp = { fullBodyUrl: 'https://example.com/body.jpg' }
    const newModelImage = {
      id: 'new-id',
      url: 'https://example.com/new-model.jpg',
      productId: 'product-1',
      ipId: 'ip-1',
    }

    vi.mocked(db.virtualIp.findUnique).mockResolvedValue(mockIp as any)
    vi.mocked(db.modelImage.findUnique).mockResolvedValue(null)
    vi.mocked(db.modelImage.create).mockResolvedValue(newModelImage as any)
    mockExecute.mockResolvedValue({
      error: null,
      outputs: { modelImage: 'https://example.com/new-model.jpg' },
    })

    const result = await generateModelImage('product-1', 'ip-1', 'https://example.com/product.jpg', [])

    expect(result.modelImageId).toBe('new-id')
    expect(result.modelImageUrl).toBe('https://example.com/new-model.jpg')
    expect(db.modelImage.create).toHaveBeenCalled()
  })

  it('throws error if IP not found', async () => {
    const { db } = await import('@/foundation/lib/db')
    vi.mocked(db.virtualIp.findUnique).mockResolvedValue(null)

    await expect(
      generateModelImage('product-1', 'ip-1', 'https://example.com/product.jpg', [])
    ).rejects.toThrow('IP ip-1 not found or has no fullBodyUrl')
  })
})
