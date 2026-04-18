import { redirect, notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'
import { IpDetailClient } from '@/components/ip/IpDetailClient'
import Link from 'next/link'

export default async function IpDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/login')
  }

  if (!session.user.teamId) {
    redirect('/ips')
  }

  const ip = await db.virtualIp.findFirst({
    where: { id: params.id, teamId: session.user.teamId },
    include: { images: true },
  })

  if (!ip) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <Link
        href="/ips"
        className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm"
      >
        <span>←</span>
        <span>返回列表</span>
      </Link>

      <IpDetailClient ip={ip} />
    </div>
  )
}
