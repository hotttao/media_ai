import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { InviteCodeManager } from '@/components/team/InviteCodeManager'

export default async function TeamSettingsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Team Settings</h1>
        <p className="text-warm-silver mt-1">Manage your team and invite new members</p>
      </div>

      <InviteCodeManager />
    </div>
  )
}
