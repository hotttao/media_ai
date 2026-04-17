'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function RegisterForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(event.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string
    const nickname = formData.get('nickname') as string
    const inviteCode = formData.get('inviteCode') as string
    const teamName = formData.get('teamName') as string

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      setIsLoading(false)
      return
    }

    if (password.length < 8) {
      setError('密码至少8个字符')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, nickname, inviteCode: inviteCode || undefined, teamName: teamName || undefined }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || '注册失败')
        return
      }

      // Redirect to login page after successful registration
      router.push('/login?registered=true')
    } catch {
      setError('发生未知错误')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">邮箱</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="nickname">昵称（选填）</Label>
        <Input
          id="nickname"
          name="nickname"
          type="text"
          placeholder="您的显示名称"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">密码</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          required
          minLength={8}
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">确认密码</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder="••••••••"
          required
          minLength={8}
          disabled={isLoading}
        />
      </div>

      <div className="border-t border-border pt-4 mt-4">
        <p className="text-sm text-warm-silver mb-3">如有邀请码请填写，可跳过此步骤</p>

        <div className="space-y-2">
          <Label htmlFor="inviteCode">邀请码（选填）</Label>
          <Input
            id="inviteCode"
            name="inviteCode"
            type="text"
            placeholder="XXXXXXXX"
            disabled={isLoading}
            className="uppercase"
          />
        </div>

        <div className="space-y-2 mt-3">
          <Label htmlFor="teamName">团队名称（无邀请码时填写）</Label>
          <Input
            id="teamName"
            name="teamName"
            type="text"
            placeholder="我的团队"
            disabled={isLoading}
          />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? '注册中...' : '注册'}
      </Button>

      <p className="text-center text-sm text-warm-silver">
        已有账号？{' '}
        <a href="/login" className="text-foreground underline hover:opacity-80">
          登录
        </a>
      </p>
    </form>
  )
}
