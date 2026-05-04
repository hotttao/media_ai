import { NextRequest } from 'next/server'

// Mock all external dependencies at module level
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/foundation/lib/db', () => ({
  db: {
    styleImage: {
      findUnique: vi.fn(),
    },
    firstFrame: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    alternativeImage: {
      create: vi.fn(),
    },
    material: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/foundation/lib/file-upload', () => ({
  uploadToImageService: vi.fn(),
}))

vi.mock('@/domains/video-generation/image-prompt', () => ({
  buildGeneratedImagePrompt: vi.fn(),
}))

// Import after mocks are set up
const { db } = await import('@/foundation/lib/db')
const { uploadToImageService } = await import('@/foundation/lib/file-upload')
const { buildGeneratedImagePrompt } = await import('@/domains/video-generation/image-prompt')
const { getServerSession } = await import('next-auth')
const { POST } = await import('@/app/api/products/[id]/first-frame-upload/route')

function createMockFile(name: string): File {
  const blob = new Blob(['fake image data'], { type: 'image/jpeg' })
  return new File([blob], name, { type: 'image/jpeg' })
}

function createFormData(files: File[], styleImageId: string, sceneId?: string, composition?: string, prompt?: string) {
  const formData = new FormData()
  files.forEach(file => formData.append('files', file))
  formData.append('styleImageId', styleImageId)
  if (sceneId) formData.append('sceneId', sceneId)
  if (composition) formData.append('composition', composition)
  if (prompt) formData.append('prompt', prompt)
  return formData
}

