'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'

// Types
interface VirtualIP {
  id: string
  nickname: string
  avatarUrl: string | null
  fullBodyUrl: string | null
}

interface ProductImage {
  id: string
  url: string
  isMain: boolean
}

interface Product {
  id: string
  name: string
  images: ProductImage[]
}

interface Material {
  id: string
  name: string
  url: string
  type: string
}

interface Movement {
  id: string
  content: string
  url: string | null
}

// Step configuration - PRD 4.2
const STEPS = [
  { id: 'select-ip', label: '选择虚拟IP', icon: '🎭' },
  { id: 'model-image', label: '模特图', icon: '👗' },
  { id: 'style-image', label: '定妆图', icon: '💄' },
  { id: 'first-frame', label: '首帧图', icon: '🖼️' },
  { id: 'video', label: '生成视频', icon: '🎥' },
]

// Animation variants
const pageVariants = {
  initial: { opacity: 0, x: 60, scale: 0.96 },
  animate: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } },
  exit: { opacity: 0, x: -60, scale: 0.96, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const } },
}

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.08 } }
}

const itemVariants = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } },
}

export function GenerateVideoWizard({ product }: { product: Product }) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Step 1: IP Selection
  const [ips, setIps] = useState<VirtualIP[]>([])
  const [selectedIp, setSelectedIp] = useState<VirtualIP | null>(null)
  const [ipLoading, setIpLoading] = useState(true)

  // Step 2: Model Image
  const [modelImageMode, setModelImageMode] = useState<'select' | 'generate'>('generate')
  const [existingModelImages, setExistingModelImages] = useState<string[]>([])
  const [selectedProductImage, setSelectedProductImage] = useState<ProductImage | null>(null)
  const [modelImageUrl, setModelImageUrl] = useState<string | null>(null)
  const [modelImageLoading, setModelImageLoading] = useState(false)

  // Step 3: Style Image
  const [poses, setPoses] = useState<Material[]>([])
  const [makeups, setMakeups] = useState<Material[]>([])
  const [accessories, setAccessories] = useState<Material[]>([])
  const [selectedPose, setSelectedPose] = useState<Material | null>(null)
  const [selectedMakeup, setSelectedMakeup] = useState<Material | null>(null)
  const [selectedAccessory, setSelectedAccessory] = useState<Material | null>(null)
  const [styledImageUrl, setStyledImageUrl] = useState<string | null>(null)
  const [styleImageLoading, setStyleImageLoading] = useState(false)

  // Step 4: First Frame
  const [scenes, setScenes] = useState<Material[]>([])
  const [selectedScene, setSelectedScene] = useState<Material | null>(null)
  const [composition, setComposition] = useState('')
  const [firstFrameUrl, setFirstFrameUrl] = useState<string | null>(null)
  const [firstFrameLoading, setFirstFrameLoading] = useState(false)

  // Step 5: Video
  const [movements, setMovements] = useState<Movement[]>([])
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoLoading, setVideoLoading] = useState(false)
  const [videoProgress, setVideoProgress] = useState(0)

  // Fetch IPs
  useEffect(() => {
    fetch('/api/ips')
      .then(res => res.json())
      .then(data => {
        setIps(data)
        setIpLoading(false)
      })
  }, [])

  // Fetch materials for steps 3 and 4
  useEffect(() => {
    if (currentStep >= 2) {
      Promise.all([
        fetch('/api/materials?type=POSE').then(r => r.json()),
        fetch('/api/materials?type=MAKEUP').then(r => r.json()),
        fetch('/api/materials?type=ACCESSORY').then(r => r.json()),
        fetch('/api/materials?type=SCENE').then(r => r.json()),
        fetch('/api/movement-materials').then(r => r.json()),
      ]).then(([posesData, makeupsData, accessoriesData, scenesData, movementsData]) => {
        setPoses(posesData)
        setMakeups(makeupsData)
        setAccessories(accessoriesData)
        setScenes(scenesData)
        setMovements(movementsData)
      })
    }
  }, [currentStep])

  // Fetch IP fullBodyUrl when selected
  useEffect(() => {
    if (selectedIp && !selectedIp.fullBodyUrl) {
      fetch(`/api/ips/${selectedIp.id}`)
        .then(res => res.json())
        .then(data => {
          setSelectedIp(prev => prev ? { ...prev, fullBodyUrl: data.fullBodyUrl } : null)
        })
    }
  }, [selectedIp])

  // Fetch existing model images when entering step 1
  useEffect(() => {
    if (currentStep === 1 && selectedIp) {
      fetch(`/api/product-materials?productId=${product.id}&ipId=${selectedIp.id}`)
        .then(res => res.json())
        .then(data => {
          const urls = data.filter((d: any) => d.fullBodyUrl).map((d: any) => d.fullBodyUrl)
          setExistingModelImages(urls)
        })
    }
  }, [currentStep, selectedIp, product.id])

  const goNext = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1))
  const goBack = () => setCurrentStep(prev => Math.max(prev - 1, 0))

  const canProceed = () => {
    switch (currentStep) {
      case 0: return !!selectedIp
      case 1: return !!modelImageUrl
      case 2: return !!selectedPose && !!styledImageUrl
      case 3: return !!selectedScene && !!composition && !!firstFrameUrl
      case 4: return !!selectedMovement && !!videoUrl
      default: return false
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-matcha-50 via-background to-oat-light">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-oat">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-semibold text-warm-charcoal">视频生成向导</h1>
            </div>
            <div className="flex items-center gap-2">
              {STEPS.map((step, idx) => (
                <button
                  key={step.id}
                  onClick={() => idx < currentStep && setCurrentStep(idx)}
                  className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300
                    ${idx === currentStep
                      ? 'bg-matcha-600 text-white'
                      : idx < currentStep
                        ? 'bg-oat-light text-warm-charcoal hover:bg-oat cursor-pointer'
                        : 'bg-gray-100 text-warm-silver'
                    }
                  `}
                >
                  <span>{step.icon}</span>
                  <span className="hidden lg:inline">{step.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div key={currentStep} variants={pageVariants} initial="initial" animate="animate" exit="exit">
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600">
                {error}
              </div>
            )}

            {currentStep === 0 && (
              <SelectIPStep
                ips={ips}
                loading={ipLoading}
                selectedIp={selectedIp}
                onSelect={setSelectedIp}
              />
            )}

            {currentStep === 1 && (
              <ModelImageStep
                product={product}
                selectedIp={selectedIp}
                mode={modelImageMode}
                onModeChange={setModelImageMode}
                existingImages={existingModelImages}
                selectedProductImage={selectedProductImage}
                onProductImageSelect={setSelectedProductImage}
                modelImageUrl={modelImageUrl}
                onSelectExisting={(url) => setModelImageUrl(url)}
                loading={modelImageLoading}
                onGenerate={async () => {
                  if (!selectedIp?.fullBodyUrl || !selectedProductImage) return
                  setModelImageLoading(true)
                  setError(null)
                  try {
                    const res = await fetch(`/api/products/${product.id}/model-image`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        ipId: selectedIp.id,
                        productMainImageUrl: selectedProductImage.url,
                        productDetailImageUrls: [],
                      }),
                    })
                    if (res.ok) {
                      const data = await res.json()
                      setModelImageUrl(data.modelImageUrl)
                    } else {
                      setError('生成失败')
                    }
                  } catch {
                    setError('生成失败')
                  } finally {
                    setModelImageLoading(false)
                  }
                }}
                canGenerate={!!selectedProductImage && !!selectedIp?.fullBodyUrl}
              />
            )}

            {currentStep === 2 && (
              <StyleImageStep
                poses={poses}
                makeups={makeups}
                accessories={accessories}
                selectedPose={selectedPose}
                selectedMakeup={selectedMakeup}
                selectedAccessory={selectedAccessory}
                onPoseSelect={setSelectedPose}
                onMakeupSelect={setSelectedMakeup}
                onAccessorySelect={setSelectedAccessory}
                styledImageUrl={styledImageUrl}
                loading={styleImageLoading}
                onGenerate={async () => {
                  // TODO: call style image API
                  setStyleImageLoading(false)
                }}
                canGenerate={!!selectedPose}
              />
            )}

            {currentStep === 3 && (
              <FirstFrameStep
                scenes={scenes}
                selectedScene={selectedScene}
                onSceneSelect={setSelectedScene}
                composition={composition}
                onCompositionChange={setComposition}
                firstFrameUrl={firstFrameUrl}
                loading={firstFrameLoading}
                onGenerate={async () => {
                  // TODO: call first frame API
                  setFirstFrameLoading(false)
                }}
                canGenerate={!!selectedScene && !!composition}
              />
            )}

            {currentStep === 4 && (
              <VideoStep
                movements={movements}
                selectedMovement={selectedMovement}
                onMovementSelect={setSelectedMovement}
                videoUrl={videoUrl}
                loading={videoLoading}
                progress={videoProgress}
                onGenerate={async () => {
                  // TODO: call video API
                  setVideoLoading(false)
                }}
                canGenerate={!!selectedMovement}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-lg border-t border-oat">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between">
          <button
            onClick={goBack}
            disabled={currentStep === 0}
            className="px-6 py-2 rounded-xl text-warm-charcoal hover:bg-oat-light disabled:opacity-50 disabled:cursor-not-allowed"
          >
            上一步
          </button>
          <button
            onClick={goNext}
            disabled={!canProceed()}
            className="px-6 py-2 rounded-xl bg-matcha-600 text-white hover:bg-matcha-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {currentStep === STEPS.length - 1 ? '完成' : '下一步'}
          </button>
        </div>
      </footer>
    </div>
  )
}

// Step 1: Select IP
function SelectIPStep({
  ips,
  loading,
  selectedIp,
  onSelect,
}: {
  ips: VirtualIP[]
  loading: boolean
  selectedIp: VirtualIP | null
  onSelect: (ip: VirtualIP) => void
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-warm-charcoal">选择虚拟IP</h2>
        <p className="text-warm-silver mt-1">选择一个虚拟IP用于生成视频</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-12 h-12 border-4 border-matcha-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : ips.length === 0 ? (
        <div className="text-center py-16">
          <span className="text-5xl mb-4 block">👤</span>
          <p className="text-warm-charcoal font-medium">暂无可用虚拟IP</p>
          <a href="/ips/new" className="mt-4 inline-block px-6 py-2 bg-matcha-600 text-white rounded-xl">
            创建虚拟IP
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {ips.map((ip) => (
            <button
              key={ip.id}
              onClick={() => onSelect(ip)}
              className={`
                relative rounded-2xl overflow-hidden transition-all duration-300
                ${selectedIp?.id === ip.id ? 'ring-4 ring-matcha-600 scale-105' : 'hover:scale-105 hover:shadow-lg'}
              `}
            >
              <div className="aspect-[3/4] bg-oat-light">
                {ip.avatarUrl ? (
                  <Image src={ip.avatarUrl} alt={ip.nickname} fill className="object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-4xl">👤</div>
                )}
              </div>
              <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
                <span className="text-white font-medium text-sm">{ip.nickname}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Step 2: Model Image
function ModelImageStep({
  product,
  selectedIp,
  mode,
  onModeChange,
  existingImages,
  selectedProductImage,
  onProductImageSelect,
  modelImageUrl,
  onSelectExisting,
  loading,
  onGenerate,
  canGenerate,
}: {
  product: Product
  selectedIp: VirtualIP | null
  mode: 'select' | 'generate'
  onModeChange: (mode: 'select' | 'generate') => void
  existingImages: string[]
  selectedProductImage: ProductImage | null
  onProductImageSelect: (img: ProductImage) => void
  modelImageUrl: string | null
  onSelectExisting: (url: string) => void
  loading: boolean
  onGenerate: () => void
  canGenerate: boolean
}) {
  return (
    <div className="space-y-6">
      {/* Row 1: IP Full Body */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-warm-silver w-20">虚拟IP</span>
        <div className="flex flex-wrap gap-3">
          <div className={`
            relative w-28 h-40 rounded-xl overflow-hidden transition-all duration-300
            ${selectedIp?.fullBodyUrl ? 'ring-4 ring-violet-500' : 'bg-oat-light'}
          `}>
            {selectedIp?.fullBodyUrl ? (
              <>
                <Image src={selectedIp.fullBodyUrl} alt={selectedIp.nickname} fill className="object-cover" />
                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                  <span className="text-white text-xs font-medium">{selectedIp.nickname}</span>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-warm-silver text-xs">
                选择IP后显示
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Product Images */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-warm-silver w-20">产品图</span>
        <div className="flex flex-wrap gap-3">
          {product.images.map((img) => (
            <button
              key={img.id}
              onClick={() => onProductImageSelect(img)}
              className={`
                relative w-28 h-40 rounded-xl overflow-hidden transition-all duration-300
                ${selectedProductImage?.id === img.id ? 'ring-4 ring-matcha-600' : 'hover:ring-2 ring-oat'}
              `}
            >
              <Image src={img.url} alt="产品图" fill className="object-cover" />
              {img.isMain && (
                <span className="absolute top-2 left-2 px-2 py-0.5 bg-matcha-600 text-white text-xs rounded-full">
                  主图
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Row 3: Existing Model Images */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-warm-silver w-20">已有模特图</span>
        <div className="flex flex-wrap gap-3">
          {existingImages.length === 0 ? (
            <div className="px-4 py-3 text-sm text-warm-silver bg-oat-light/50 rounded-xl">
              暂无
            </div>
          ) : (
            existingImages.map((url, i) => (
              <button
                key={i}
                onClick={() => {
                  onSelectExisting(url)
                  onModeChange('select')
                }}
                className={`
                  relative w-28 h-40 rounded-xl overflow-hidden transition-all duration-300
                  ${modelImageUrl === url ? 'ring-4 ring-matcha-600' : 'hover:ring-2 ring-oat'}
                `}
              >
                <Image src={url} alt={`已有模特图 ${i + 1}`} fill className="object-cover" />
              </button>
            ))
          )}
        </div>
      </div>

      {/* Row 3: Generate Button */}
      <div className="flex justify-center gap-3 pt-4 border-t border-oat">
        <label className="px-6 py-3 rounded-xl bg-white border border-oat text-warm-charcoal font-medium hover:bg-oat-light cursor-pointer flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          上传模特图
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (file) {
                const formData = new FormData()
                formData.append('file', file)
                const res = await fetch('/api/upload', { method: 'POST', body: formData })
                if (res.ok) {
                  const data = await res.json()
                  onSelectExisting(data.url)
                }
              }
            }}
          />
        </label>
        <button
          onClick={onGenerate}
          disabled={!canGenerate || loading}
          className="px-8 py-3 rounded-xl bg-matcha-600 text-white font-medium hover:bg-matcha-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              生成中...
            </>
          ) : (
            '生成模特图'
          )}
        </button>
      </div>

      {/* Result Preview */}
      {modelImageUrl && (
        <div className="max-w-sm mx-auto pt-4 border-t border-oat">
          <h3 className="font-medium text-warm-charcoal text-center mb-3">
            {mode === 'select' ? '已选模特图' : '生成的模特图'}
          </h3>
          <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-oat-light">
            <Image src={modelImageUrl} alt="模特图" fill className="object-cover" />
          </div>
        </div>
      )}
    </div>
  )
}

// Step 3: Style Image (定妆图)
function StyleImageStep({
  poses,
  makeups,
  accessories,
  selectedPose,
  selectedMakeup,
  selectedAccessory,
  onPoseSelect,
  onMakeupSelect,
  onAccessorySelect,
  styledImageUrl,
  loading,
  onGenerate,
  canGenerate,
}: {
  poses: Material[]
  makeups: Material[]
  accessories: Material[]
  selectedPose: Material | null
  selectedMakeup: Material | null
  selectedAccessory: Material | null
  onPoseSelect: (m: Material | null) => void
  onMakeupSelect: (m: Material | null) => void
  onAccessorySelect: (m: Material | null) => void
  styledImageUrl: string | null
  loading: boolean
  onGenerate: () => void
  canGenerate: boolean
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-warm-charcoal">生成定妆图</h2>
        <p className="text-warm-silver mt-1">选择姿势、妆容和饰品（姿势必选）</p>
      </div>

      {/* Pose Selection */}
      <div className="space-y-3">
        <h3 className="font-medium text-warm-charcoal">姿势 <span className="text-red-500">*</span></h3>
        <div className="grid grid-cols-4 gap-3">
          {poses.map((pose) => (
            <button
              key={pose.id}
              onClick={() => onPoseSelect(selectedPose?.id === pose.id ? null : pose)}
              className={`
                relative aspect-square rounded-xl overflow-hidden transition-all duration-300
                ${selectedPose?.id === pose.id ? 'ring-4 ring-matcha-600' : 'hover:scale-105'}
              `}
            >
              <Image src={pose.url} alt={pose.name} fill className="object-cover" />
            </button>
          ))}
        </div>
      </div>

      {/* Makeup Selection */}
      <div className="space-y-3">
        <h3 className="font-medium text-warm-charcoal">妆容（可选）</h3>
        <div className="grid grid-cols-4 gap-3">
          {makeups.map((makeup) => (
            <button
              key={makeup.id}
              onClick={() => onMakeupSelect(selectedMakeup?.id === makeup.id ? null : makeup)}
              className={`
                relative aspect-square rounded-xl overflow-hidden transition-all duration-300
                ${selectedMakeup?.id === makeup.id ? 'ring-4 ring-pink-600' : 'hover:scale-105'}
              `}
            >
              <Image src={makeup.url} alt={makeup.name} fill className="object-cover" />
            </button>
          ))}
        </div>
      </div>

      {/* Accessory Selection */}
      <div className="space-y-3">
        <h3 className="font-medium text-warm-charcoal">饰品（可选）</h3>
        <div className="grid grid-cols-4 gap-3">
          {accessories.map((acc) => (
            <button
              key={acc.id}
              onClick={() => onAccessorySelect(selectedAccessory?.id === acc.id ? null : acc)}
              className={`
                relative aspect-square rounded-xl overflow-hidden transition-all duration-300
                ${selectedAccessory?.id === acc.id ? 'ring-4 ring-violet-600' : 'hover:scale-105'}
              `}
            >
              <Image src={acc.url} alt={acc.name} fill className="object-cover" />
            </button>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <div className="flex justify-center">
        <button
          onClick={onGenerate}
          disabled={!canGenerate || loading}
          className="px-8 py-3 rounded-xl bg-matcha-600 text-white font-medium hover:bg-matcha-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '生成中...' : '生成定妆图'}
        </button>
      </div>

      {/* Result Preview */}
      {styledImageUrl && (
        <div className="max-w-sm mx-auto">
          <h3 className="font-medium text-warm-charcoal text-center mb-3">生成的定妆图</h3>
          <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-oat-light">
            <Image src={styledImageUrl} alt="定妆图" fill className="object-cover" />
          </div>
        </div>
      )}
    </div>
  )
}

// Step 4: First Frame
function FirstFrameStep({
  scenes,
  selectedScene,
  onSceneSelect,
  composition,
  onCompositionChange,
  firstFrameUrl,
  loading,
  onGenerate,
  canGenerate,
}: {
  scenes: Material[]
  selectedScene: Material | null
  onSceneSelect: (m: Material) => void
  composition: string
  onCompositionChange: (text: string) => void
  firstFrameUrl: string | null
  loading: boolean
  onGenerate: () => void
  canGenerate: boolean
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-warm-charcoal">生成首帧图</h2>
        <p className="text-warm-silver mt-1">选择场景并描述构图</p>
      </div>

      {/* Scene Selection */}
      <div className="space-y-3">
        <h3 className="font-medium text-warm-charcoal">场景</h3>
        <div className="grid grid-cols-4 gap-3">
          {scenes.map((scene) => (
            <button
              key={scene.id}
              onClick={() => onSceneSelect(scene)}
              className={`
                relative aspect-video rounded-xl overflow-hidden transition-all duration-300
                ${selectedScene?.id === scene.id ? 'ring-4 ring-matcha-600' : 'hover:scale-105'}
              `}
            >
              <Image src={scene.url} alt={scene.name} fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <span className="absolute bottom-2 left-2 text-white text-sm font-medium">{scene.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Composition Text */}
      <div className="space-y-3">
        <h3 className="font-medium text-warm-charcoal">构图描述</h3>
        <textarea
          value={composition}
          onChange={(e) => onCompositionChange(e.target.value)}
          placeholder="描述人物在画面中的位置和构图，例如：人物居中，面向镜头..."
          className="w-full h-24 px-4 py-3 rounded-xl bg-white border border-oat focus:border-matcha-600 focus:ring-2 focus:ring-matcha-600/20 outline-none resize-none"
        />
      </div>

      {/* Generate Button */}
      <div className="flex justify-center">
        <button
          onClick={onGenerate}
          disabled={!canGenerate || loading}
          className="px-8 py-3 rounded-xl bg-matcha-600 text-white font-medium hover:bg-matcha-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '生成中...' : '生成首帧图'}
        </button>
      </div>

      {/* Result Preview */}
      {firstFrameUrl && (
        <div className="max-w-sm mx-auto">
          <h3 className="font-medium text-warm-charcoal text-center mb-3">生成的首帧图</h3>
          <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-oat-light">
            <Image src={firstFrameUrl} alt="首帧图" fill className="object-cover" />
          </div>
        </div>
      )}
    </div>
  )
}

// Step 5: Video
function VideoStep({
  movements,
  selectedMovement,
  onMovementSelect,
  videoUrl,
  loading,
  progress,
  onGenerate,
  canGenerate,
}: {
  movements: Movement[]
  selectedMovement: Movement | null
  onMovementSelect: (m: Movement) => void
  videoUrl: string | null
  loading: boolean
  progress: number
  onGenerate: () => void
  canGenerate: boolean
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-warm-charcoal">生成视频</h2>
        <p className="text-warm-silver mt-1">选择动作生成视频</p>
      </div>

      {/* Movement Selection */}
      <div className="space-y-3">
        <h3 className="font-medium text-warm-charcoal">动作</h3>
        <div className="grid grid-cols-2 gap-3">
          {movements.map((movement) => (
            <button
              key={movement.id}
              onClick={() => onMovementSelect(movement)}
              className={`
                p-4 rounded-xl border-2 text-left transition-all duration-300
                ${selectedMovement?.id === movement.id
                  ? 'border-matcha-600 bg-matcha-50'
                  : 'border-oat hover:border-matcha-300'
                }
              `}
            >
              <span className="font-medium text-warm-charcoal">{movement.content}</span>
              {movement.clothing && (
                <span className="block text-sm text-warm-silver mt-1">适用: {movement.clothing}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <div className="flex justify-center">
        <button
          onClick={onGenerate}
          disabled={!canGenerate || loading}
          className="px-8 py-3 rounded-xl bg-matcha-600 text-white font-medium hover:bg-matcha-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? `生成中... ${Math.round(progress)}%` : '生成视频'}
        </button>
      </div>

      {/* Result Preview */}
      {videoUrl && (
        <div className="max-w-2xl mx-auto">
          <h3 className="font-medium text-warm-charcoal text-center mb-3">生成的视频</h3>
          <video src={videoUrl} controls className="w-full rounded-xl" />
        </div>
      )}
    </div>
  )
}
