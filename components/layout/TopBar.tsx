'use client'

import { signOut, useSession } from 'next-auth/react'

export function TopBar() {
  const { data: session } = useSession()

  return (
    <header className="h-14 bg-white flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          <span className="text-xs text-gray-600">系统正常</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">{session?.user?.nickname || session?.user?.email}</p>
          <p className="text-xs text-gray-400">{session?.user?.role === 'ADMIN' ? '管理员' : '成员'}</p>
        </div>

        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-matcha-400 to-matcha-600 flex items-center justify-center text-white font-medium shadow-sm">
          {session?.user?.nickname?.[0] || session?.user?.email?.[0] || '👤'}
        </div>

        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          退出
        </button>
      </div>
    </header>
  )
}
