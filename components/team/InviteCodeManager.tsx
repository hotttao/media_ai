'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { usePermissions } from '@/foundation/hooks/usePermissions'

interface InviteCode {
  id: string
  code: string
  teamName: string
  used: boolean
  expiresAt: string
  createdAt: string
}

export function InviteCodeManager() {
  const { isAdmin } = usePermissions()
  const [codes, setCodes] = useState<InviteCode[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [newCode, setNewCode] = useState<string | null>(null)

  async function fetchCodes() {
    setIsLoading(true)
    try {
      const response = await fetch('/api/teams/invite-codes')
      if (response.ok) {
        const data = await response.json()
        setCodes(data)
      }
    } catch (error) {
      console.error('Failed to fetch codes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function createCode() {
    setIsLoading(true)
    try {
      const response = await fetch('/api/teams/invite-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: 'current-team' }),
      })
      if (response.ok) {
        const code = await response.json()
        setNewCode(code.code)
        fetchCodes()
      }
    } catch (error) {
      console.error('Failed to create code:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-warm-silver">Only admins can manage invite codes.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite Codes</CardTitle>
        <CardDescription>Generate codes to invite new team members</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <Button onClick={createCode} disabled={isLoading}>
            Generate New Code
          </Button>
          <Button variant="outline" onClick={fetchCodes} disabled={isLoading}>
            Refresh
          </Button>
        </div>

        {newCode && (
          <div className="p-4 bg-matcha-300 text-white rounded-card">
            <p className="text-sm font-medium">New invite code:</p>
            <p className="text-2xl font-mono font-bold mt-1">{newCode}</p>
            <p className="text-sm mt-2 opacity-80">Share this code with your team member</p>
          </div>
        )}

        {codes.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes.map((code) => (
                <TableRow key={code.id}>
                  <TableCell className="font-mono">{code.code}</TableCell>
                  <TableCell>
                    <Badge variant={code.used ? 'secondary' : 'success'}>
                      {code.used ? 'Used' : 'Available'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(code.expiresAt) < new Date() ? (
                      <span className="text-red-500">Expired</span>
                    ) : (
                      new Date(code.expiresAt).toLocaleDateString()
                    )}
                  </TableCell>
                  <TableCell>{new Date(code.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
