import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface MaterialCardProps {
  material: {
    id: string
    name: string
    type: string
    url: string
    tags: string | null
    visibility: string
  }
  onClick?: () => void
}

export function MaterialCard({ material, onClick }: MaterialCardProps) {
  const tags = material.tags ? JSON.parse(material.tags as string) : []

  return (
    <Card
      className="overflow-hidden cursor-pointer hover:border-matcha-600 transition-colors"
      onClick={onClick}
    >
      <div className="aspect-square bg-oat-light relative">
        <img
          src={material.url}
          alt={material.name}
          className="w-full h-full object-cover"
        />
      </div>
      <CardContent className="p-3">
        <h3 className="font-medium truncate">{material.name}</h3>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="secondary" className="text-xs">
            {material.type}
          </Badge>
          <span className="text-xs text-warm-silver">
            {material.visibility === 'PUBLIC' ? '公共' :
             material.visibility === 'TEAM' ? '团队' : '私有'}
          </span>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {tags.slice(0, 3).map((tag: string) => (
              <span key={tag} className="text-xs bg-oat-light px-2 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}