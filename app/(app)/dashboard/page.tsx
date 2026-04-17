import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Welcome back, {session.user.nickname || session.user.email}
        </h1>
        <p className="text-warm-silver mt-1">
          Here&apos;s what&apos;s happening with your video generation today.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Virtual IPs" value="0" icon="👤" />
        <StatCard title="Pending Tasks" value="0" icon="📋" />
        <StatCard title="Videos" value="0" icon="🎬" />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <QuickAction href="/ips/new" title="Create Virtual IP" description="Define a new virtual character" />
            <QuickAction href="/workflows" title="Generate Video" description="Start a video workflow" />
            <QuickAction href="/materials" title="Upload Materials" description="Add new assets to your library" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-warm-silver">{title}</p>
            <p className="text-3xl font-semibold mt-1">{value}</p>
          </div>
          <span className="text-3xl">{icon}</span>
        </div>
      </CardContent>
    </Card>
  )
}

function QuickAction({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <a
      href={href}
      className="block p-4 rounded-card border border-border hover:border-matcha-600 hover:tilt transition-all"
    >
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm text-warm-silver mt-1">{description}</p>
    </a>
  )
}
