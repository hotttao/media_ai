import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Media AI - 虚拟IP带货视频智能体',
  description: '为内容创作者提供虚拟IP管理和智能视频生成能力',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
