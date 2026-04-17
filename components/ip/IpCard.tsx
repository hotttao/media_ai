import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface IpCardProps {
  ip: {
    id: string
    nickname: string
    avatar: string | null
    gender: string | null
    personality: string | null
    images: Array<{ avatarUrl: string | null }>
  }
}

export function IpCard({ ip }: IpCardProps) {
  const imageUrl = ip.images?.[0]?.avatarUrl || ip.avatar || 'https://via.placeholder.com/150'

  return (
    <Link href={`/ips/${ip.id}`}>
      <Card className="hover:border-matcha-600 transition-colors cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-oat-light flex-shrink-0">
              <img
                src={imageUrl}
                alt={ip.nickname}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{ip.nickname}</h3>
              <div className="flex items-center gap-2 mt-1">
                {ip.gender && (
                  <Badge variant="secondary" className="text-xs">
                    {ip.gender === 'MALE' ? '男' : ip.gender === 'FEMALE' ? '女' : '其他'}
                  </Badge>
                )}
                {ip.personality && (
                  <span className="text-xs text-warm-silver truncate">
                    {ip.personality}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}