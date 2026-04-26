const mockDb = vi.hoisted(() => ({
  workflow: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
  },
}))

vi.mock('@/foundation/lib/db', () => ({
  db: mockDb,
}))

import { getWorkflowByCode, getWorkflows } from './service'

describe('workflow service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('hides manual_upload workflows from the catalog list', async () => {
    mockDb.workflow.findMany.mockResolvedValue([
      {
        id: 'workflow-manual',
        code: 'manual_upload',
        name: 'Manual Upload',
        version: '1.0',
        config: null,
      },
      {
        id: 'workflow-db',
        code: 'db-workflow',
        name: 'Database Workflow',
        version: '1.0',
        config: JSON.stringify([{ id: 'node-1' }]),
      },
    ])

    const workflows = await getWorkflows()

    expect(mockDb.workflow.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
    })
    expect(workflows.some((workflow) => workflow.code === 'manual_upload')).toBe(false)
    expect(workflows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'db-workflow',
          nodes: [{ id: 'node-1' }],
          edges: [],
        }),
      ])
    )
  })

  it('does not resolve manual_upload as a runnable workflow', async () => {
    const workflow = await getWorkflowByCode('manual_upload')

    expect(workflow).toBeNull()
    expect(mockDb.workflow.findUnique).not.toHaveBeenCalled()
  })

  it('resolves normal database workflows by code', async () => {
    mockDb.workflow.findUnique.mockResolvedValue({
      id: 'workflow-db',
      code: 'db-workflow',
      name: 'Database Workflow',
      version: '1.0',
      config: JSON.stringify([{ id: 'node-1' }]),
    })

    const workflow = await getWorkflowByCode('db-workflow')

    expect(mockDb.workflow.findUnique).toHaveBeenCalledWith({
      where: { code: 'db-workflow' },
    })
    expect(workflow).toEqual(expect.objectContaining({
      code: 'db-workflow',
      nodes: [{ id: 'node-1' }],
      edges: [],
    }))
  })
})
