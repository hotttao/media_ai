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
          transition-all duration-300 cursor-pointer
          ${isHovered ? 'shadow-lg scale-[1.02]' : 'shadow-md'}
        `}
        style={{
          background: `linear-gradient(135deg, ${gradient})`,
        }}
      >
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)`,
            backgroundSize: '15px 15px',
          }}
        />

        {/* Content */}
        <div className="relative z-10">
          {/* Top row: Icon and number badge */}
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl shadow-sm">
              {icon}
            </div>
            <div className="w-7 h-7 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center text-xs font-bold text-white">
              {id}
            </div>
          </div>

          {/* Title */}
          <h3 className="text-white font-semibold text-sm leading-tight mb-1">
            {title}
          </h3>

          {/* Description */}
          <p className="text-white/80 text-xs line-clamp-2 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity">
            {description}
          </p>
        </div>

        {/* Bottom accent */}
        <div
          className={`absolute bottom-0 left-0 right-0 h-1 bg-white/20 transition-opacity duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>
    </Link>
  )
}
