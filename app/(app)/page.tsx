import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { ChatWindow } from '@/components/home/ChatWindow'
import { VideoToolCard } from '@/components/home/VideoToolCard'
import { PromptElementsBar } from '@/components/home/PromptElementsBar'

const videoTools = [
  {
    id: '1',
    title: '口红带货视频',
    description: '生成口红带货视频，包含人物生成、商品植入、视频合成',
    href: '/workflows/lipstick-promo/wizard',
    gradient: 'from-[#e85d75] to-[#ff8a9b]',
  },
  {
    id: '2',
    title: '护肤推广视频',
    description: '生成护肤产品推广视频，展示产品功效和使用场景',
    href: '/workflows/skincare-promo/wizard',
    gradient: 'from-[#4a90a4] to-[#6bb3c9]',
  },
  {
    id: '3',
    title: '香水推广视频',
    description: '生成香水推广视频，营造优雅氛围和品牌调性',
    href: '/workflows/perfume-promo/wizard',
    gradient: 'from-[#9b7eb5] to-[#b89fd1]',
  },
  {
    id: '4',
    title: '人设介绍视频',
    description: '生成虚拟IP人设介绍视频，展示角色特点和背景故事',
    href: '/workflows/persona-intro/wizard',
    gradient: 'from-[#5a9e6f] to-[#7ec492]',
  },
  {
    id: '5',
    title: '每日分享视频',
    description: '生成每日分享类视频，适合社交媒体日常内容更新',
    href: '/workflows/daily-share/wizard',
    gradient: 'from-[#e6a54a] to-[#f5c06d]',
  },
  {
    id: '6',
    title: '多IP联动视频',
    description: '生成多虚拟IP联动视频，适合品牌合作和联动活动',
    href: '/workflows/multi-ip/wizard',
    gradient: 'from-[#d4726a] to-[#e9918a]',
  },
]

export default async function HomePage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-4">
      {/* Chat Window */}
      <div className="h-[45%] min-h-[300px]">
        <ChatWindow />
      </div>

      {/* Video Tools Section */}
      <div className="flex-1 flex flex-col gap-3 overflow-hidden">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-warm-charcoal">视频工具</h2>
          <a href="/workflows" className="text-sm text-matcha-600 hover:underline">
            查看全部
          </a>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 flex-1">
          {videoTools.map((tool) => (
            <VideoToolCard
              key={tool.id}
              id={tool.id}
              title={tool.title}
              description={tool.description}
              href={tool.href}
              gradient={tool.gradient}
            />
          ))}
        </div>
      </div>

      {/* Prompt Elements Bar */}
      <PromptElementsBar />
    </div>
  )
}
