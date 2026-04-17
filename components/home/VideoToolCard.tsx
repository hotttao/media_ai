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
    <Link
      href={href}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative block"
    >
      <div
        className={`relative overflow-hidden rounded-2xl p-5 min-h-[160px] flex flex-col justify-between transition-all duration-500 ${
          isHovered ? 'scale-[1.02]' : ''
        }`}
        style={{
          background: `linear-gradient(135deg, ${gradient.includes('from-[') ? gradient.match(/from-(#[a-fA-F0-9]+)/)?.[1] || '#1e293b' : gradient.includes('from-cyan') ? '#0e4d5c' : gradient.includes('from-[#e85d75]') ? '#5c1a2a' : gradient.includes('from-[#4a90a4]') ? '#1a3a42' : gradient.includes('from-[#9b7eb5]') ? '#3a2a4a' : gradient.includes('from-[#5a9e6f]') ? '#1a3a28' : gradient.includes('from-[#e6a54a]') ? '#4a3818' : '#4a2828'} 0%, ${gradient.includes('to-[') ? gradient.match(/to-(#[a-fA-F0-9]+)/)?.[1] || '#1e293b' : gradient.includes('to-cyan') ? '#064e5c' : gradient.includes('to-[#ff8a9b]') ? '#5c1a2a' : gradient.includes('to-[#6bb3c9]') ? '#1a3a42' : gradient.includes('to-[#b89fd1]') ? '#3a2a4a' : gradient.includes('to-[#7ec492]') ? '#1a3a28' : gradient.includes('to-[#f5c06d]') ? '#4a3818' : '#4a2828'} 100%)`,
        }}
      >
        {/* Animated grid background */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '20px 20px',
          }}
        />

        {/* Glow effect on hover */}
        <div
          className={`absolute inset-0 opacity-0 transition-opacity duration-500 ${
            isHovered ? 'opacity-100' : ''
          }`}
          style={{
            background: `radial-gradient(circle at 50% 0%, rgba(255,255,255,0.15) 0%, transparent 60%)`,
          }}
        />

        {/* Content */}
        <div className="relative z-10">
          {/* ID badge */}
          <div className="flex items-center justify-between mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl backdrop-blur-sm"
              style={{
                backgroundColor: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
              }}
            >
              {icon}
            </div>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                isHovered ? 'scale-110' : ''
              }`}
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)',
                color: 'white',
              }}
            >
              {id}
            </div>
          </div>

          {/* Title */}
          <h3 className="text-white font-semibold text-base leading-tight mb-2 group-hover:text-cyan-300 transition-colors">
            {title}
          </h3>

          {/* Description */}
          <p className="text-white/70 text-xs line-clamp-2 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Bottom accent line */}
        <div
          className={`absolute bottom-0 left-0 right-0 h-1 transition-all duration-500 ${
            isHovered ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'
          }`}
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)',
          }}
        />
      </div>

      {/* Shadow */}
      <div
        className={`absolute inset-0 -z-10 blur-xl transition-opacity duration-500 ${
          isHovered ? 'opacity-50' : 'opacity-0'
        }`}
        style={{
          background: gradient.includes('from-cyan') ? 'rgba(6,182,212,0.3)' : gradient.includes('from-[#e85d75]') ? 'rgba(232,93,117,0.3)' : 'rgba(6,182,212,0.3)',
        }}
      />
    </Link>
  )
}
