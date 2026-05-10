'use client'

import { useDailyPublishPlan } from './DailyPublishPlanProvider'
import { getImageUrl } from '@/foundation/lib/utils'
import Link from 'next/link'

export function DailyPublishPlanFloating() {
  const { plans, count, isOpen, setIsOpen, removePlan, claimPlan } = useDailyPublishPlan()

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:scale-110 active:scale-95 transition-all duration-300"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        {count > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {/* Floating panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-80 max-h-96 overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-200 animate-in slide-in-from-bottom-4 fade-in duration-300">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-emerald-500 to-teal-600">
            <h3 className="text-white font-semibold">当日发布计划</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Product list */}
          <div className="max-h-64 overflow-y-auto">
            {plans.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm">
                暂无产品
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {plans.map(plan => (
                  <div key={plan.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                      {plan.productImage ? (
                        <img
                          src={getImageUrl(plan.productImage)}
                          alt={plan.productName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                          无图
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {plan.productName}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(plan.planDate).toLocaleDateString('zh-CN')}
                        {plan.isUnassigned && <span className="ml-2 text-amber-500">(待认领)</span>}
                      </p>
                    </div>
                    {plan.isUnassigned ? (
                      <button
                        onClick={() => claimPlan(plan.id)}
                        className="flex-shrink-0 px-2 py-1 rounded text-xs text-emerald-600 hover:bg-emerald-50 transition-colors"
                      >
                        认领
                      </button>
                    ) : (
                      <button
                        onClick={() => removePlan(plan.id)}
                        className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer link */}
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
            <Link
              href="/daily-publish-plan"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              查看发布计划
            </Link>
          </div>
        </div>
      )}
    </>
  )
}