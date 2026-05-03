'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { IpForm } from '@/components/ip/IpForm'
import { IpImageUploader } from '@/components/ip/IpImageUploader'
import { getImageUrl } from '@/foundation/lib/utils'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IpData = any

type MaterialTab = 'MODEL' | 'FORMATTED' | 'FIRST_FRAME' | 'SCENES'
type GeneratedImage = { id: string; url: string }
type SceneAssociation = {
  id: string
  materialId: string
  material: {
    id: string
    name: string
    url: string
  } | null
}
type SceneOption = {
  id: string
  name: string
  url: string
}

interface IpDetailClientProps {
  ip: IpData
}

const MATERIAL_TAB_LABELS: Record<Exclude<MaterialTab, 'SCENES'>, string> = {
  MODEL: '模特图',
  FORMATTED: '定妆图',
  FIRST_FRAME: '首帧图',
}

async function fetchArray<T>(url: string): Promise<T[]> {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }

  const data = await response.json()
  return Array.isArray(data) ? data : []
}

function formatValue(value: unknown) {
  return value == null ? null : String(value)
}

export function IpDetailClient({ ip }: IpDetailClientProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [displayIp, setDisplayIp] = useState(ip)
  const [activeMaterialTab, setActiveMaterialTab] = useState<MaterialTab>('MODEL')
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [showAllImages, setShowAllImages] = useState(false)
  const [showSceneSelector, setShowSceneSelector] = useState(false)
  const [savingScenes, setSavingScenes] = useState(false)

  const [modelImages, setModelImages] = useState<GeneratedImage[]>([])
  const [styleImages, setStyleImages] = useState<GeneratedImage[]>([])
  const [firstFrames, setFirstFrames] = useState<GeneratedImage[]>([])
  const [scenes, setScenes] = useState<SceneAssociation[]>([])
  const [availableScenes, setAvailableScenes] = useState<SceneOption[]>([])

  useEffect(() => {
    setDisplayIp(ip)
  }, [ip])

  useEffect(() => {
    let cancelled = false

    async function loadPageData() {
      try {
        const [sceneData, materialSceneData, modelData, styleData, firstFrameData] = await Promise.all([
          fetchArray<SceneAssociation>(`/api/ips/${ip.id}/scenes`),
          fetchArray<SceneOption>('/api/materials?type=SCENE'),
          fetchArray<GeneratedImage>(`/api/model-images?ipId=${ip.id}`),
          fetchArray<GeneratedImage>(`/api/style-images?ipId=${ip.id}`),
          fetchArray<GeneratedImage>(`/api/first-frames?ipId=${ip.id}`),
        ])

        if (cancelled) {
          return
        }

        setScenes(sceneData)
        setAvailableScenes(materialSceneData)
        setModelImages(modelData)
        setStyleImages(styleData)
        setFirstFrames(firstFrameData)
      } catch (error) {
        console.error('Load IP detail assets error:', error)
        if (cancelled) {
          return
        }

        setScenes([])
        setAvailableScenes([])
        setModelImages([])
        setStyleImages([])
        setFirstFrames([])
      }
    }

    void loadPageData()

    return () => {
      cancelled = true
    }
  }, [ip.id])

  const currentTabImages = useMemo(() => {
    if (activeMaterialTab === 'MODEL') return modelImages
    if (activeMaterialTab === 'FORMATTED') return styleImages
    if (activeMaterialTab === 'FIRST_FRAME') return firstFrames
    return []
  }, [activeMaterialTab, firstFrames, modelImages, styleImages])

  const displayedImages = showAllImages ? currentTabImages : currentTabImages.slice(0, 3)
  const imageUrl =
    getImageUrl(displayIp.avatarUrl) ||
    getImageUrl(displayIp.fullBodyUrl) ||
    getImageUrl(displayIp.threeViewUrl) ||
    getImageUrl(displayIp.nineViewUrl) ||
    'https://via.placeholder.com/300'

  const handleUploadSuccess = () => {
    setShowUpload(false)
    router.refresh()
  }

  const handleSaveScenes = async (selectedIds: string[]) => {
    setSavingScenes(true)
    try {
      const response = await fetch(`/api/ips/${ip.id}/scenes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materialIds: selectedIds }),
      })

      if (!response.ok) {
        throw new Error(`Save scenes failed: ${response.status}`)
      }

      const nextScenes = await response.json()
      setScenes(Array.isArray(nextScenes) ? nextScenes : [])
      setShowSceneSelector(false)
    } catch (error) {
      console.error('Save scenes error:', error)
    } finally {
      setSavingScenes(false)
    }
  }

  const handleTabChange = (tab: MaterialTab) => {
    setActiveMaterialTab(tab)
    setShowAllImages(false)
  }

  const InfoRow = ({ label, value }: { label: string; value: string | null }) => {
    if (!value) return null

    return (
      <div className="flex items-start gap-3 border-b border-white/5 py-3 last:border-0">
        <span className="w-28 flex-shrink-0 text-sm text-white/40">{label}</span>
        <span className="flex-1 text-sm text-white/90">{value}</span>
      </div>
    )
  }

  if (isEditing) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">编辑 {ip.nickname}</h2>
          <button
            onClick={() => setIsEditing(false)}
            className="text-sm text-white/60 transition-colors hover:text-white"
          >
            取消编辑
          </button>
        </div>
        <IpForm
          initialData={{
            id: ip.id,
            nickname: ip.nickname,
            gender: ip.gender || undefined,
            age: ip.age ? Number(ip.age) : undefined,
            height: ip.height ? Number(ip.height) : undefined,
            weight: ip.weight ? Number(ip.weight) : undefined,
            education: ip.education || undefined,
            major: ip.major || undefined,
            personality: ip.personality || undefined,
            catchphrase: ip.catchphrase || undefined,
          }}
          isEdit
          onCancel={() => setIsEditing(false)}
          onSuccess={() => setIsEditing(false)}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div
        className="relative overflow-hidden rounded-2xl p-6 backdrop-blur-xl md:p-8"
        style={{
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.15))',
          border: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-cyan-500/20 blur-2xl opacity-60" />

        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
          <div className="relative flex-shrink-0 self-start">
            <div
              className="aspect-[9/16] w-20 overflow-hidden rounded-2xl bg-black/20 ring-2 ring-white/20"
              style={{ boxShadow: '0 0 40px rgba(139, 92, 246, 0.5)' }}
            >
              <img src={imageUrl} alt={displayIp.nickname} className="h-full w-full object-contain" />
            </div>
            <div className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 shadow-lg">
              <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-white" />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="mb-2 text-3xl font-bold text-white">{displayIp.nickname}</h2>

            <div className="mb-4 flex flex-wrap gap-2">
              {displayIp.gender && (
                <span
                  className="rounded-full px-3 py-1 text-xs font-medium"
                  style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)' }}
                >
                  {displayIp.gender === 'MALE' ? '男' : displayIp.gender === 'FEMALE' ? '女' : '其他'}
                </span>
              )}
              {displayIp.age && (
                <span
                  className="rounded-full px-3 py-1 text-xs font-medium"
                  style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)' }}
                >
                  {displayIp.age} 岁
                </span>
              )}
              {displayIp.city && (
                <span
                  className="rounded-full px-3 py-1 text-xs font-medium"
                  style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)' }}
                >
                  {displayIp.city}
                </span>
              )}
              {displayIp.occupation && (
                <span
                  className="rounded-full px-3 py-1 text-xs font-medium"
                  style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)' }}
                >
                  {displayIp.occupation}
                </span>
              )}
            </div>

            {displayIp.catchphrase && (
              <p className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-purple-400 bg-clip-text text-base italic text-transparent">
                "{displayIp.catchphrase}"
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 self-start sm:flex-row md:flex-col">
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-5 py-2 text-sm font-medium text-white transition-all hover:border-white/20 hover:bg-white/20"
            >
              <span>✎</span>
              <span>编辑资料</span>
            </button>
            <button
              onClick={() => setShowUpload((current) => !current)}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-5 py-2 text-sm font-medium text-white transition-all hover:border-white/20 hover:bg-white/20"
            >
              <span>上传</span>
              <span>{showUpload ? '收起' : '图片'}</span>
            </button>
          </div>
        </div>
      </div>

      {showUpload && (
        <div
          className="rounded-2xl p-6 backdrop-blur-xl"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <IpImageUploader ipId={displayIp.id} onUploadSuccess={handleUploadSuccess} />
        </div>
      )}

      <div
        className="rounded-2xl p-6 backdrop-blur-xl"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <h3 className="mb-4 text-sm font-medium text-white/60">形象图库</h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <ImageCard label="头像" imageUrl={displayIp.avatarUrl} alt="avatar" icon="avatar" />
          <ImageCard
            label="全身图"
            imageUrl={displayIp.fullBodyUrl}
            alt="full body"
            icon="image"
            onClick={displayIp.fullBodyUrl ? () => setLightboxImage(displayIp.fullBodyUrl) : undefined}
          />
          <ImageCard
            label="三视图"
            imageUrl={displayIp.threeViewUrl}
            alt="three view"
            icon="layout"
            onClick={displayIp.threeViewUrl ? () => setLightboxImage(displayIp.threeViewUrl) : undefined}
          />
          <ImageCard
            label="九视图"
            imageUrl={displayIp.nineViewUrl}
            alt="nine view"
            icon="grid"
            onClick={displayIp.nineViewUrl ? () => setLightboxImage(displayIp.nineViewUrl) : undefined}
          />
        </div>
        <p className="mt-3 text-xs text-white/30">
          {displayIp.avatarUrl || displayIp.fullBodyUrl || displayIp.threeViewUrl || displayIp.nineViewUrl
            ? '点击图片可查看大图'
            : '暂无图片，点击上方「上传图片」补充素材'}
        </p>
      </div>

      <div
        className="rounded-2xl p-6 backdrop-blur-xl"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="mb-4">
          <h3 className="text-sm font-medium text-white/60">IP 素材</h3>
          <p className="mt-1 text-sm text-white/35">展示该虚拟 IP 已生成的模特图、定妆图和首帧图，并配置可用场景。</p>
        </div>

        <div className="mb-4 overflow-x-auto">
          <div className="flex min-w-max gap-1 border-b border-white/10">
            <TabButton
              active={activeMaterialTab === 'MODEL'}
              label={`模特图 (${modelImages.length})`}
              onClick={() => handleTabChange('MODEL')}
            />
            <TabButton
              active={activeMaterialTab === 'FORMATTED'}
              label={`定妆图 (${styleImages.length})`}
              onClick={() => handleTabChange('FORMATTED')}
            />
            <TabButton
              active={activeMaterialTab === 'FIRST_FRAME'}
              label={`首帧图 (${firstFrames.length})`}
              onClick={() => handleTabChange('FIRST_FRAME')}
            />
            <TabButton
              active={activeMaterialTab === 'SCENES'}
              label={`使用场景 (${scenes.length})`}
              onClick={() => handleTabChange('SCENES')}
            />
          </div>
        </div>

        {activeMaterialTab === 'SCENES' ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-white/60">配置该虚拟 IP 在生成视频时可选择的场景素材。</p>
              <button
                onClick={() => setShowSceneSelector(true)}
                className="rounded-lg bg-violet-600/20 px-4 py-2 text-sm text-violet-300 transition-colors hover:bg-violet-600/30"
              >
                配置场景
              </button>
            </div>

            {scenes.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 text-center">
                <p className="mb-1 text-white/60">暂未配置使用场景</p>
                <p className="text-sm text-white/40">点击「配置场景」后，后续视频生成时只能从这些场景中选择。</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {scenes.map((scene) => (
                  <div key={scene.id} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-black/30">
                    {scene.material?.url ? (
                      <img src={getImageUrl(scene.material.url)} alt={scene.material.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-white/5 text-white/20">?</div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                      <p className="truncate text-xs text-white">{scene.material?.name || '未知场景'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {currentTabImages.length > 3 && (
              <div className="mb-4 flex justify-end">
                <button
                  onClick={() => setShowAllImages((current) => !current)}
                  className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white/80 transition-colors hover:bg-white/20"
                >
                  {showAllImages ? '收起' : `查看全部 (${currentTabImages.length})`}
                </button>
              </div>
            )}

            {displayedImages.length === 0 ? (
              <div className="py-8 text-center text-sm text-white/40">
                暂无 {MATERIAL_TAB_LABELS[activeMaterialTab as Exclude<MaterialTab, 'SCENES'>]} 素材
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                {displayedImages.map((image) => (
                  <div key={image.id} className="group">
                    <div
                      className="relative aspect-[9/16] max-h-60 cursor-pointer overflow-hidden rounded-xl bg-black/20 ring-1 ring-white/10 transition-all hover:ring-2 hover:ring-purple-500/50"
                      onClick={() => image.url && setLightboxImage(image.url)}
                    >
                      {image.url ? (
                        <img src={getImageUrl(image.url)} alt="" className="h-full w-full object-contain" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-white/[0.03]">
                          <ImagePlaceholder icon="image" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div
        className="rounded-2xl p-6 backdrop-blur-xl"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <h3 className="mb-4 text-sm font-medium text-white/60">详细信息</h3>
        <div>
          <InfoRow label="身高" value={displayIp.height ? `${displayIp.height} cm` : null} />
          <InfoRow label="体重" value={displayIp.weight ? `${displayIp.weight} kg` : null} />
          <InfoRow label="胸围" value={displayIp.bust ? `${displayIp.bust} cm` : null} />
          <InfoRow label="腰围" value={displayIp.waist ? `${displayIp.waist} cm` : null} />
          <InfoRow label="臀围" value={displayIp.hip ? `${displayIp.hip} cm` : null} />
          <InfoRow label="学历" value={formatValue(displayIp.education)} />
          <InfoRow label="专业" value={formatValue(displayIp.major)} />
          <InfoRow label="城市" value={formatValue(displayIp.city)} />
          <InfoRow label="职业" value={formatValue(displayIp.occupation)} />
          <InfoRow label="小癖好" value={formatValue(displayIp.smallHabit)} />
          <InfoRow label="家庭背景" value={formatValue(displayIp.familyBackground)} />
          <InfoRow label="收入水平" value={formatValue(displayIp.incomeLevel)} />
          <InfoRow label="兴趣爱好" value={formatValue(displayIp.hobbies)} />
        </div>
      </div>

      {displayIp.basicSetting && (
        <div
          className="rounded-2xl p-6 backdrop-blur-xl"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <h3 className="mb-3 text-sm font-medium text-white/60">人物基础设定</h3>
          <p className="leading-relaxed text-white/80">{displayIp.basicSetting}</p>
        </div>
      )}

      {displayIp.personality && (
        <div
          className="rounded-2xl p-6 backdrop-blur-xl"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <h3 className="mb-3 text-sm font-medium text-white/60">性格特点</h3>
          <p className="leading-relaxed text-white/80">{displayIp.personality}</p>
        </div>
      )}

      <div
        className="rounded-2xl p-6"
        style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.15)',
        }}
      >
        <h3 className="mb-3 text-sm font-medium text-red-400/80">危险区域</h3>
        <button className="w-full rounded-xl border border-red-500/20 bg-red-500/15 py-2.5 text-sm font-medium text-red-400 transition-all hover:bg-red-500/25">
          删除此 IP
        </button>
      </div>

      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-h-full max-w-4xl">
            <button
              className="absolute -top-10 right-0 text-2xl text-white/60 hover:text-white"
              onClick={() => setLightboxImage(null)}
            >
              ×
            </button>
            <img
              src={lightboxImage}
              alt=""
              className="max-h-[80vh] max-w-full rounded-lg object-contain"
              onClick={(event) => event.stopPropagation()}
            />
          </div>
        </div>
      )}

      {showSceneSelector && (
        <SceneSelectorModal
          availableScenes={availableScenes}
          selectedIds={scenes.map((scene) => scene.materialId)}
          onSave={handleSaveScenes}
          onClose={() => setShowSceneSelector(false)}
          isSaving={savingScenes}
        />
      )}
    </div>
  )
}

function TabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors ${
        active ? 'border-b-2 border-purple-500 text-white' : 'text-white/40 hover:text-white/60'
      }`}
    >
      {label}
    </button>
  )
}

function ImageCard({
  label,
  imageUrl,
  alt,
  icon,
  onClick,
}: {
  label: string
  imageUrl?: string | null
  alt: string
  icon: 'avatar' | 'image' | 'layout' | 'grid'
  onClick?: (() => void) | undefined
}) {
  return (
    <div className="group">
      <p className="mb-2 text-xs text-white/40">{label}</p>
      <div
        className={`relative aspect-[9/16] max-h-48 overflow-hidden rounded-xl bg-black/20 ring-1 ring-white/10 ${
          onClick ? 'cursor-pointer transition-all hover:ring-2 hover:ring-purple-500/50' : ''
        }`}
        onClick={onClick}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={alt} className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-white/[0.03]">
            <ImagePlaceholder icon={icon} />
          </div>
        )}
      </div>
    </div>
  )
}

