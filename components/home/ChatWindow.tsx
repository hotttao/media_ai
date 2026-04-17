'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function ChatWindow() {
  const [input, setInput] = useState('')

  return (
    <div className="flex flex-col h-full bg-dark-charcoal rounded-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10">
        <h3 className="text-sm font-medium text-white/90">智能体</h3>
      </div>

      {/* Messages area - empty for now */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-matcha-600 flex items-center justify-center text-sm text-white">
            AI
          </div>
          <div className="bg-white/10 rounded-lg p-3 max-w-[80%]">
            <p className="text-sm text-white/80">
              您好！我是您的AI视频创作助手。我可以帮助您完成视频创作，或者您也可以直接选择下方的视频工具来开始。
            </p>
          </div>
        </div>
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-white/10">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入您的需求..."
            className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-feature"
          />
          <Button
            size="sm"
            className="bg-matcha-600 hover:bg-matcha-800 text-white rounded-feature px-4"
          >
            发送
          </Button>
        </div>
      </div>
    </div>
  )
}
