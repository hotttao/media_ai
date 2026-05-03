'use client'

import { useState } from 'react'
import { getImageUrl } from '@/foundation/lib/utils'

interface MaterialCardProps {
  material: {
    id: string
    name: string
    type: string
    url: string
    tags: string | null
    visibility: string
    description?: string | null
    createdAt?: string
  }
  onClick?: () => void
}

const typeColors: Record<string, string> = {
  SCENE: 'from-emerald-500/20 to-teal-500/20',
  POSE: 'from-orange-500/20 to-red-500/20',
  MAKEUP: 'from-pink-500/20 to-rose-500/20',
  ACCESSORY: 'from-violet-500/20 to-purple-500/20',
  default: 'from-gray-500/20 to-slate-500/20',
}

export function MaterialCard({ material, onClick }: MaterialCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const tags = material.tags ? JSON.parse(material.tags as string) : []
  const gradient = typeColors[material.type] || typeColors.default

  const visibilityLabels: Record<string, string> = {
    PUBLIC: '公共',
    TEAM: '团队',
    PERSONAL: '私有',
  }

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      className={`
        relative w-full overflow-hidden rounded-2xl
        transition-all duration-500 cursor-pointer
        ${isHovered ? 'scale-[1.02] shadow-2xl z-10' : 'shadow-lg'}
      `}
      style={{
        background: `linear-gradient(180deg, rgba(7,10,14,0.9) 0%, rgba(13,18,24,0.96) 100%)`,
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      {/* Holographic shimmer */}
      <div
        className={`
          absolute inset-0 pointer-events-none
          bg-gradient-to-r from-transparent via-white/10 to-transparent
          -skew-x-12
          transition-all duration-1000
          ${isHovered ? 'translate-x-full' : '-translate-x-full'}
        `}
      />

      {/* Glow effect */}
      <div
        className={`
          absolute -inset-1 rounded-2xl
          bg-gradient-to-r from-cyan-500/30 to-matcha-500/30
          opacity-0 transition-opacity duration-500 blur-lg
          ${isHovered ? 'opacity-60' : ''}
        `}
      />

      {/* Image container */}
      <div className="relative aspect-[4/5] overflow-hidden bg-black/30">
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-50`} />
        <div className="absolute inset-0 p-1">
          <img
            src={getImageUrl(material.url)}
            alt={material.name}
            className={`
              relative z-10 h-full w-full rounded-xl object-contain
              transition-transform duration-700
              ${isHovered ? 'scale-[1.02]' : 'scale-100'}
            `}
          />
        </div>

        {/* Type badge overlay */}
        <div className="absolute top-3 left-3">
          <span
            className="text-xs px-2 py-1 rounded-full font-medium backdrop-blur-sm"
            style={{
              background: 'rgba(0,0,0,0.5)',
              color: 'rgba(255,255,255,0.9)',
            }}
          >
            {material.type === 'SCENE' ? '场景' :
             material.type === 'POSE' ? '姿势' :
             material.type === 'MAKEUP' ? '妆容' :
             material.type === 'ACCESSORY' ? '配饰' : material.type}
          </span>
        </div>

        {/* Visibility badge */}
        <div className="absolute top-3 right-3">
          <span
            className="text-xs px-2 py-1 rounded-full backdrop-blur-sm"
            style={{
              background: material.visibility === 'PUBLIC' ? 'rgba(34,197,94,0.7)' :
                         material.visibility === 'TEAM' ? 'rgba(59,130,246,0.7)' :
                         'rgba(156,163,175,0.7)',
              color: 'white',
            }}
          >
            {visibilityLabels[material.visibility] || material.visibility}
          </span>
        </div>
      </div>

      {/* Content */}
      <div
        className="relative z-10 flex min-h-[100px] flex-col justify-between p-3.5"
        style={{
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div>
          <h3 className="font-medium text-white line-clamp-1">{material.name}</h3>
          {material.description && (
            <p className="mt-2 line-clamp-2 text-sm text-white/55">{material.description}</p>
          )}
        </div>

        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag: string) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.7)',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
