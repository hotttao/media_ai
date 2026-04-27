export default function VideosLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4">
        <div className="h-14 w-14 animate-spin rounded-full border-2 border-matcha-500/20 border-t-matcha-500" />
        <p className="text-sm text-white/55">正在加载视频…</p>
      </div>
    </div>
  )
}
