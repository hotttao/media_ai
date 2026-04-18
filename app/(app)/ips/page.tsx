'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { IpCard } from '@/components/ip/IpCard'

interface Ip {
  id: string
  nickname: string
  avatarUrl: string | null
  gender: string | null
  personality: string | null
  images: Array<{ fullBodyUrl: string | null }>
}

export default function IpsPage() {
  const [ips, setIps] = useState<Ip[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/ips')
      .then(res => res.json())
      .then(data => {
        setIps(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-matcha-500 border-t-transparent animate-spin" />
          <p className="text-white/60">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-white">虚拟 IP 列表</h2>
          <span className="px-2 py-0.5 rounded-full text-xs bg-white/10 text-white/60">
            {ips.length} 个
          </span>
        </div>
        <Link
          href="/ips/new"
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-matcha-600 to-matcha-500 text-white font-medium shadow-lg shadow-matcha-500/30 hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
        >
          <span className="text-lg">+</span>
          创建新 IP
        </Link>
      </div>

      {ips.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 rounded-2xl" style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px dashed rgba(255,255,255,0.1)',
        }}>
          <div className="text-6xl mb-4">👤</div>
          <p className="text-white/60 mb-4">还没有创建任何虚拟 IP</p>
          <Link
            href="/ips/new"
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-matcha-600 to-matcha-500 text-white font-medium shadow-lg shadow-matcha-500/30 hover:shadow-xl transition-all"
          >
            创建你的第一个 IP
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ips.map((ip) => (
            <IpCard key={ip.id} ip={ip} />
          ))}
        </div>
      )}
    </div>
  )
}
