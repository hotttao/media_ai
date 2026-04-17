'use client'

import Link from 'next/link'

interface VideoToolCardProps {
  id: string
  title: string
  description: string
  href: string
  gradient: string
}

export function VideoToolCard({ id, title, description, href, gradient }: VideoToolCardProps) {
  return (
    <Link href={href} className="group relative overflow-hidden rounded-card transition-all hover:scale-[1.02] hover:shadow-clay">
      {/* Gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-90`} />

      {/* Content */}
      <div className="relative p-5 min-h-[140px] flex flex-col justify-between">
        {/* ID badge */}
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs text-white font-medium">
          {id}
        </div>

        {/* Title and description */}
        <div className="mt-6">
          <h3 className="text-white font-semibold text-base leading-tight">{title}</h3>
        </div>

        <p className="text-white/80 text-xs mt-2 line-clamp-2">{description}</p>
      </div>
    </Link>
  )
}
