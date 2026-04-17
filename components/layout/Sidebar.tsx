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
    <aside className="w-64 min-h-screen bg-white border-r border-gray-100 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-matcha-400 to-matcha-600 flex items-center justify-center shadow-md">
            <span className="text-xl">🤖</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900">AI Content Factory</h1>
            <p className="text-xs text-gray-500">智能内容工厂</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-gradient-to-r from-matcha-500 to-matcha-400 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <span className="text-lg">{item.icon}</span>
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-matcha-400 to-matcha-600 flex items-center justify-center text-sm text-white">
            👤
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">用户</p>
            <p className="text-xs text-gray-500">在线</p>
          </div>
          <div className="w-2 h-2 bg-green-400 rounded-full" />
        </div>
      </div>
    </aside>
  )
}
