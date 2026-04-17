import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'
import { IpCard } from '@/components/ip/IpCard'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function IpsPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/login')
  }

  if (!session.user.teamId) {
    return (
      <div className="space-y-4">
        <p>请先加入一个团队</p>
      </div>
    )
  }

  const ips = await db.virtualIp.findMany({
    where: { teamId: session.user.teamId },
    orderBy: { createdAt: 'desc' },
    include: { images: true },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button asChild>
          <Link href="/ips/new">创建新 IP</Link>
        </Button>
      </div>

      {ips.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-warm-silver mb-4">还没有创建任何虚拟 IP</p>
          <Button asChild>
            <Link href="/ips/new">创建你的第一个 IP</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ips.map((ip) => (
            <IpCard key={ip.id} ip={ip} />
          ))}
        </div>
      )}
    </div>
  )
}