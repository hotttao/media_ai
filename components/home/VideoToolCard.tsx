'use client'

import Link from 'next/link'
import { useState } from 'react'

interface VideoToolCardProps {
  id: string
  title: string
  description: string
  href: string
  gradient: string
  icon: string
}

export function VideoToolCard({ id, title, description, href, gradient, icon }: VideoToolCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <Link href={href}>
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          relative overflow-hidden rounded-2xl p-5 min-h-[150px] flex flex-col justify-between
          transition-all duration-300 cursor-pointer bg-white
          ${isHovered ? 'shadow-lg scale-[1.02]' : 'shadow-md'}
        `}
        style={{
          background: `linear-gradient(135deg, ${gradient})`,
        }}
      >
        {/* Content */}
        <div className="relative z-10">
          {/* Top row: Icon and number badge */}
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-white/50 backdrop-blur-sm flex items-center justify-center text-xl shadow-sm">
              {icon}
            </div>
            <div className="w-7 h-7 rounded-full bg-white/50 backdrop-blur-sm flex items-center justify-center text-xs font-bold text-gray-700">
              {id}
            </div>
          </div>

          {/* Title */}
          <h3 className="text-gray-900 font-bold text-sm leading-tight mb-1">
            {title}
          </h3>

          {/* Description - always visible */}
          <p className="text-gray-700 text-xs line-clamp-2 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Bottom accent */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/50" />
      </div>
    </Link>
  )
}
