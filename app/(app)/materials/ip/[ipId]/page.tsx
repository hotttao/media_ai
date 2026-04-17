import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export default async function IpMaterialsPage({
  params,
}: {
  params: { ipId: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/login')
  }

  if (!session.user.teamId) {
    redirect('/ips')
  }

  const ip = await db.virtualIp.findFirst({
    where: { id: params.ipId, teamId: session.user.teamId },
    include: { ipMaterials: true },
  })

  if (!ip) {
    redirect('/ips')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" asChild>
          <Link href={`/ips/${params.ipId}`}>&larr; 返回 IP</Link>
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          {ip.nickname} 的素材
        </h1>
        <p className="text-warm-silver mt-1">管理此 IP 特有的妆容、装饰等素材</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ip.ipMaterials.map((material) => (
          <Card key={material.id}>
            <CardHeader>
              <CardTitle className="text-base">{material.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-3">
                <Badge variant="secondary">
                  {material.type === 'MAKEUP' ? '妆容' :
                   material.type === 'ACCESSORY' ? '配饰' : '定制服装'}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {material.fullBodyUrl && (
                  <img src={material.fullBodyUrl} alt="full body" className="rounded" />
                )}
                {material.threeViewUrl && (
                  <img src={material.threeViewUrl} alt="three view" className="rounded" />
                )}
                {material.nineViewUrl && (
                  <img src={material.nineViewUrl} alt="nine view" className="rounded" />
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Add new material card */}
        <Card className="border-dashed flex items-center justify-center min-h-[200px] cursor-pointer hover:border-matcha-600 transition-colors">
          <div className="text-center text-warm-silver">
            <p className="text-4xl mb-2">+</p>
            <p>添加妆容/装饰</p>
          </div>
        </Card>
      </div>
    </div>
  )
}