describe('first-frame-upload API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(buildGeneratedImagePrompt).mockReturnValue('test prompt')
  })

  it('returns 401 without session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const formData = createFormData([createMockFile('test.jpg')], 'style-1', 'scene-1', 'comp-1')
    formData.append('generationPath', 'jimeng')

    const response = await POST(
      new NextRequest('http://localhost/api/products/product-1/first-frame-upload', {
        method: 'POST',
        body: formData,
      }),
      { params: { id: 'product-1' } }
    )

    expect(response.status).toBe(401)
  })

  it('returns 400 when no files provided', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-1', teamId: 'team-1' },
    })

    const formData = new FormData()
    formData.append('styleImageId', 'style-1')
    formData.append('generationPath', 'jimeng')

    const response = await POST(
      new NextRequest('http://localhost/api/products/product-1/first-frame-upload', {
        method: 'POST',
        body: formData,
      }),
      { params: { id: 'product-1' } }
    )

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBe('No files provided')
  })

  it('returns 400 when styleImageId is missing', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-1', teamId: 'team-1' },
    })

    const formData = createFormData([createMockFile('test.jpg')], '')
    formData.append('generationPath', 'jimeng')

    const response = await POST(
      new NextRequest('http://localhost/api/products/product-1/first-frame-upload', {
        method: 'POST',
        body: formData,
      }),
      { params: { id: 'product-1' } }
    )

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBe('Missing required fields: styleImageId, generationPath')
  })

  it('returns 404 when styleImage not found', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-1', teamId: 'team-1' },
    })
    vi.mocked(db.styleImage.findUnique).mockResolvedValue(null)

    const formData = createFormData([createMockFile('test.jpg')], 'non-existent-style', 'scene-1', 'comp-1')
    formData.append('generationPath', 'jimeng')

    const response = await POST(
      new NextRequest('http://localhost/api/products/product-1/first-frame-upload', {
        method: 'POST',
        body: formData,
      }),
      { params: { id: 'product-1' } }
    )

    expect(response.status).toBe(404)
  })

  it('creates new firstFrame and alternativeImages for multiple files', async () => {
    const mockStyleImage = { id: 'style-1', ipId: 'ip-1' }
    const mockFirstFrame = { id: 'ff-1', url: '' }
    const mockAlternative1 = { id: 'alt-1' }
    const mockAlternative2 = { id: 'alt-2' }

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-1', teamId: 'team-1' },
    })
    vi.mocked(db.styleImage.findUnique).mockResolvedValue(mockStyleImage as any)
    vi.mocked(db.firstFrame.findUnique).mockResolvedValue(null)
    vi.mocked(db.firstFrame.create).mockResolvedValue(mockFirstFrame as any)
    vi.mocked(db.firstFrame.update).mockResolvedValue({ ...mockFirstFrame, url: '/uploads/test1.jpg' } as any)
    vi.mocked(db.alternativeImage.create)
      .mockResolvedValueOnce(mockAlternative1 as any)
      .mockResolvedValueOnce(mockAlternative2 as any)
    vi.mocked(uploadToImageService)
      .mockResolvedValueOnce('/uploads/test1.jpg')
      .mockResolvedValueOnce('/uploads/test2.jpg')

    const formData = createFormData(
      [createMockFile('test1.jpg'), createMockFile('test2.jpg')],
      'style-1',
      'scene-1',
      'comp-1',
      'custom prompt'
    )
    formData.append('generationPath', 'jimeng')

    const response = await POST(
      new NextRequest('http://localhost/api/products/product-1/first-frame-upload', {
        method: 'POST',
        body: formData,
      }),
      { params: { id: 'product-1' } }
    )

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.success).toBe(true)
    expect(json.count).toBe(2)
    expect(json.results[0].status).toBe('created')
    expect(json.results[0].firstFrameId).toBe('ff-1')
    expect(json.results[0].firstFrameUrl).toBe('/uploads/test1.jpg')
    expect(json.results[1].firstFrameUrl).toBe('/uploads/test2.jpg')
    expect(db.firstFrame.create).toHaveBeenCalledTimes(1)
    expect(db.firstFrame.update).toHaveBeenCalledTimes(1)
    expect(db.alternativeImage.create).toHaveBeenCalledTimes(2)
  })

  it('uses existing firstFrame when duplicate key exists', async () => {
    const existingFirstFrame = { id: 'existing-ff', url: '/uploads/existing.jpg' }
    const mockStyleImage = { id: 'style-1', ipId: 'ip-1' }
    const mockAlternative = { id: 'alt-1' }

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-1', teamId: 'team-1' },
    })
    vi.mocked(db.styleImage.findUnique).mockResolvedValue(mockStyleImage as any)
    vi.mocked(db.firstFrame.findUnique).mockResolvedValue(existingFirstFrame as any)
    vi.mocked(db.alternativeImage.create).mockResolvedValue(mockAlternative as any)
    vi.mocked(uploadToImageService).mockResolvedValue('/uploads/new.jpg')

    const formData = createFormData([createMockFile('test.jpg')], 'style-1', 'scene-1', 'comp-1')
    formData.append('generationPath', 'jimeng')

    const response = await POST(
      new NextRequest('http://localhost/api/products/product-1/first-frame-upload', {
        method: 'POST',
        body: formData,
      }),
      { params: { id: 'product-1' } }
    )

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.success).toBe(true)
    expect(json.results[0].status).toBe('existing')
    expect(json.results[0].firstFrameId).toBe('existing-ff')
    expect(json.results[0].firstFrameUrl).toBe('/uploads/existing.jpg')
    expect(db.firstFrame.create).not.toHaveBeenCalled()
    expect(db.firstFrame.update).not.toHaveBeenCalled()
    expect(db.alternativeImage.create).toHaveBeenCalledTimes(1)
  })

  it('updates firstFrame url with first uploaded image', async () => {
    const mockStyleImage = { id: 'style-1', ipId: 'ip-1' }
    const mockFirstFrame = { id: 'ff-1', url: '' }

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-1', teamId: 'team-1' },
    })
    vi.mocked(db.styleImage.findUnique).mockResolvedValue(mockStyleImage as any)
    vi.mocked(db.firstFrame.findUnique).mockResolvedValue(null)
    vi.mocked(db.firstFrame.create).mockResolvedValue(mockFirstFrame as any)
    vi.mocked(db.firstFrame.update).mockResolvedValue({ ...mockFirstFrame, url: '/uploads/first.jpg' } as any)
    vi.mocked(db.alternativeImage.create).mockResolvedValue({ id: 'alt-1' } as any)
    vi.mocked(uploadToImageService)
      .mockResolvedValueOnce('/uploads/first.jpg')
      .mockResolvedValueOnce('/uploads/second.jpg')

    const formData = createFormData(
      [createMockFile('first.jpg'), createMockFile('second.jpg')],
      'style-1',
      'scene-1',
      'comp-1'
    )
    formData.append('generationPath', 'jimeng')

    const response = await POST(
      new NextRequest('http://localhost/api/products/product-1/first-frame-upload', {
        method: 'POST',
        body: formData,
      }),
      { params: { id: 'product-1' } }
    )

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.results[0].firstFrameUrl).toBe('/uploads/first.jpg')
    expect(json.results[1].firstFrameUrl).toBe('/uploads/second.jpg')
    expect(db.firstFrame.update).toHaveBeenCalledWith({
      where: { id: 'ff-1' },
      data: { url: '/uploads/first.jpg' },
    })
  })
})