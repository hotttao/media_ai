import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { IpForm } from '@/components/ip/IpForm'

export default async function NewIpPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/login')
  }

  return (
    <div className="space-y-6">
      <IpForm />
    </div>
  )
}