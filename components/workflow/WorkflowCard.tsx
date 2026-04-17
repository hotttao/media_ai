// components/workflow/WorkflowCard.tsx
'use client'

import Link from 'next/link'
import { useState } from 'react'

interface WorkflowCardProps {
  workflow: {
    code: string
    name: string
    description?: string
    nodeCount?: number
  }
  href: string
}

const workflowGradients: Record<string, string> = {
  'lipstick-promo': 'from-rose-500/20 to-pink-500/20',
  'skincare-promo': 'from-cyan-500/20 to-blue-500/20',
  'perfume-promo': 'from-violet-500/20 to-purple-500/20',
  'persona-intro': 'from-emerald-500/20 to-teal-500/20',
  'daily-share': 'from-orange-500/20 to-amber-500/20',
  'multi-ip': 'from-pink-500/20 to-rose-500/20',
  default: 'from-matcha-500/20 to-cyan-500/20',
}

const workflowIcons: Record<string, string> = {
  'lipstick-promo': '💄',
  'skincare-promo': '✨',
  'perfume-promo': '🌸',
  'persona-intro': '👤',
  'daily-share': '📱',
  'multi-ip': '🎭',
  default: '⚡',
}

export function WorkflowCard({ workflow, href }: WorkflowCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const gradient = workflowGradients[workflow.code] || workflowGradients.default
  const icon = workflowIcons[workflow.code] || workflowIcons.default

  return (
    <Link href={href}>
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          relative overflow-hidden rounded-2xl p-6 h-full
          transition-all duration-500 cursor-pointer
          backdrop-blur-xl
          ${isHovered ? 'scale-[1.02] shadow-2xl shadow-matcha-500/20' : 'shadow-lg'}
        `}
        style={{
          background: `linear-gradient(135deg, ${gradient}, rgba(255,255,255,0.05))`,
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {/* Animated grid background */}
        <div
          className={`absolute inset-0 opacity-20 transition-opacity duration-500 ${isHovered ? 'opacity-40' : ''}`}
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '20px 20px',
          }}
        />

        {/* Glow effect on hover */}
        <div
          className={`
            absolute -inset-1 rounded-2xl bg-gradient-to-r from-matcha-500/50 to-cyan-500/50
            opacity-0 transition-opacity duration-500 blur-xl
            ${isHovered ? 'opacity-50' : ''}
          `}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Icon with glow */}
          <div className="flex items-center justify-between mb-4">
            <div
              className={`
                w-12 h-12 rounded-xl flex items-center justify-center text-2xl
                transition-all duration-300
                ${isHovered ? 'shadow-lg shadow-matcha-500/50 scale-110' : ''}
              `}
              style={{
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
              }}
            >
              {icon}
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-matcha-400 animate-pulse" />
              <span className="text-xs text-white/60">就绪</span>
            </div>
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-white mb-2">{workflow.name}</h3>

          {/* Description */}
          {workflow.description && (
            <p className="text-sm text-white/60 line-clamp-2 flex-1">{workflow.description}</p>
          )}

          {/* Node count */}
          {workflow.nodeCount !== undefined && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/10">
              <svg className="w-4 h-4 text-matcha-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
              <span className="text-xs text-white/50">{workflow.nodeCount} 个节点</span>
            </div>
          )}

          {/* Action button */}
          <button
            className={`
              mt-4 w-full py-2.5 rounded-xl font-medium text-sm
              bg-gradient-to-r from-matcha-600 to-matcha-500 text-white
              shadow-lg shadow-matcha-500/30
              transition-all duration-300
              ${isHovered ? 'shadow-xl shadow-matcha-500/50 scale-[1.02]' : ''}
            `}
          >
            开始生成
          </button>
        </div>
      </div>
    </Link>
  )
}
