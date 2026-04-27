import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { getVideoDetail } from '@/domains/video/service'
import { VideoGrid } from '@/components/video/VideoGrid'
import { VideoPlayerPanel } from '@/components/video/VideoPlayerPanel'
import { VideoTaskPanel } from '@/components/video/VideoTaskPanel'
import { VideoTraceTimeline } from '@/components/video/VideoTraceTimeline'

export default async function VideoDetailPage({
  params,
}: {
  params: { videoId: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/login')
  }

  if (!session.user.teamId) {
    redirect('/videos')
  }

  const video = await getVideoDetail(params.videoId, session.user.teamId)
  if (!video) {
    notFound()
  }

  return (
    <div className="space-y-8 p-6">
      <Link
        href="/videos"
        className="inline-flex items-center gap-2 text-sm text-white/55 transition-colors hover:text-white"
      >
        <span>←</span>
        <span>返回视频库</span>
      </Link>

      <VideoPlayerPanel video={video} />
      <VideoTraceTimeline video={video} />
      <VideoTaskPanel task={video.task} />

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-white">同商品相关视频</h2>
          <p className="mt-1 text-sm text-white/50">继续浏览同一商品下的其他视频，不用反复返回列表。</p>
        </div>
        <VideoGrid
          videos={video.relatedVideos}
          emptyTitle="这个商品暂时只有当前视频"
          emptyDescription="后续生成或上传更多视频后，这里会自动出现。"
        />
      </section>
    </div>
  )
}
