'use client'

import { signOut, useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'

export function TopBar() {
  const { data: session } = useSession()

  return (
    <header className="h-16 bg-white border-b border-border flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-medium">
          {session?.user?.teamId ? 'Team Workspace' : 'Personal Workspace'}
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-sm">
          <p className="font-medium">{session?.user?.nickname || session?.user?.email}</p>
          <p className="text-warm-silver text-xs">{session?.user?.role === 'ADMIN' ? 'Admin' : 'Member'}</p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          Sign Out
        </Button>
      </div>
    </header>
  )
}
