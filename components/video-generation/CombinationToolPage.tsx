/**
 * 组合工具页面布局组件
 * 提供统一的页面结构和视觉风格
 */

'use client'

import type { ReactNode } from 'react'

export interface CombinationToolPageProps {
  /** 页面标题 */
  title: string
  /** 页面描述 */
  description: string
  /** 页面图标 */
  icon: string
  /** 页面内容 */
  children: ReactNode
}

/**
 * 组合工具页面布局
 * 提供统一的背景、标题区域和内容容器
 */
export function CombinationToolPage({
  title,
  description,
  icon,
  children,
}: CombinationToolPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-background to-fuchsia-100">
      {/* Floating orbs - 与 tools 页面一致 */}
      <div className="fixed top-20 left-20 w-96 h-96 bg-violet-300/30 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div
        className="fixed bottom-20 right-20 w-80 h-80 bg-fuchsia-300/30 rounded-full blur-[100px] pointer-events-none animate-pulse"
        style={{ animationDelay: '1s' }}
      />

      <div className="relative max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <span className="text-2xl">{icon}</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-warm-charcoal tracking-tight">{title}</h1>
            <p className="text-warm-silver mt-1">{description}</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
