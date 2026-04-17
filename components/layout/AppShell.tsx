'use client'

import { AuthProvider } from '@/components/providers/AuthProvider'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen bg-white">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <TopBar />
          <main className="flex-1 bg-gray-50">{children}</main>
        </div>
      </div>
    </AuthProvider>
  )
}
