import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { getVideosByTeam } from '@/domains/video/service'
import { VideoGrid } from '@/components/video/VideoGrid'

export default async function VideosPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/login')
  }

  if (!session.user.teamId) {
    redirect('/')
  }

  const videos = await getVideosByTeam(session.user.teamId)

  return (
    <div className="space-y-8 p-6">
      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-matcha-800/70 via-slate-900 to-stone-900 p-8 shadow-2xl shadow-black/20">
        <div className="max-w-3xl">
          <div className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs tracking-[0.24em] text-white/70">
            VIDEO LIBRARY
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-white">视频库</h1>
          <p className="mt-3 text-sm leading-6 text-white/65">
            从全局快速浏览所有已生成视频。这里优先按最新时间排序，适合先找视频，再回到具体商品。
          </p>
          <div className="mt-6 inline-flex rounded-2xl bg-black/20 px-4 py-3 text-sm text-white/80">
            当前共 {videos.length} 条视频
          </div>
        </div>
      </section>

      <VideoGrid
        videos={videos}
        emptyTitle="还没有任何视频"
        emptyDescription="先从商品详情页生成或上传视频，这里会自动汇总展示。"
        emptyActionHref="/products"
        emptyActionLabel="去商品页生成视频"
      />
    </div>
  )
}
