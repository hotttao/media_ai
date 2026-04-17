'use client'

import { ChatWindow } from '@/components/home/ChatWindow'
import { VideoToolCard } from '@/components/home/VideoToolCard'
import { PromptElementsBar } from '@/components/home/PromptElementsBar'

const videoTools = [
  {
    id: '1',
    title: '口红带货视频',
    description: '生成口红带货视频，包含人物生成、商品植入、视频合成',
    href: '/workflows/lipstick-promo/wizard',
    gradient: 'from-rose-100 to-pink-200',
    icon: '💄',
  },
  {
    id: '2',
    title: '护肤推广视频',
    description: '生成护肤产品推广视频，展示产品功效和使用场景',
    href: '/workflows/skincare-promo/wizard',
    gradient: 'from-cyan-100 to-blue-200',
    icon: '✨',
  },
  {
    id: '3',
    title: '香水推广视频',
    description: '生成香水推广视频，营造优雅氛围和品牌调性',
    href: '/workflows/perfume-promo/wizard',
    gradient: 'from-violet-100 to-purple-200',
    icon: '🌸',
  },
  {
    id: '4',
    title: '人设介绍视频',
    description: '生成虚拟IP人设介绍视频，展示角色特点和背景故事',
    href: '/workflows/persona-intro/wizard',
    gradient: 'from-emerald-100 to-teal-200',
    icon: '👤',
  },
  {
    id: '5',
    title: '每日分享视频',
    description: '生成每日分享类视频，适合社交媒体日常内容更新',
    href: '/workflows/daily-share/wizard',
    gradient: 'from-orange-100 to-amber-200',
    icon: '📱',
  },
  {
    id: '6',
    title: '多IP联动视频',
    description: '生成多虚拟IP联动视频，适合品牌合作和联动活动',
    href: '/workflows/multi-ip/wizard',
    gradient: 'from-pink-100 to-rose-200',
    icon: '🎭',
  },
]

export default function HomePage() {
  return (
    <div className="p-6">
      <div className="flex gap-6 h-[calc(100vh-48px-48px)]">
        {/* Chat Window - left side */}
        <div className="w-[480px] flex-shrink-0">
          <ChatWindow />
        </div>

        {/* Right side - Video Tools + Prompt Elements */}
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
          {/* Video Tools Section */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-matcha-400 to-matcha-600 flex items-center justify-center shadow-md">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">视频工具</h2>
                <p className="text-xs text-gray-500">选择工具开始创作</p>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {videoTools.map((tool) => (
                <VideoToolCard
                  key={tool.id}
                  id={tool.id}
                  title={tool.title}
                  description={tool.description}
                  href={tool.href}
                  gradient={tool.gradient}
                  icon={tool.icon}
                />
              ))}
            </div>
          </div>

          {/* Prompt Elements Bar */}
          <PromptElementsBar />
        </div>
      </div>
    </div>
  )
}
