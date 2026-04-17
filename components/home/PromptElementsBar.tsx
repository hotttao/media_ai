'use client'

import Link from 'next/link'
import { useState } from 'react'

const promptElements = [
  { id: 'character', name: '人物', icon: '👤', href: '/materials?type=character' },
  { id: 'clothing', name: '服装', icon: '👗', href: '/materials?type=clothing' },
  { id: 'scene', name: '场景', icon: '🏞️', href: '/materials?type=scene' },
  { id: 'action', name: '动作', icon: '🎬', href: '/materials?type=action' },
  { id: 'expression', name: '表情', icon: '😊', href: '/materials?type=expression' },
  { id: 'camera', name: '镜头', icon: '📷', href: '/materials?type=camera' },
  { id: 'lighting', name: '灯光', icon: '💡', href: '/materials?type=lighting' },
  { id: 'music', name: '音乐', icon: '🎵', href: '/materials?type=music' },
]

export function PromptElementsBar() {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-matcha-400 to-matcha-600 flex items-center justify-center shadow-md">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-gray-800">提示词核心要素</h3>
      </div>

      <div className="flex flex-wrap gap-2">
        {promptElements.map((element) => (
          <Link
            key={element.id}
            href={element.href}
            onMouseEnter={() => setHoveredId(element.id)}
            onMouseLeave={() => setHoveredId(null)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
              transition-all duration-200 cursor-pointer
              ${hoveredId === element.id
                ? 'bg-gradient-to-r from-matcha-500 to-matcha-400 text-white shadow-md scale-105'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }
            `}
          >
            <span>{element.icon}</span>
            <span>{element.name}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
