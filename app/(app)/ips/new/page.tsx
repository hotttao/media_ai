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
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">创建虚拟 IP</h1>
        <p className="text-warm-silver mt-1">定义一个新的人物形象</p>
      </div>

      <IpForm />
    </div>
  )
}