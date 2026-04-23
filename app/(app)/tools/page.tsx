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

const typeLabels: Record<string, string> = {
  'image': '图片',
  'image[]': '图片组',
  'text': '文本',
  'video': '视频',
}

export default function ToolsPage() {
  const [tools, setTools] = useState<Tool[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null)

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
              <button
                key={tool.id}
                onClick={() => setSelectedTool(tool)}
                className={`
                  relative overflow-hidden rounded-2xl p-5 text-left
                  transition-all duration-300 hover:scale-[1.02] hover:shadow-xl
                  bg-gradient-to-br ${tool.gradient}
                `}
              >
                <div className="text-3xl mb-3">{tool.icon}</div>
                <h3 className="text-white font-bold text-lg mb-1">{tool.name}</h3>
                <p className="text-white/80 text-sm line-clamp-2">{tool.description}</p>
              </button>
            ))}
          </div>
        )}

        {/* Tool Detail Modal */}
        {selectedTool && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
            onClick={() => setSelectedTool(null)}
          >
            <div
              className="w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
              style={{
                background: 'linear-gradient(180deg, rgba(30,20,40,0.98) 0%, rgba(20,15,30,0.99) 100%)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{selectedTool.icon}</span>
                  <h3 className="text-lg font-semibold text-white">{selectedTool.name}</h3>
                </div>
                <button
                  onClick={() => setSelectedTool(null)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20"
                >
                  ✕
                </button>
              </div>
              <div className="p-4 space-y-4">
                <p className="text-white/90">{selectedTool.description}</p>

                <div>
                  <h4 className="text-sm font-medium text-white/70 mb-2">输入</h4>
                  <div className="space-y-2">
                    {selectedTool.inputs.map((input, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="px-2 py-0.5 rounded bg-cyan-500/30 text-cyan-300 text-xs">
                          {typeLabels[input.type] || input.type}
                        </span>
                        <span className="text-white/90">{input.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-white/70 mb-2">输出</h4>
                  <div className="space-y-2">
                    {selectedTool.outputs.map((output, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-300 text-xs">
                          {typeLabels[output.type] || output.type}
                        </span>
                        <span className="text-white/90">{output.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Link
                    href={selectedTool.href}
                    className="flex-1 py-2 px-4 rounded-xl bg-matcha-600 text-white text-center font-medium hover:bg-matcha-800 transition-all"
                  >
                    立即使用
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
