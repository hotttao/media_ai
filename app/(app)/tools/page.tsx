'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Tool {
  id: string
  name: string
  description: string
  icon: string
  gradient: string
  href: string
  inputs: { name: string; type: string }[]
  outputs: { name: string; type: string }[]
}

export default function ToolsPage() {
  const [tools, setTools] = useState<Tool[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/tools')
      .then(res => res.json())
      .then(data => {
        setTools(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-background to-fuchsia-100">
      {/* Floating orbs */}
      <div className="fixed top-20 left-20 w-96 h-96 bg-violet-300/30 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="fixed bottom-20 right-20 w-80 h-80 bg-fuchsia-300/30 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <span className="text-2xl">⚙️</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-warm-charcoal tracking-tight">视频生成工具</h1>
              <p className="text-warm-silver mt-1">所有可用的视频生成工具</p>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-4xl font-bold text-warm-charcoal">{tools.length}</span>
            <span className="text-warm-silver ml-2">个工具</span>
          </div>
        </div>

        {/* Tools Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {tools.map((tool) => (
              <Link
                key={tool.id}
                href={tool.href}
                className={`
                  relative overflow-hidden rounded-2xl p-5 text-left
                  transition-all duration-300 hover:scale-[1.02] hover:shadow-xl
                  bg-gradient-to-br ${tool.gradient}
                `}
              >
                <div className="text-3xl mb-3">{tool.icon}</div>
                <h3 className="text-white font-bold text-lg mb-1">{tool.name}</h3>
                <p className="text-white/80 text-sm line-clamp-2">{tool.description}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
