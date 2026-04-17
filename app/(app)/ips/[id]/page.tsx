import { redirect, notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'
import { IpForm } from '@/components/ip/IpForm'
import { IpImageUploader } from '@/components/ip/IpImageUploader'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

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

  const imageUrl = ip.images?.[0]?.avatarUrl || ip.avatar || 'https://via.placeholder.com/300'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" asChild>
          <Link href="/ips">&larr; 返回列表</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: IP Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-card border border-border shadow-clay p-6">
            <div className="flex items-start gap-6">
              <div className="w-32 h-32 rounded-feature overflow-hidden bg-oat-light flex-shrink-0">
                <img
                  src={imageUrl}
                  alt={ip.nickname}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-semibold">{ip.nickname}</h2>
                <div className="flex flex-wrap gap-2 mt-2">
                  {ip.gender && (
                    <Badge>
                      {ip.gender === 'MALE' ? '男' : ip.gender === 'FEMALE' ? '女' : '其他'}
                    </Badge>
                  )}
                  {ip.age && <Badge variant="secondary">{ip.age}岁</Badge>}
                  {ip.education && <Badge variant="secondary">{ip.education}</Badge>}
                </div>
                {ip.personality && (
                  <p className="text-warm-silver mt-3">{ip.personality}</p>
                )}
                {ip.catchphrase && (
                  <p className="text-sm italic text-matcha-600 mt-2">"{ip.catchphrase}"</p>
                )}
              </div>
            </div>

            {/* Body Stats */}
            {(ip.height || ip.weight || ip.bust || ip.waist || ip.hip) && (
              <div className="mt-6 pt-6 border-t border-border">
                <h3 className="text-sm font-medium mb-3">身体数据</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {ip.height && (
                    <div>
                      <p className="text-xs text-warm-silver">身高</p>
                      <p className="font-medium">{Number(ip.height)} cm</p>
                    </div>
                  )}
                  {ip.weight && (
                    <div>
                      <p className="text-xs text-warm-silver">体重</p>
                      <p className="font-medium">{Number(ip.weight)} kg</p>
                    </div>
                  )}
                  {ip.bust && (
                    <div>
                      <p className="text-xs text-warm-silver">胸围</p>
                      <p className="font-medium">{Number(ip.bust)} cm</p>
                    </div>
                  )}
                  {ip.waist && (
                    <div>
                      <p className="text-xs text-warm-silver">腰围</p>
                      <p className="font-medium">{Number(ip.waist)} cm</p>
                    </div>
                  )}
                  {ip.hip && (
                    <div>
                      <p className="text-xs text-warm-silver">臀围</p>
                      <p className="font-medium">{Number(ip.hip)} cm</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Images Gallery */}
          {ip.images && ip.images.length > 0 && (
            <div className="bg-white rounded-card border border-border shadow-clay p-6">
              <h3 className="text-lg font-semibold mb-4">形象图</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {ip.images[0].avatarUrl && (
                  <div>
                    <p className="text-xs text-warm-silver mb-1">头像</p>
                    <img src={ip.images[0].avatarUrl} alt="avatar" className="rounded-lg w-full" />
                  </div>
                )}
                {ip.images[0].fullBodyUrl && (
                  <div>
                    <p className="text-xs text-warm-silver mb-1">全身图</p>
                    <img src={ip.images[0].fullBodyUrl} alt="full body" className="rounded-lg w-full" />
                  </div>
                )}
                {ip.images[0].threeViewUrl && (
                  <div>
                    <p className="text-xs text-warm-silver mb-1">三视图</p>
                    <img src={ip.images[0].threeViewUrl} alt="three view" className="rounded-lg w-full" />
                  </div>
                )}
                {ip.images[0].nineViewUrl && (
                  <div>
                    <p className="text-xs text-warm-silver mb-1">九视图</p>
                    <img src={ip.images[0].nineViewUrl} alt="nine view" className="rounded-lg w-full" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="space-y-6">
          <div className="bg-white rounded-card border border-border shadow-clay p-6">
            <h3 className="text-lg font-semibold mb-4">操作</h3>
            <div className="space-y-3">
              <IpForm initialData={{
                id: ip.id,
                nickname: ip.nickname,
                gender: ip.gender || undefined,
                age: ip.age ? Number(ip.age) : undefined,
                height: ip.height ? Number(ip.height) : undefined,
                weight: ip.weight ? Number(ip.weight) : undefined,
                education: ip.education || undefined,
                major: ip.major || undefined,
                personality: ip.personality || undefined,
                catchphrase: ip.catchphrase || undefined,
              }} isEdit />
              <Button variant="destructive" className="w-full">
                删除此 IP
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-card border border-border shadow-clay p-6">
            <h3 className="text-lg font-semibold mb-4">上传图片</h3>
            <IpImageUploader ipId={ip.id} />
          </div>
        </div>
      </div>
    </div>
  )
}