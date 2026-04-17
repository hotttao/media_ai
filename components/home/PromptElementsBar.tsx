'use client'

import Link from 'next/link'
import { useState } from 'react'

const promptElements = [
  { id: 'character', name: '人物', icon: '👤', color: 'from-pink-500 to-rose-500', href: '/materials?type=character' },
  { id: 'clothing', name: '服装', icon: '👗', color: 'from-violet-500 to-purple-500', href: '/materials?type=clothing' },
  { id: 'scene', name: '场景', icon: '🏞️', color: 'from-emerald-500 to-teal-500', href: '/materials?type=scene' },
  { id: 'action', name: '动作', icon: '🎬', color: 'from-orange-500 to-amber-500', href: '/materials?type=action' },
  { id: 'expression', name: '表情', icon: '😊', color: 'from-yellow-500 to-orange-500', href: '/materials?type=expression' },
  { id: 'camera', name: '镜头', icon: '📷', color: 'from-blue-500 to-cyan-500', href: '/materials?type=camera' },
  { id: 'lighting', name: '灯光', icon: '💡', color: 'from-purple-500 to-fuchsia-500', href: '/materials?type=lighting' },
  { id: 'music', name: '音乐', icon: '🎵', color: 'from-red-500 to-pink-500', href: '/materials?type=music' },
]

export function PromptElementsBar() {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  return (
    <div className="relative bg-[#0a0f1a]/80 backdrop-blur-xl rounded-2xl p-5 border border-cyan-500/20">
      {/* Background glow */}
      <div className="absolute inset-0 opacity-30" style={{
        background: 'radial-gradient(ellipse at 50% 0%, rgba(6,182,212,0.15) 0%, transparent 50%)',
      }} />

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-cyan-400">提示词核心要素</h3>
          <div className="flex-1 h-px bg-gradient-to-r from-cyan-500/50 to-transparent" />
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {promptElements.map((element, index) => (
            <Link
              key={element.id}
              href={element.href}
              onMouseEnter={() => setHoveredId(element.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="group relative flex-shrink-0"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div
                className={`
                  relative flex items-center gap-2 px-4 py-2.5 rounded-full
                  transition-all duration-300 cursor-pointer
                  ${hoveredId === element.id ? 'scale-105' : ''}
                `}
                style={{
                  background: hoveredId === element.id
                    ? `linear-gradient(135deg, ${element.color.includes('pink') ? 'rgba(236,72,153,0.3)' : element.color.includes('violet') ? 'rgba(139,92,246,0.3)' : element.color.includes('emerald') ? 'rgba(16,185,129,0.3)' : element.color.includes('orange') ? 'rgba(249,115,22,0.3)' : element.color.includes('yellow') ? 'rgba(245,158,11,0.3)' : element.color.includes('blue') ? 'rgba(59,130,246,0.3)' : element.color.includes('purple') ? 'rgba(168,85,247,0.3)' : 'rgba(239,68,68,0.3)'})`
                    : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${hoveredId === element.id ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)'}`,
                  backdropFilter: 'blur(10px)',
                }}
              >
                {/* Icon */}
                <span
                  className={`text-lg transition-transform duration-300 ${
                    hoveredId === element.id ? 'scale-110' : ''
                  }`}
                >
                  {element.icon}
                </span>

                {/* Label */}
                <span
                  className={`text-sm font-medium transition-colors ${
                    hoveredId === element.id ? 'text-white' : 'text-gray-400'
                  }`}
                >
                  {element.name}
                </span>

                {/* Hover glow */}
                {hoveredId === element.id && (
                  <div
                    className="absolute inset-0 rounded-full opacity-50"
                    style={{
                      background: `linear-gradient(135deg, ${element.color.includes('pink') ? 'rgba(236,72,153,0.4)' : element.color.includes('violet') ? 'rgba(139,92,246,0.4)' : element.color.includes('emerald') ? 'rgba(16,185,129,0.4)' : element.color.includes('orange') ? 'rgba(249,115,22,0.4)' : element.color.includes('yellow') ? 'rgba(245,158,11,0.4)' : element.color.includes('blue') ? 'rgba(59,130,246,0.4)' : element.color.includes('purple') ? 'rgba(168,85,247,0.4)' : 'rgba(239,68,68,0.4)'}) 0%, transparent 100%)`,
                      filter: 'blur(8px)',
                    }}
                  />
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}
