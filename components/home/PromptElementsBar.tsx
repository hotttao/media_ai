'use client'

import Link from 'next/link'

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
  return (
    <div className="bg-white rounded-card p-4">
      <h3 className="text-sm font-medium text-warm-charcoal mb-3">提示词核心要素</h3>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {promptElements.map((element) => (
          <Link
            key={element.id}
            href={element.href}
            className="flex items-center gap-2 px-3 py-2 bg-oat-light rounded-full whitespace-nowrap hover:bg-matcha-100 transition-colors"
          >
            <span className="text-sm">{element.icon}</span>
            <span className="text-sm text-warm-charcoal">{element.name}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
