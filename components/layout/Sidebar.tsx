'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/foundation/lib/utils'

const navigation = [
  { name: '首页', href: '/', icon: '🏠' },
  { name: '视频工具', href: '/workflows', icon: '⚡' },
  { name: '素材库', href: '/materials', icon: '📦' },
  { name: 'IP库', href: '/ips', icon: '👤' },
  { name: '任务', href: '/tasks', icon: '📋' },
  { name: '视频', href: '/videos', icon: '🎬' },
  { name: '设置', href: '/team/settings', icon: '⚙️' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-semibold tracking-tight">AI Content Factory</h1>
        <p className="text-xs text-warm-silver mt-1">智能内容工厂</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-card text-sm font-medium transition-colors',
                isActive
                  ? 'bg-matcha-600 text-white'
                  : 'text-foreground hover:bg-oat-light'
              )}
            >
              <span className="text-lg">{item.icon}</span>
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="text-xs text-warm-silver">
          <p>AI Content Factory</p>
          <p className="mt-1">v1.0.0</p>
        </div>
      </div>
    </aside>
  )
}
