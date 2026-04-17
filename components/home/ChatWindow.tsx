'use client'

import { useState, useRef, useEffect } from 'react'

const initialMessages = [
  {
    role: 'assistant',
    content: '您好！我是您的AI视频创作助手。我可以帮助您完成视频创作，或者您也可以直接选择下方的视频工具来开始。',
  },
]

export function ChatWindow() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState(initialMessages)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = () => {
    if (!input.trim()) return
    setMessages([...messages, { role: 'user', content: input }])
    setInput('')
    setTimeout(() => {
      setMessages(prev => [...prev, {
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
    <div className="h-full flex flex-col bg-warm-charcoal rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-matcha-300 to-matcha-600 flex items-center justify-center shadow-md">
              <span className="text-lg">🤖</span>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-warm-charcoal" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">AI 创作助手</h3>
            <p className="text-xs text-white/60">在线</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-warm-charcoal/50">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-matcha-300 to-matcha-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-sm">🤖</span>
              </div>
            )}
            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-matcha-600 to-matcha-500 text-white rounded-tr-sm'
                  : 'bg-white/10 backdrop-blur-sm text-white/90 rounded-tl-sm border border-white/10'
              }`}
            >
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-sm text-white">👤</span>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10 bg-warm-charcoal">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入您的创作需求..."
            className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-matcha-500/40 focus:border-matcha-500/50 transition-all"
          />
          <button
            onClick={handleSend}
            className="px-6 py-3 bg-gradient-to-r from-matcha-600 to-matcha-500 text-white rounded-xl font-medium shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  )
}
