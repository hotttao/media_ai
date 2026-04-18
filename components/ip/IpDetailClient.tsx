'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { IpForm } from '@/components/ip/IpForm'
import { IpImageUploader } from '@/components/ip/IpImageUploader'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IpData = any

interface IpDetailClientProps {
  ip: IpData
}

export function IpDetailClient({ ip }: IpDetailClientProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [displayIp, setDisplayIp] = useState(ip)
  const [activeMaterialTab, setActiveMaterialTab] = useState<'MAKEUP' | 'ACCESSORY' | 'CUSTOMIZED_CLOTHING'>('MAKEUP')
  const [materialPage, setMaterialPage] = useState(0)

  useEffect(() => {
    setDisplayIp(ip)
  }, [ip])

  const imageUrl = displayIp.avatarUrl || displayIp.fullBodyUrl || displayIp.threeViewUrl || displayIp.nineViewUrl || 'https://via.placeholder.com/300'

  const handleUploadSuccess = () => {
    setShowUpload(false)
    router.refresh()
  }

  const InfoRow = ({ label, value }: { label: string; value: string | null }) => {
    if (!value) return null
    return (
      <div className="flex items-start gap-3 py-3 border-b border-white/5 last:border-0">
        <span className="text-sm text-white/40 w-28 flex-shrink-0">{label}</span>
        <span className="text-sm text-white/90 flex-1">{value}</span>
      </div>
    )
  }

  if (isEditing) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">编辑 {ip.nickname}</h2>
          <button
            onClick={() => setIsEditing(false)}
            className="text-white/60 hover:text-white transition-colors text-sm"
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
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Hero Section */}
      <div
        className="relative overflow-hidden rounded-2xl p-8 backdrop-blur-xl"
        style={{
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.15))',
          border: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        {/* Glow */}
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-cyan-500/20 blur-2xl opacity-60" />

        <div className="relative z-10 flex items-start gap-8">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div
              className="w-28 h-28 rounded-2xl overflow-hidden ring-2 ring-white/20"
              style={{ boxShadow: '0 0 40px rgba(139, 92, 246, 0.5)' }}
            >
              <img src={imageUrl} alt={displayIp.nickname} className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg">
              <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
            </div>
          </div>

          {/* Basic Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-3xl font-bold text-white mb-2">{displayIp.nickname}</h2>

            <div className="flex flex-wrap gap-2 mb-4">
              {displayIp.gender && (
                <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)' }}>
                  {displayIp.gender === 'MALE' ? '♂ 男' : displayIp.gender === 'FEMALE' ? '♀ 女' : '⚥ 其他'}
                </span>
              )}
              {displayIp.age && <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)' }}>{displayIp.age}岁</span>}
              {displayIp.city && <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)' }}>{displayIp.city}</span>}
              {displayIp.occupation && <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)' }}>{displayIp.occupation}</span>}
            </div>

            {displayIp.catchphrase && (
              <p className="text-base italic bg-gradient-to-r from-emerald-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
                "{displayIp.catchphrase}"
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all border border-white/10 hover:border-white/20 flex items-center gap-2"
            >
              <span>✏️</span> 编辑资料
            </button>
            <button
              onClick={() => setShowUpload(!showUpload)}
              className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all border border-white/10 hover:border-white/20 flex items-center gap-2"
            >
              <span>📤</span> {showUpload ? '收起' : '上传图片'}
            </button>
          </div>
        </div>
      </div>

      {/* Upload Section */}
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

      {/* Image Gallery */}
      <div
        className="rounded-2xl p-6 backdrop-blur-xl"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <h3 className="text-sm font-medium text-white/60 mb-4">形象图库</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* 头像 */}
          <div className="group">
            <p className="text-xs text-white/40 mb-2">头像</p>
            <div className="relative rounded-xl overflow-hidden ring-1 ring-white/10 aspect-square">
              {displayIp.avatarUrl ? (
                <img src={displayIp.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </div>
          </div>
          {/* 全身图 */}
          <div className="group">
            <p className="text-xs text-white/40 mb-2">全身图</p>
            <div className="relative rounded-xl overflow-hidden ring-1 ring-white/10" style={{ aspectRatio: '3/4' }}>
              {displayIp.fullBodyUrl ? (
                <img src={displayIp.fullBodyUrl} alt="full body" className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>
          </div>
          {/* 三视图 */}
          <div className="group">
            <p className="text-xs text-white/40 mb-2">三视图</p>
            <div className="relative rounded-xl overflow-hidden ring-1 ring-white/10 aspect-square">
              {displayIp.threeViewUrl ? (
                <img src={displayIp.threeViewUrl} alt="three view" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" />
                  </svg>
                </div>
              )}
            </div>
          </div>
          {/* 九视图 */}
          <div className="group">
            <p className="text-xs text-white/40 mb-2">九视图</p>
            <div className="relative rounded-xl overflow-hidden ring-1 ring-white/10" style={{ aspectRatio: '3/4' }}>
              {displayIp.nineViewUrl ? (
                <img src={displayIp.nineViewUrl} alt="nine view" className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>
        {displayIp.avatarUrl || displayIp.fullBodyUrl || displayIp.threeViewUrl || displayIp.nineViewUrl ? (
          <p className="text-xs text-white/30 mt-3">点击图片可查看大图</p>
        ) : (
          <p className="text-xs text-white/30 mt-3">暂无图片，点击上方「上传图片」添加</p>
        )}
      </div>

      {/* IP Materials Section */}
      <div
        className="rounded-2xl p-6 backdrop-blur-xl"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <h3 className="text-sm font-medium text-white/60 mb-4">IP 素材</h3>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-4 border-b border-white/10">
          {(['MAKEUP', 'ACCESSORY', 'CUSTOMIZED_CLOTHING'] as const).map((tab) => {
            const count = displayIp.ipMaterials?.filter((m: any) => m.type === tab).length || 0
            return (
              <button
                key={tab}
                onClick={() => {
                  setActiveMaterialTab(tab)
                  setMaterialPage(0)
                }}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeMaterialTab === tab
                    ? 'text-white border-b-2 border-purple-500'
                    : 'text-white/40 hover:text-white/60'
                }`}
              >
                {tab === 'MAKEUP' ? '妆容' : tab === 'ACCESSORY' ? '装饰' : '定制服装'} ({count})
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        {(() => {
          const filteredMaterials = displayIp.ipMaterials?.filter((m: any) => m.type === activeMaterialTab) || []
          const itemsPerPage = 4
          const totalPages = Math.ceil(filteredMaterials.length / itemsPerPage)
          const paginatedMaterials = filteredMaterials.slice(materialPage * itemsPerPage, (materialPage + 1) * itemsPerPage)

          if (filteredMaterials.length === 0) {
            return (
              <div className="text-center py-8 text-white/40 text-sm">
                暂无 {activeMaterialTab === 'MAKEUP' ? '妆容' : activeMaterialTab === 'ACCESSORY' ? '装饰' : '定制服装'} 素材
              </div>
            )
          }

          return (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {paginatedMaterials.map((material: any) => {
                  const imageUrl = material.threeViewUrl || material.fullBodyUrl || null
                  return (
                    <div key={material.id} className="group">
                      <p className="text-xs text-white/40 mb-2 truncate">{material.name}</p>
                      <div
                        className="relative rounded-xl overflow-hidden ring-1 ring-white/10"
                        style={{ aspectRatio: '3/4' }}
                      >
                        {imageUrl ? (
                          <img src={imageUrl} alt={material.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                            <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      {material.material && (
                        <p className="text-xs text-white/30 mt-1 truncate">来源: {material.material.name}</p>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setMaterialPage(i)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                        materialPage === i
                          ? 'bg-purple-500/30 text-white'
                          : 'bg-white/5 text-white/40 hover:bg-white/10'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </>
          )
        })()}
      </div>

      {/* Detail Info */}
      <div
        className="rounded-2xl p-6 backdrop-blur-xl"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <h3 className="text-sm font-medium text-white/60 mb-4">详细信息</h3>
        <div>
          <InfoRow label="身高" value={displayIp.height ? `${displayIp.height} cm` : null} />
          <InfoRow label="体重" value={displayIp.weight ? `${displayIp.weight} kg` : null} />
          <InfoRow label="胸围" value={displayIp.bust ? `${displayIp.bust} cm` : null} />
          <InfoRow label="腰围" value={displayIp.waist ? `${displayIp.waist} cm` : null} />
          <InfoRow label="臀围" value={displayIp.hip ? `${displayIp.hip} cm` : null} />
          <InfoRow label="学历" value={displayIp.education} />
          <InfoRow label="专业" value={displayIp.major} />
          <InfoRow label="城市" value={displayIp.city} />
          <InfoRow label="职业" value={displayIp.occupation} />
          <InfoRow label="小癖好" value={displayIp.smallHabit} />
          <InfoRow label="家庭背景" value={displayIp.familyBackground} />
          <InfoRow label="收入水平" value={displayIp.incomeLevel} />
          <InfoRow label="兴趣爱好" value={displayIp.hobbies} />
        </div>
      </div>

      {/* Basic Setting */}
      {displayIp.basicSetting && (
        <div
          className="rounded-2xl p-6 backdrop-blur-xl"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <h3 className="text-sm font-medium text-white/60 mb-3">人物基础设定</h3>
          <p className="text-white/80 leading-relaxed">{displayIp.basicSetting}</p>
        </div>
      )}

      {/* Personality */}
      {displayIp.personality && (
        <div
          className="rounded-2xl p-6 backdrop-blur-xl"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <h3 className="text-sm font-medium text-white/60 mb-3">性格特点</h3>
          <p className="text-white/80 leading-relaxed">{displayIp.personality}</p>
        </div>
      )}

      {/* Danger Zone */}
      <div
        className="rounded-2xl p-6"
        style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.15)',
        }}
      >
        <h3 className="text-sm font-medium text-red-400/80 mb-3">危险区域</h3>
        <button className="w-full py-2.5 rounded-xl bg-red-500/15 text-red-400 font-medium border border-red-500/20 hover:bg-red-500/25 transition-all text-sm">
          删除此 IP
        </button>
      </div>
    </div>
  )
}
