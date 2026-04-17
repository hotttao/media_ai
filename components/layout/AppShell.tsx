'use client'

import { AuthProvider } from '@/components/providers/AuthProvider'
import { Sidebar } from './Sidebar'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen bg-white">
        <Sidebar />
        <main className="flex-1 bg-gray-50">{children}</main>
      </div>
    </AuthProvider>
  )
}
