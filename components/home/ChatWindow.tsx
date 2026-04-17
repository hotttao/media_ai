'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const messages = [
  {
    role: 'assistant',
    content: '您好！我是您的AI视频创作助手。我可以帮助您完成视频创作，或者您也可以直接选择下方的视频工具来开始。',
  },
]

export function ChatWindow() {
  const [input, setInput] = useState('')
  const [chatMessages, setChatMessages] = useState(messages)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [chatMessages])

  const handleSend = () => {
    if (!input.trim()) return

    // Add user message
    setChatMessages([...chatMessages, { role: 'user', content: input }])
    setInput('')

    // Simulate AI response
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: '我正在理解您的需求... 请稍候，您也可以直接选择下方的视频工具开始创作。',
      }])
    }, 1000)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0f1a] rounded-xl overflow-hidden border border-cyan-500/20 shadow-[0_0_40px_rgba(6,182,212,0.1)]">
      {/* Header */}
      <div className="px-5 py-4 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 to-transparent">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
              <span className="text-lg">🤖</span>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-[#0a0f1a] animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-cyan-400">AI 创作助手</h3>
            <p className="text-xs text-cyan-400/50">在线</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {chatMessages.map((msg, index) => (
          <div
            key={index}
            className={`flex gap-3 animate-fade-in ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center flex-shrink-0">
                <span className="text-sm">🤖</span>
              </div>
            )}
            <div
              className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-cyan-100 rounded-tr-sm'
                  : 'bg-white/5 text-gray-200 rounded-tl-sm border border-white/10'
              }`}
            >
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center flex-shrink-0">
                <span className="text-sm">👤</span>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-cyan-500/20 bg-gradient-to-t from-cyan-500/5 to-transparent">
        <div className="flex gap-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入您的创作需求..."
            className="flex-1 bg-white/5 border-cyan-500/30 text-white placeholder:text-cyan-400/40 rounded-xl focus:ring-cyan-500/50 focus:border-cyan-500/50"
          />
          <Button
            onClick={handleSend}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-xl px-6 shadow-lg shadow-cyan-500/25 transition-all hover:shadow-cyan-500/40 hover:scale-105"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  )
}
