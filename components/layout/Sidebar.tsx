'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/foundation/lib/utils'
import { signOut, useSession } from 'next-auth/react'

const navigation = [
  { name: '首页', href: '/', icon: '🏠' },
  { name: '视频工具', href: '/workflows', icon: '⚡' },
  { name: '素材库', href: '/materials', icon: '📦' },
  { name: 'IP库', href: '/ips', icon: '👤' },
  { name: '任务', href: '/tasks', icon: '📋' },
  { name: '视频', href: '/videos', icon: '🎬' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <aside className="w-52 min-h-screen bg-dark-charcoal flex flex-col">
      {/* Logo */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-matcha-400 to-matcha-600 flex items-center justify-center shadow-sm">
            <span className="text-lg">🤖</span>
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">AI Content Factory</h1>
            <p className="text-xs text-white/60">智能内容工厂</p>
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
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              )}
            >
              <span className="text-base">{item.icon}</span>
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* User section with logout */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2.5 mb-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-matcha-400 to-matcha-600 flex items-center justify-center text-sm text-white">
            {session?.user?.nickname?.[0] || session?.user?.email?.[0] || '👤'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{session?.user?.nickname || session?.user?.email}</p>
            <p className="text-xs text-white/60">{session?.user?.role === 'ADMIN' ? '管理员' : '成员'}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/60 hover:bg-white/10 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          退出登录
        </button>
      </div>
    </aside>
  )
}
