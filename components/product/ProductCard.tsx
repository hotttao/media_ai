'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { getImageUrl } from '@/foundation/lib/utils'

interface ProductCardProps {
  product: {
    id: string
    name: string
    targetAudience: 'MENS' | 'WOMENS' | 'KIDS'
    tags: string | null
    images: { url: string; isMain: boolean }[]
    createdAt: string
  }
  selected?: boolean
  onSelect?: (e: React.MouseEvent) => void
  selectMode?: boolean
}

const audienceConfig = {
  MENS: { label: '男装', gradient: 'from-slate-600/60 to-zinc-700/60', accent: '#94a3b8' },
  WOMENS: { label: '女装', gradient: 'from-rose-500/40 to-pink-600/40', accent: '#f9a8d4' },
  KIDS: { label: '童装', gradient: 'from-amber-500/40 to-orange-600/40', accent: '#fcd34d' },
}

export function ProductCard({ product, selected, onSelect, selectMode }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const mainImage = product.images?.find(img => img.isMain) || product.images?.[0]
  const tags = product.tags ? JSON.parse(product.tags) : []
  const config = audienceConfig[product.targetAudience] || audienceConfig.WOMENS

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.nativeEvent.stopImmediatePropagation()
    if (onSelect) {
      onSelect(e)
    }
  }

  const cardContent = (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
        className={`
          relative w-full overflow-hidden rounded-3xl
          transition-all duration-500 cursor-pointer
          group
          ${isHovered ? 'scale-[1.03] z-20' : ''}
          ${selected ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}
        `}
        style={{
          background: `linear-gradient(135deg, ${config.gradient}), rgba(10,10,15,0.8)`,
          border: `1px solid rgba(255,255,255,0.08)`,
          boxShadow: isHovered
            ? `0 25px 50px -12px rgba(0,0,0,0.5), 0 0 60px -15px ${config.accent}40`
            : `0 10px 40px -10px rgba(0,0,0,0.4)`,
        }}
      >
        {/* Holographic shimmer */}
        <div
          className={`
            absolute inset-0 pointer-events-none
            bg-gradient-to-r from-transparent via-white/[0.03] to-transparent
            -skew-x-12
            transition-transform duration-1000 ease-out
            ${isHovered ? 'translate-x-full' : '-translate-x-full'}
          `}
        />

        {/* Glow effect */}
        <div
          className={`
            absolute -inset-8 rounded-full
            opacity-0 transition-opacity duration-700 blur-3xl
            ${isHovered ? 'opacity-30' : ''}
          `}
          style={{ background: `radial-gradient(circle, ${config.accent}30 0%, transparent 70%)` }}
        />

        {/* Image container */}
        <div className="relative aspect-[9/16] overflow-hidden bg-black/20">
          {mainImage ? (
            <Image
              src={getImageUrl(mainImage.url)}
              alt={product.name}
              fill
              className={`
                object-contain
                transition-transform duration-700 ease-out
                ${isHovered ? 'scale-105' : 'scale-100'}
              `}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
              <svg className="w-20 h-20 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          {/* Main image badge */}
          <div className="absolute top-3 left-3">
            <span
              className="text-xs px-3 py-1.5 rounded-full font-medium backdrop-blur-md"
              style={{
                background: `rgba(${config.accent === '#94a3b8' ? '148,163,184' : config.accent === '#f9a8d4' ? '249,168,212' : '252,211,77'},0.2)`,
                border: `1px solid ${config.accent}50`,
                color: config.accent,
              }}
            >
              {config.label}
            </span>
          </div>

          {/* Checkbox button - top right, always visible when onSelect is provided */}
          {onSelect && (
            <button
              type="button"
              onClick={handleCheckboxClick}
              className={`
                absolute top-2 right-2 z-10 w-6 h-6 rounded-md flex items-center justify-center
                transition-all duration-200
                ${selected
                  ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30'
                  : 'bg-black/40 backdrop-blur-sm border border-white/50 hover:bg-black/60'
                }
              `}
            >
              {selected && (
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          )}

          {/* Image count badge */}
          {product.images && product.images.length > 1 && (
            <div className="absolute bottom-3 right-3">
              <span className="text-xs px-2 py-1 rounded-full bg-black/50 backdrop-blur-md text-white/80">
                +{product.images.length - 1}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="relative p-4">
          <h3 className="font-semibold text-white text-base truncate group-hover:text-white/90 transition-colors">
            {product.name}
          </h3>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {tags.slice(0, 3).map((tag: string, idx: number) => (
                <span
                  key={idx}
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.6)',
                  }}
                >
                  {tag}
                </span>
              ))}
              {tags.length > 3 && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  +{tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Arrow indicator */}
          <div
            className={`
              absolute right-4 top-1/2 -translate-y-1/2
              transition-all duration-300 ease-out
              ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}
            `}
          >
            <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
  )

  return (
    <Link href={`/products/${product.id}`} className="block">
      {cardContent}
    </Link>
  )
}
