'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'

interface ProductInPlan {
  id: string
  productId: string
  productName: string
  productImage: string | null
  planDate: string
  createdAt: string
}

interface DailyPublishPlanContextType {
  plans: ProductInPlan[]
  count: number
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  addPlan: (productId: string, planDate: string) => Promise<void>
  addPlansBatch: (productIds: string[], planDate: string) => Promise<void>
  removePlan: (id: string) => Promise<void>
  refreshPlans: (date: string) => Promise<void>
}

const DailyPublishPlanContext = createContext<DailyPublishPlanContextType | null>(null)

export function useDailyPublishPlan() {
  const context = useContext(DailyPublishPlanContext)
  if (!context) {
    throw new Error('useDailyPublishPlan must be used within DailyPublishPlanProvider')
  }
  return context
}

function getTodayDateString() {
  const today = new Date()
  return today.toISOString().split('T')[0]
}

export function DailyPublishPlanProvider({ children }: { children: ReactNode }) {
  const [plans, setPlans] = useState<ProductInPlan[]>([])
  const [count, setCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  const refreshPlans = useCallback(async (date: string) => {
    try {
      const res = await fetch(`/api/daily-publish-plan?date=${date}`)
      if (res.ok) {
        const data = await res.json()
        setPlans(data.plans)
        setCount(data.count)
      }
    } catch (error) {
      console.error('Failed to fetch daily publish plans:', error)
    }
  }, [])

  useEffect(() => {
    refreshPlans(getTodayDateString())
  }, [refreshPlans])

  const addPlan = useCallback(async (productId: string, planDate: string) => {
    try {
      const res = await fetch('/api/daily-publish-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, planDate }),
      })
      if (res.ok) {
        await refreshPlans(planDate)
      } else {
        const error = await res.json()
        alert(error.error || '添加失败')
      }
    } catch (error) {
      console.error('Failed to add to daily publish plan:', error)
      alert('添加失败')
    }
  }, [refreshPlans])

  const addPlansBatch = useCallback(async (productIds: string[], planDate: string) => {
    try {
      const res = await fetch('/api/daily-publish-plan/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds, planDate }),
      })
      if (res.ok) {
        const result = await res.json()
        await refreshPlans(planDate)
        if (result.skipped > 0) {
          alert(`已添加 ${result.added} 个产品，${result.skipped} 个已存在`)
        } else {
          alert(`已添加 ${result.added} 个产品到发布计划`)
        }
      } else {
        alert('批量添加失败')
      }
    } catch (error) {
      console.error('Failed to batch add to daily publish plan:', error)
      alert('批量添加失败')
    }
  }, [refreshPlans])

  const removePlan = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/daily-publish-plan/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setPlans(prev => prev.filter(p => p.id !== id))
        setCount(prev => Math.max(0, prev - 1))
      } else {
        alert('移除失败')
      }
    } catch (error) {
      console.error('Failed to remove from daily publish plan:', error)
      alert('移除失败')
    }
  }, [])

  return (
    <DailyPublishPlanContext.Provider value={{
      plans,
      count,
      isOpen,
      setIsOpen,
      addPlan,
      addPlansBatch,
      removePlan,
      refreshPlans,
    }}>
      {children}
    </DailyPublishPlanContext.Provider>
  )
}