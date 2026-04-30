// domains/combination/engine/ConstraintRegistry.test.ts

import { ConstraintRegistry } from './ConstraintRegistry'
import { Constraint, ConstraintType, ConstraintSubjectType } from '../types'

describe('ConstraintRegistry', () => {
  let registry: ConstraintRegistry

  beforeEach(() => {
    registry = new ConstraintRegistry()
  })

  const createConstraint = (overrides: Partial<Constraint> = {}): Constraint => ({
    id: 'test-1',
    type: ConstraintType.MOVEMENT,
    subjectType: ConstraintSubjectType.PRODUCT,
    subjectId: 'prod-1',
    allowedValues: ['mv-1', 'mv-2'],
    priority: 10,
    ...overrides
  })

  it('registers and retrieves constraint', () => {
    const constraint = createConstraint()
    registry.register(constraint)

    expect(registry.get('test-1')).toEqual(constraint)
  })

  it('registers multiple constraints', () => {
    registry.registerMany([
      createConstraint({ id: 'c1' }),
      createConstraint({ id: 'c2' })
    ])

    expect(registry.getAll()).toHaveLength(2)
  })

  it('gets constraints for product', () => {
    registry.registerMany([
      createConstraint({ id: 'c1', subjectType: ConstraintSubjectType.PRODUCT, subjectId: 'prod-1' }),
      createConstraint({ id: 'c2', subjectType: ConstraintSubjectType.PRODUCT, subjectId: 'prod-2' }),
      createConstraint({ id: 'c3', subjectType: ConstraintSubjectType.IP, subjectId: 'ip-1' })
    ])

    const result = registry.getForProduct('prod-1')

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('c1')
  })

  it('gets constraints for IP', () => {
    registry.registerMany([
      createConstraint({ id: 'c1', subjectType: ConstraintSubjectType.IP, subjectId: 'ip-1' }),
      createConstraint({ id: 'c2', subjectType: ConstraintSubjectType.IP, subjectId: 'ip-2' })
    ])

    const result = registry.getForIP('ip-1')

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('c1')
  })

  it('gets all applicable constraints sorted by priority', () => {
    registry.registerMany([
      createConstraint({ id: 'c1', subjectType: ConstraintSubjectType.PRODUCT, subjectId: 'prod-1', priority: 5 }),
      createConstraint({ id: 'c2', subjectType: ConstraintSubjectType.IP, subjectId: 'ip-1', priority: 20 }),
      createConstraint({ id: 'c3', subjectType: ConstraintSubjectType.PRODUCT, subjectId: 'prod-1', priority: 15 })
    ])

    const result = registry.getAllApplicable('prod-1', 'ip-1')

    expect(result).toHaveLength(3)
    expect(result[0].id).toBe('c2')  // priority 20
    expect(result[1].id).toBe('c3')  // priority 15
    expect(result[2].id).toBe('c1')  // priority 5
  })

  it('unregisters constraint', () => {
    registry.register(createConstraint())
    registry.unregister('test-1')

    expect(registry.get('test-1')).toBeUndefined()
  })

  it('clears all constraints', () => {
    registry.registerMany([
      createConstraint({ id: 'c1' }),
      createConstraint({ id: 'c2' })
    ])
    registry.clear()

    expect(registry.getAll()).toHaveLength(0)
  })
})