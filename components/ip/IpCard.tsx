'use client'

import Link from 'next/link'
import { useState } from 'react'
import { getImageUrl } from '@/foundation/lib/utils'

interface IpCardProps {
  ip: {
    id: string
    nickname: string
    avatarUrl: string | null
    gender: string | null
    personality: string | null
    images: Array<{ fullBodyUrl: string | null }>
  }
}

export function IpCard({ ip }: IpCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const imageUrl = getImageUrl(ip.avatarUrl) || getImageUrl(ip.images?.[0]?.fullBodyUrl) || 'https://via.placeholder.com/150'

  return (
    <Link href={`/ips/${ip.id}`}>
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          relative overflow-hidden rounded-2xl p-5
          transition-all duration-500 cursor-pointer
          backdrop-blur-xl
          ${isHovered ? 'scale-[1.02] shadow-2xl shadow-purple-500/20' : 'shadow-lg'}
        `}
        style={{
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(236, 72, 153, 0.15))',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {/* Glow effect */}
        <div
          className={`
            absolute -inset-1 rounded-2xl bg-gradient-to-r from-purple-500/30 to-pink-500/30
            opacity-0 transition-opacity duration-500 blur-xl
            ${isHovered ? 'opacity-60' : ''}
          `}
        />

        {/* Animated border */}
        <div
          className={`
            absolute inset-0 rounded-2xl transition-opacity duration-500
            ${isHovered ? 'opacity-100' : 'opacity-0'}
          `}
          style={{
            padding: '2px',
            background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
          }}
        />

        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center gap-4">
            {/* Avatar with animated ring */}
            <div className="relative flex-shrink-0">
              <div
                className={`
                  w-12 aspect-[9/16] rounded-xl overflow-hidden bg-black/20
                  transition-all duration-300
                  ${isHovered ? 'shadow-lg shadow-purple-500/50' : ''}
                `}
              >
                <img
                  src={imageUrl}
                  alt={ip.nickname}
                  className="w-full h-full object-contain"
                />
              </div>
              {/* Status ring */}
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-r from-matcha-400 to-matcha-600 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white truncate">{ip.nickname}</h3>
              <div className="flex items-center gap-2 mt-1">
                {ip.gender && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.8)',
                    }}
                  >
                    {ip.gender === 'MALE' ? '♂ 男' : ip.gender === 'FEMALE' ? '♀ 女' : '⚥ 其他'}
                  </span>
                )}
              </div>
              {ip.personality && (
                <p className="text-xs text-white/50 mt-1 truncate">{ip.personality}</p>
              )}
            </div>
          </div>

          {/* Hover reveal stats */}
          <div
            className={`
              grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/10
              transition-all duration-500
              ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
            `}
          >
            <div className="text-center">
              <p className="text-lg font-semibold text-white">{ip.images?.length || 0}</p>
              <p className="text-xs text-white/40">形象图</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-white">0</p>
              <p className="text-xs text-white/40">任务</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-white">--</p>
              <p className="text-xs text-white/40">评分</p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
