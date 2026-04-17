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
    <aside className="w-52 min-h-screen bg-gray-50 flex flex-col">
      {/* Logo */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-matcha-400 to-matcha-600 flex items-center justify-center shadow-sm">
            <span className="text-lg">🤖</span>
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900">AI Content Factory</h1>
            <p className="text-xs text-gray-400">智能内容工厂</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 mb-1',
                isActive
                  ? 'bg-matcha-500 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <span className="text-base">{item.icon}</span>
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="px-3 py-4">
        <div className="flex items-center gap-3 px-3 py-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-matcha-400 to-matcha-600 flex items-center justify-center text-sm text-white">
            👤
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">用户</p>
            <p className="text-xs text-gray-400">在线</p>
          </div>
          <div className="w-2 h-2 bg-green-400 rounded-full" />
        </div>
      </div>
    </aside>
  )
}
