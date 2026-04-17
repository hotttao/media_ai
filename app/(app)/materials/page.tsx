import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'
import { MaterialCard } from '@/components/material/MaterialCard'
import { MaterialUploader } from '@/components/material/MaterialUploader'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default async function MaterialsPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/login')
  }

  const materials = await db.material.findMany({
    where: {
      OR: [
        { visibility: 'PUBLIC' },
        { visibility: 'TEAM', teamId: session.user.teamId },
        { visibility: 'PERSONAL', userId: session.user.id },
      ],
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">素材库</h1>
          <p className="text-warm-silver mt-1">管理你的服装、场景、妆容等素材</p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button>上传素材</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>上传新素材</DialogTitle>
            </DialogHeader>
            <MaterialUploader />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter */}
      <div className="flex gap-4">
        <Select>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="素材类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">全部类型</SelectItem>
            <SelectItem value="CLOTHING">服装</SelectItem>
            <SelectItem value="SCENE">场景</SelectItem>
            <SelectItem value="ACTION">动作</SelectItem>
            <SelectItem value="MAKEUP">妆容</SelectItem>
            <SelectItem value="ACCESSORY">配饰</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {materials.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-warm-silver mb-4">还没有上传任何素材</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {materials.map((material) => (
            <MaterialCard key={material.id} material={material} />
          ))}
        </div>
      )}
    </div>
  )
}