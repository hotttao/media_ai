'use client'

import { AuthProvider } from '@/components/providers/AuthProvider'
import { Sidebar } from './Sidebar'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen bg-dark-charcoal">
        <Sidebar />
        <main className="flex-1 bg-dark-charcoal">{children}</main>
      </div>
    </AuthProvider>
  )
}