function ImagePlaceholder({ icon }: { icon: 'avatar' | 'image' | 'layout' | 'grid' }) {
  if (icon === 'avatar') {
    return (
      <svg className="h-8 w-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    )
  }

  if (icon === 'layout') {
    return (
      <svg className="h-8 w-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z"
        />
      </svg>
    )
  }

  if (icon === 'grid') {
    return (
      <svg className="h-8 w-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
        />
      </svg>
    )
  }

  return (
    <svg className="h-8 w-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  )
}

function SceneSelectorModal({
  availableScenes,
  selectedIds,
  onSave,
  onClose,
  isSaving,
}: {
  availableScenes: SceneOption[]
  selectedIds: string[]
  onSave: (ids: string[]) => void
  onClose: () => void
  isSaving: boolean
}) {
  const [selected, setSelected] = useState<string[]>(selectedIds)

  const toggleScene = (id: string) => {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl shadow-2xl"
        style={{
          background: 'linear-gradient(180deg, rgba(30,30,35,0.98) 0%, rgba(20,20,25,0.99) 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <h3 className="text-lg font-semibold text-white">选择使用场景</h3>
          <button onClick={onClose} className="text-xl text-white/40 hover:text-white">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {availableScenes.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-white/60">暂无可用的场景素材</p>
              <p className="mt-1 text-sm text-white/40">请先在素材库上传 `SCENE` 类型的素材</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {availableScenes.map((scene) => (
                <button
                  key={scene.id}
                  type="button"
                  className={`relative aspect-[4/3] overflow-hidden rounded-xl text-left transition-all ${
                    selected.includes(scene.id)
                      ? 'ring-2 ring-violet-500 shadow-lg shadow-violet-500/30'
                      : 'hover:ring-1 hover:ring-white/30'
                  }`}
                  onClick={() => toggleScene(scene.id)}
                >
                  <img src={getImageUrl(scene.url)} alt={scene.name} className="h-full w-full object-cover" />
                  {selected.includes(scene.id) && (
                    <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-violet-500">
                      <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <p className="truncate text-xs text-white">{scene.name}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 border-t border-white/10 p-5">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-white/10 px-4 py-2.5 text-white/80 transition-colors hover:bg-white/20"
          >
            取消
          </button>
          <button
            onClick={() => onSave(selected)}
            disabled={isSaving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2.5 font-medium text-white transition-all hover:shadow-lg hover:shadow-violet-500/30 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                保存中...
              </>
            ) : (
              `保存 (${selected.length})`
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
