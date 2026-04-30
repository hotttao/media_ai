// domains/combination/engine/ConstraintRegistry.ts

import { Constraint, ConstraintSubjectType } from '../types'

export class ConstraintRegistry {
  private constraints: Map<string, Constraint> = new Map()

  register(constraint: Constraint): void {
    this.constraints.set(constraint.id, constraint)
  }

  registerMany(constraints: Constraint[]): void {
    constraints.forEach(c => this.register(c))
  }

  unregister(id: string): void {
    this.constraints.delete(id)
  }

  get(id: string): Constraint | undefined {
    return this.constraints.get(id)
  }

  getAll(): Constraint[] {
    return Array.from(this.constraints.values())
  }

  getForSubject(subjectType: ConstraintSubjectType, subjectId: string): Constraint[] {
    return Array.from(this.constraints.values())
      .filter(c => c.subjectType === subjectType && c.subjectId === subjectId)
  }

  getForProduct(productId: string): Constraint[] {
    return this.getForSubject(ConstraintSubjectType.PRODUCT, productId)
  }

  getForIP(ipId: string): Constraint[] {
    return this.getForSubject(ConstraintSubjectType.IP, ipId)
  }

  getAllApplicable(productId: string, ipId: string): Constraint[] {
    return [
      ...this.getForProduct(productId),
      ...this.getForIP(ipId)
    ].sort((a, b) => b.priority - a.priority)
  }

  clear(): void {
    this.constraints.clear()
  }
}