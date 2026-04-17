'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/foundation/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '🏠' },
  { name: 'Virtual IPs', href: '/ips', icon: '👤' },
  { name: 'Materials', href: '/materials', icon: '📦' },
  { name: 'Workflows', href: '/workflows', icon: '⚡' },
  { name: 'Tasks', href: '/tasks', icon: '📋' },
  { name: 'Videos', href: '/videos', icon: '🎬' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-semibold tracking-tight">Media AI</h1>
        <p className="text-xs text-warm-silver mt-1">Virtual IP Video Agent</p>
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
          <p>Virtual IP Video Agent</p>
          <p className="mt-1">v0.1.0</p>
        </div>
      </div>
    </aside>
  )
}
