import { redirect, notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'
import { IpForm } from '@/components/ip/IpForm'
import { IpImageUploader } from '@/components/ip/IpImageUploader'
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

  const imageUrl = ip.images?.[0]?.avatarUrl || ip.avatar || 'https://via.placeholder.com/300'

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        href="/ips"
        className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors"
      >
        <span className="text-xl">←</span>
        <span>返回列表</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: IP Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Info Card */}
          <div
            className="relative overflow-hidden rounded-2xl p-6 backdrop-blur-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(236, 72, 153, 0.15))',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {/* Glow effect */}
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 blur-xl opacity-50" />

            <div className="relative z-10 flex items-start gap-6">
              {/* Avatar with animated ring */}
              <div className="relative flex-shrink-0">
                <div
                  className="w-32 h-32 rounded-2xl overflow-hidden"
                  style={{
                    boxShadow: '0 0 30px rgba(139, 92, 246, 0.4)',
                  }}
                >
                  <img
                    src={imageUrl}
                    alt={ip.nickname}
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Status indicator */}
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-r from-matcha-400 to-matcha-600 flex items-center justify-center shadow-lg">
                  <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
                </div>
              </div>

              {/* Info */}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-3">{ip.nickname}</h2>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {ip.gender && (
                    <span
                      className="px-3 py-1 rounded-full text-sm"
                      style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                      }}
                    >
                      {ip.gender === 'MALE' ? '♂ 男' : ip.gender === 'FEMALE' ? '♀ 女' : '⚥ 其他'}
                    </span>
                  )}
                  {ip.age && (
                    <span
                      className="px-3 py-1 rounded-full text-sm"
                      style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                      }}
                    >
                      {ip.age}岁
                    </span>
                  )}
                  {ip.education && (
                    <span
                      className="px-3 py-1 rounded-full text-sm"
                      style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                      }}
                    >
                      {ip.education}
                    </span>
                  )}
                </div>

                {ip.personality && (
                  <p className="text-white/60 mt-3">{ip.personality}</p>
                )}
                {ip.catchphrase && (
                  <p className="text-lg italic mt-2 bg-gradient-to-r from-matcha-400 to-cyan-400 bg-clip-text text-transparent">
                    "{ip.catchphrase}"
                  </p>
                )}
              </div>
            </div>

            {/* Body Stats */}
            {(ip.height || ip.weight || ip.bust || ip.waist || ip.hip) && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <h3 className="text-sm font-medium text-white/60 mb-4">身体数据</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {ip.height && (
                    <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <p className="text-xs text-white/40 mb-1">身高</p>
                      <p className="text-lg font-semibold text-white">{Number(ip.height)} <span className="text-sm text-white/60">cm</span></p>
                    </div>
                  )}
                  {ip.weight && (
                    <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <p className="text-xs text-white/40 mb-1">体重</p>
                      <p className="text-lg font-semibold text-white">{Number(ip.weight)} <span className="text-sm text-white/60">kg</span></p>
                    </div>
                  )}
                  {ip.bust && (
                    <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <p className="text-xs text-white/40 mb-1">胸围</p>
                      <p className="text-lg font-semibold text-white">{Number(ip.bust)} <span className="text-sm text-white/60">cm</span></p>
                    </div>
                  )}
                  {ip.waist && (
                    <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <p className="text-xs text-white/40 mb-1">腰围</p>
                      <p className="text-lg font-semibold text-white">{Number(ip.waist)} <span className="text-sm text-white/60">cm</span></p>
                    </div>
                  )}
                  {ip.hip && (
                    <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <p className="text-xs text-white/40 mb-1">臀围</p>
                      <p className="text-lg font-semibold text-white">{Number(ip.hip)} <span className="text-sm text-white/60">cm</span></p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Images Gallery */}
          {ip.images && ip.images.length > 0 && (
            <div
              className="relative overflow-hidden rounded-2xl p-6 backdrop-blur-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <h3 className="text-lg font-semibold text-white mb-4">形象图库</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {ip.images[0].avatarUrl && (
                  <div className="group">
                    <p className="text-xs text-white/40 mb-2">头像</p>
                    <div className="relative rounded-xl overflow-hidden">
                      <img src={ip.images[0].avatarUrl} alt="avatar" className="w-full aspect-square object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                        <span className="text-xs text-white/80">点击查看</span>
                      </div>
                    </div>
                  </div>
                )}
                {ip.images[0].fullBodyUrl && (
                  <div className="group">
                    <p className="text-xs text-white/40 mb-2">全身图</p>
                    <div className="relative rounded-xl overflow-hidden">
                      <img src={ip.images[0].fullBodyUrl} alt="full body" className="w-full aspect-square object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                        <span className="text-xs text-white/80">点击查看</span>
                      </div>
                    </div>
                  </div>
                )}
                {ip.images[0].threeViewUrl && (
                  <div className="group">
                    <p className="text-xs text-white/40 mb-2">三视图</p>
                    <div className="relative rounded-xl overflow-hidden">
                      <img src={ip.images[0].threeViewUrl} alt="three view" className="w-full aspect-square object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                        <span className="text-xs text-white/80">点击查看</span>
                      </div>
                    </div>
                  </div>
                )}
                {ip.images[0].nineViewUrl && (
                  <div className="group">
                    <p className="text-xs text-white/40 mb-2">九视图</p>
                    <div className="relative rounded-xl overflow-hidden">
                      <img src={ip.images[0].nineViewUrl} alt="nine view" className="w-full aspect-square object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                        <span className="text-xs text-white/80">点击查看</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="space-y-6">
          {/* Edit Card */}
          <div
            className="relative overflow-hidden rounded-2xl p-6 backdrop-blur-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span>✏️</span> 编辑信息
            </h3>
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
          </div>

          {/* Upload Card */}
          <div
            className="relative overflow-hidden rounded-2xl p-6 backdrop-blur-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span>📤</span> 上传图片
            </h3>
            <IpImageUploader ipId={ip.id} />
          </div>

          {/* Danger Zone */}
          <div
            className="relative overflow-hidden rounded-2xl p-6 backdrop-blur-xl"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
            }}
          >
            <h3 className="text-lg font-semibold text-red-300 mb-4 flex items-center gap-2">
              <span>⚠️</span> 危险区域
            </h3>
            <button
              className="w-full py-2.5 rounded-xl bg-red-500/20 text-red-300 font-medium border border-red-500/30 hover:bg-red-500/30 transition-all"
            >
              删除此 IP
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
