'use client'

import Link from 'next/link'
import { ChatWindow } from '@/components/home/ChatWindow'
import { VideoToolCard } from '@/components/home/VideoToolCard'
import { PromptElementsBar } from '@/components/home/PromptElementsBar'

const videoTools = [
  {
    id: '1',
    title: '口红带货视频',
    description: '生成口红带货视频，包含人物生成、商品植入、视频合成',
    href: '/workflows/lipstick-promo/wizard',
    gradient: 'from-rose-500 to-pink-500',
    icon: '💄',
  },
  {
    id: '2',
    title: '护肤推广视频',
    description: '生成护肤产品推广视频，展示产品功效和使用场景',
    href: '/workflows/skincare-promo/wizard',
    gradient: 'from-cyan-500 to-blue-500',
    icon: '✨',
  },
  {
    id: '3',
    title: '香水推广视频',
    description: '生成香水推广视频，营造优雅氛围和品牌调性',
    href: '/workflows/perfume-promo/wizard',
    gradient: 'from-violet-500 to-purple-500',
    icon: '🌸',
  },
  {
    id: '4',
    title: '人设介绍视频',
    description: '生成虚拟IP人设介绍视频，展示角色特点和背景故事',
    href: '/workflows/persona-intro/wizard',
    gradient: 'from-emerald-500 to-teal-500',
    icon: '👤',
  },
  {
    id: '5',
    title: '每日分享视频',
    description: '生成每日分享类视频，适合社交媒体日常内容更新',
    href: '/workflows/daily-share/wizard',
    gradient: 'from-orange-500 to-amber-500',
    icon: '📱',
  },
  {
    id: '6',
    title: '多IP联动视频',
    description: '生成多虚拟IP联动视频，适合品牌合作和联动活动',
    href: '/workflows/multi-ip/wizard',
    gradient: 'from-pink-500 to-rose-500',
    icon: '🎭',
  },
]

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Animated background grid */}
      <div className="fixed inset-0 -z-10">
        {/* Dark gradient base */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, #0a0f1a 0%, #0f172a 50%, #0a0f1a 100%)',
          }}
        />

        {/* Animated grid */}
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(6,182,212,0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(6,182,212,0.3) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
            animation: 'gridMove 20s linear infinite',
          }}
        />

        {/* Radial gradient overlays */}
        <div
          className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl"
          style={{ animation: 'pulse 8s ease-in-out infinite' }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"
          style={{ animation: 'pulse 8s ease-in-out infinite 4s' }}
        />
        <div
          className="absolute top-1/2 right-1/3 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"
          style={{ animation: 'pulse 6s ease-in-out infinite 2s' }}
        />

        {/* Noise texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400">
              AI 创作中心
            </h1>
            <p className="text-gray-500 mt-1">智能视频内容生成平台</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-sm text-cyan-400">系统正常</span>
          </div>
        </div>

        {/* Chat Window */}
        <div className="h-[35vh] min-h-[280px] max-h-[400px]">
          <ChatWindow />
        </div>

        {/* Video Tools Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">视频工具</h2>
                <p className="text-xs text-gray-500">选择工具开始创作</p>
              </div>
            </div>
            <Link
              href="/workflows"
              className="group flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              查看全部
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {videoTools.map((tool, index) => (
              <div
                key={tool.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <VideoToolCard
                  id={tool.id}
                  title={tool.title}
                  description={tool.description}
                  href={tool.href}
                  gradient={tool.gradient}
                  icon={tool.icon}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Prompt Elements Bar */}
        <div className="animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <PromptElementsBar />
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx global>{`
        @keyframes gridMove {
          0% { transform: translateY(0); }
          100% { transform: translateY(60px); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.1); }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
