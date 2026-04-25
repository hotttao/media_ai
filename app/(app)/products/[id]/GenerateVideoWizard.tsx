'use client'

import { useState, useEffect, useMemo } from 'react'
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

interface SceneAssociation {
  materialId: string
}

interface Movement {
  id: string
  content: string
  url: string | null
  clothing?: string | null
}

interface GeneratedImage {
  id: string
  url: string
}

interface StyleImage extends GeneratedImage {
  modelImageId: string
}

interface FirstFrameImage extends GeneratedImage {
  styleImageId: string | null
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
  const [existingModelImages, setExistingModelImages] = useState<GeneratedImage[]>([])
  const [selectedProductImage, setSelectedProductImage] = useState<ProductImage | null>(null)
  const [modelImageUrl, setModelImageUrl] = useState<string | null>(null)
  const [modelImageId, setModelImageId] = useState<string | null>(null)
  const [modelImageLoading, setModelImageLoading] = useState(false)
  const [savedModelImageUrl, setSavedModelImageUrl] = useState<string | null>(null)

  // Step 3: Style Image
  const [poses, setPoses] = useState<Material[]>([])
  const [makeups, setMakeups] = useState<Material[]>([])
  const [accessories, setAccessories] = useState<Material[]>([])
  const [selectedPose, setSelectedPose] = useState<Material | null>(null)
  const [selectedMakeup, setSelectedMakeup] = useState<Material | null>(null)
  const [selectedAccessory, setSelectedAccessory] = useState<Material | null>(null)
  const [styledImageUrl, setStyledImageUrl] = useState<string | null>(null)
  const [styledImageId, setStyledImageId] = useState<string | null>(null)
  const [styledImageMode, setStyledImageMode] = useState<'select' | 'generate'>('generate')
  const [existingStyleImages, setExistingStyleImages] = useState<StyleImage[]>([])
  const [styleImageLoading, setStyleImageLoading] = useState(false)
  const [savedStyledImageUrl, setSavedStyledImageUrl] = useState<string | null>(null)

  // Step 4: First Frame
  const [scenes, setScenes] = useState<Material[]>([])
  const [productScenes, setProductScenes] = useState<SceneAssociation[]>([])
  const [ipScenes, setIpScenes] = useState<SceneAssociation[]>([])
  const [selectedScene, setSelectedScene] = useState<Material | null>(null)
  const [composition, setComposition] = useState('')
  const [firstFrameUrl, setFirstFrameUrl] = useState<string | null>(null)
  const [firstFrameId, setFirstFrameId] = useState<string | null>(null)
  const [existingFirstFrames, setExistingFirstFrames] = useState<FirstFrameImage[]>([])
  const [firstFrameLoading, setFirstFrameLoading] = useState(false)
  const [savedFirstFrameUrl, setSavedFirstFrameUrl] = useState<string | null>(null)

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
        fetch(`/api/products/${product.id}/scenes`).then(r => r.json()),
      ]).then(([posesData, makeupsData, accessoriesData, scenesData, movementsData, productScenesData]) => {
        setPoses(posesData)
        setMakeups(makeupsData)
        setAccessories(accessoriesData)
        setScenes(scenesData)
        setMovements(movementsData)
        setProductScenes(Array.isArray(productScenesData) ? productScenesData : [])
      })
    }
  }, [currentStep, product.id])

  useEffect(() => {
    if (!selectedIp) {
      setIpScenes([])
      return
    }

    fetch(`/api/ips/${selectedIp.id}/scenes`)
      .then(res => res.json())
      .then(data => setIpScenes(Array.isArray(data) ? data : []))
      .catch(() => setIpScenes([]))
  }, [selectedIp])

  const filteredScenes = useMemo(() => {
    let nextScenes = scenes

    const productSceneIds = new Set(productScenes.map(scene => scene.materialId))
    if (productSceneIds.size > 0) {
      nextScenes = nextScenes.filter(scene => productSceneIds.has(scene.id))
    }

    const ipSceneIds = new Set(ipScenes.map(scene => scene.materialId))
    if (ipSceneIds.size > 0) {
      nextScenes = nextScenes.filter(scene => ipSceneIds.has(scene.id))
    }

    return nextScenes
  }, [ipScenes, productScenes, scenes])

  useEffect(() => {
    if (selectedScene && !filteredScenes.some(scene => scene.id === selectedScene.id)) {
      setSelectedScene(null)
    }
  }, [filteredScenes, selectedScene])

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
      fetch(`/api/products/${product.id}/model-images?ipId=${selectedIp.id}`)
        .then(res => res.json())
        .then((data: any[]) => {
          const images = data
            .filter(d => d.id && d.url)
            .map(d => ({ id: d.id, url: d.url }))
          setExistingModelImages(images)
        })
    }
  }, [currentStep, selectedIp, product.id])

  // Fetch existing style images when entering step 2
  useEffect(() => {
    if (currentStep === 2 && selectedIp && modelImageId) {
      fetch(`/api/products/${product.id}/style-images?ipId=${selectedIp.id}&modelImageId=${modelImageId}`)
        .then(res => res.json())
        .then((data: any[]) => {
          const images = data
            .filter((image: any) => image.id && image.url)
            .map((image: any) => ({
              id: image.id,
              url: image.url,
              modelImageId: image.modelImageId,
            }))
          setExistingStyleImages(images)
        })
    } else if (currentStep === 2) {
      setExistingStyleImages([])
    }
  }, [currentStep, selectedIp, modelImageId, product.id])

  // Fetch existing first frames when entering step 3
  useEffect(() => {
    if (currentStep === 3 && selectedIp && styledImageId) {
      fetch(`/api/products/${product.id}/first-frames?ipId=${selectedIp.id}&styleImageId=${styledImageId}`)
        .then(res => res.json())
        .then((data: any[]) => {
          const images = data
            .filter((image: any) => image.id && image.url)
            .map((image: any) => ({
              id: image.id,
              url: image.url,
              styleImageId: image.styleImageId,
            }))
          setExistingFirstFrames(images)
        })
    } else if (currentStep === 3) {
      setExistingFirstFrames([])
    }
  }, [currentStep, selectedIp, styledImageId, product.id])

  const goNext = async () => {
    // Step 1: 如果有新的模特图（上传或生成），保存到 ModelImage 表
    if (currentStep === 1 && modelImageUrl && modelImageUrl !== savedModelImageUrl) {
      try {
        // 如果还没有保存过（上传时已保存的情况会跳过）
        if (!modelImageId) {
          const res = await fetch(`/api/products/${product.id}/model-image/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ipId: selectedIp?.id,
              imageUrl: modelImageUrl,
            }),
          })
          if (res.ok) {
            const data = await res.json()
            setModelImageId(data.modelImageId)
          }
        }
        setSavedModelImageUrl(modelImageUrl)
      } catch (err) {
        console.error('Failed to save model image:', err)
      }
    }
    // Step 2: 保存定妆图
    if (currentStep === 2 && styledImageUrl && styledImageUrl !== savedStyledImageUrl && modelImageId) {
      try {
        if (!styledImageId) {
          const res = await fetch(`/api/products/${product.id}/style-image/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              modelImageId: modelImageId,
              poseId: selectedPose?.id,
              makeupId: selectedMakeup?.id,
              accessoryId: selectedAccessory?.id,
              imageUrl: styledImageUrl,
            }),
          })
          if (res.ok) {
            const data = await res.json()
            setStyledImageId(data.styleImageId)
          }
        }
        setSavedStyledImageUrl(styledImageUrl)
      } catch (err) {
        console.error('Failed to save styled image:', err)
      }
    }
    // Step 3: 保存首帧图
    if (currentStep === 3 && firstFrameUrl && firstFrameUrl !== savedFirstFrameUrl && styledImageId) {
      try {
        if (!firstFrameId) {
          const res = await fetch(`/api/products/${product.id}/first-frame`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              styleImageId: styledImageId,
              sceneId: selectedScene?.id,
              composition: composition,
              imageUrl: firstFrameUrl,
            }),
          })
          if (res.ok) {
            const data = await res.json()
            setFirstFrameId(data.firstFrameId)
          }
        }
        setSavedFirstFrameUrl(firstFrameUrl)
      } catch (err) {
        console.error('Failed to save first frame:', err)
      }
    }
    setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1))
  }
  const goBack = () => setCurrentStep(prev => Math.max(prev - 1, 0))

  const canProceed = () => {
    switch (currentStep) {
      case 0: return !!selectedIp
      case 1: return !!modelImageUrl
      case 2: return !!styledImageUrl && (!!styledImageId || (!!selectedPose && !!modelImageId))
      case 3: return !!firstFrameUrl && (!!firstFrameId || (!!selectedScene && !!composition && !!styledImageId))
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
                onSelectExisting={(image) => {
                  setModelImageUrl(image.url)
                  setModelImageId(image.id)
                  setStyledImageUrl(null)
                  setStyledImageId(null)
                  setFirstFrameUrl(null)
                  setFirstFrameId(null)
                }}
                onSelectModelImageId={setModelImageId}
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
                      setModelImageId(data.modelImageId)
                      setStyledImageUrl(null)
                      setStyledImageId(null)
                      setFirstFrameUrl(null)
                      setFirstFrameId(null)
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
                productId={product.id}
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
                styledImageMode={styledImageMode}
                existingImages={existingStyleImages}
                onModeChange={setStyledImageMode}
                onSelectExisting={(image) => {
                  setStyledImageUrl(image.url)
                  setStyledImageId(image.id)
                  setFirstFrameUrl(null)
                  setFirstFrameId(null)
                }}
                onSelectStyleImageId={setStyledImageId}
                modelImageUrl={modelImageUrl}
                modelImageId={modelImageId}
                loading={styleImageLoading}
                onGenerate={async () => {
                  if (!modelImageId || !selectedPose) return
                  setStyleImageLoading(true)
                  setError(null)
                  try {
                    const res = await fetch(`/api/products/${product.id}/style-image`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        modelImageId,
                        pose: selectedPose.url,
                        makeupUrl: selectedMakeup?.url,
                        accessoryUrl: selectedAccessory?.url,
                      }),
                    })
                    if (res.ok) {
                      const data = await res.json()
                      setStyledImageUrl(data.styledImageUrl)
                      setStyledImageId(data.styleImageId)
                      setFirstFrameUrl(null)
                      setFirstFrameId(null)
                    } else {
                      setError('生成失败')
                    }
                  } catch {
                    setError('生成失败')
                  } finally {
                    setStyleImageLoading(false)
                  }
                }}
                canGenerate={!!selectedPose && !!modelImageId}
              />
            )}

            {currentStep === 3 && (
              <FirstFrameStep
                productId={product.id}
                scenes={filteredScenes}
                selectedScene={selectedScene}
                onSceneSelect={setSelectedScene}
                composition={composition}
                onCompositionChange={setComposition}
                firstFrameUrl={firstFrameUrl}
                styledImageUrl={styledImageUrl}
                styledImageId={styledImageId}
                existingImages={existingFirstFrames}
                onSelectExisting={setFirstFrameUrl}
                onSelectFirstFrameId={setFirstFrameId}
                loading={firstFrameLoading}
                onGenerate={async () => {
                  if (!selectedIp?.id || !selectedScene?.id || !composition || !styledImageUrl) {
                    return
                  }

                  setFirstFrameLoading(true)
                  setError(null)
                  try {
                    const res = await fetch(`/api/products/${product.id}/generate-video`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        step: 'first-frame',
                        ipId: selectedIp.id,
                        styleImageId: styledImageId || undefined,
                        sceneId: selectedScene.id,
                        composition,
                        imageUrl: styledImageUrl,
                      }),
                    })

                    if (!res.ok) {
                      const data = await res.json().catch(() => null)
                      setError(data?.error || '生成首帧图失败')
                      return
                    }

                    const data = await res.json()
                    setFirstFrameUrl(data.firstFrameUrl)
                    setFirstFrameId(data.firstFrameId)
                  } catch {
                    setError('生成首帧图失败')
                  } finally {
                    setFirstFrameLoading(false)
                  }
                }}
                canGenerate={!!selectedScene && !!composition && !!styledImageId}
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
              <div className="aspect-[9/16] bg-oat-light">
                {ip.avatarUrl ? (
                  <Image src={ip.avatarUrl} alt={ip.nickname} fill className="object-contain" />
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
  onSelectModelImageId,
  loading,
  onGenerate,
  canGenerate,
}: {
  product: Product
  selectedIp: VirtualIP | null
  mode: 'select' | 'generate'
  onModeChange: (mode: 'select' | 'generate') => void
  existingImages: GeneratedImage[]
  selectedProductImage: ProductImage | null
  onProductImageSelect: (img: ProductImage) => void
  modelImageUrl: string | null
  onSelectExisting: (image: GeneratedImage) => void
  onSelectModelImageId: (id: string) => void
  loading: boolean
  onGenerate: () => void
  canGenerate: boolean
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      {/* Row 1: IP Full Body */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-warm-silver w-20">虚拟IP</span>
        <div className="flex flex-wrap gap-3">
          <div className={`
            relative w-20 aspect-[9/16] rounded-xl overflow-hidden transition-all duration-300 cursor-pointer
            ${selectedIp?.fullBodyUrl ? 'ring-4 ring-violet-500' : 'bg-oat-light'}
          `}>
            {selectedIp?.fullBodyUrl ? (
              <>
                <Image
                  src={selectedIp.fullBodyUrl}
                  alt={selectedIp.nickname}
                  fill
                  className="object-contain"
                  onDoubleClick={() => setPreviewUrl(selectedIp.fullBodyUrl)}
                />
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
                relative w-20 aspect-[9/16] rounded-xl overflow-hidden transition-all duration-300
                ${selectedProductImage?.id === img.id ? 'ring-4 ring-matcha-600' : 'hover:ring-2 ring-oat'}
              `}
            >
              <Image
                src={img.url}
                alt="产品图"
                fill
                className="object-contain"
                onDoubleClick={() => setPreviewUrl(img.url)}
              />
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
            existingImages.map((image, i) => (
              <button
                key={image.id}
                onClick={() => {
                  onSelectExisting(image)
                  onModeChange('select')
                }}
                className={`
                  relative w-20 aspect-[9/16] rounded-xl overflow-hidden transition-all duration-300
                  ${modelImageUrl === image.url ? 'ring-4 ring-matcha-600' : 'hover:ring-2 ring-oat'}
                `}
              >
                <Image
                  src={image.url}
                  alt={`已有模特图 ${i + 1}`}
                  fill
                  className="object-contain"
                  onDoubleClick={() => setPreviewUrl(image.url)}
                />
              </button>
            ))
          )}
        </div>
      </div>

      {/* Result Preview */}
      {modelImageUrl && (
        <div className="flex items-start gap-3">
          <span className="text-sm text-warm-silver w-20 pt-3">生成结果</span>
          <div
            className="relative w-20 aspect-[9/16] rounded-xl overflow-hidden bg-oat-light cursor-pointer"
            onDoubleClick={() => setPreviewUrl(modelImageUrl)}
          >
            <Image src={modelImageUrl} alt="模特图" fill className="object-contain" />
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="relative max-w-full max-h-full">
            <Image
              src={previewUrl}
              alt="预览"
              width={800}
              height={1000}
              className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-2xl"
            />
            <button
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              onClick={() => setPreviewUrl(null)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

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
                  // 保存到 ModelImage 表
                  const saveRes = await fetch(`/api/products/${product.id}/model-image/save`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      ipId: selectedIp?.id,
                      imageUrl: data.url,
                    }),
                  })
                  if (saveRes.ok) {
                    const saveData = await saveRes.json()
                    onSelectExisting({ id: saveData.modelImageId, url: data.url })
                    onSelectModelImageId(saveData.modelImageId)
                  }
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
    </div>
  )
}

// Step 3: Style Image (定妆图)
function StyleImageStep({
  productId,
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
  styledImageMode,
  existingImages,
  onModeChange,
  onSelectExisting,
  onSelectStyleImageId,
  modelImageUrl,
  modelImageId,
  loading,
  onGenerate,
  canGenerate,
}: {
  productId: string
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
  styledImageMode: 'select' | 'generate'
  existingImages: GeneratedImage[]
  onModeChange: (mode: 'select' | 'generate') => void
  onSelectExisting: (image: GeneratedImage) => void
  onSelectStyleImageId: (id: string) => void
  modelImageUrl: string | null
  modelImageId: string | null
  loading: boolean
  onGenerate: () => void
  canGenerate: boolean
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-warm-charcoal">生成定妆图</h2>
        <p className="text-warm-silver mt-1">选择姿势、妆容和饰品（姿势必选）</p>
      </div>

      {/* Model Image Reference */}
      {modelImageUrl && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-warm-silver w-20">模特图</span>
          <div
            className="relative w-20 aspect-[9/16] rounded-xl overflow-hidden bg-oat-light cursor-pointer"
            onDoubleClick={() => setPreviewUrl(modelImageUrl)}
          >
            <Image src={modelImageUrl} alt="模特图" fill className="object-contain" />
          </div>
        </div>
      )}

      {/* Existing Style Images */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-warm-silver w-20">已有定妆图</span>
        <div className="flex flex-wrap gap-3">
          {existingImages.length === 0 ? (
            <div className="px-4 py-3 text-sm text-warm-silver bg-oat-light/50 rounded-xl">
              暂无
            </div>
          ) : (
            existingImages.map((image, i) => (
              <button
                key={image.id}
                onClick={() => {
                  onSelectExisting(image)
                  onModeChange('select')
                }}
                className={`
                  relative w-20 aspect-[9/16] rounded-xl overflow-hidden transition-all duration-300
                  ${styledImageUrl === image.url ? 'ring-4 ring-matcha-600' : 'hover:ring-2 ring-oat'}
                `}
              >
                <Image
                  src={image.url}
                  alt={`已有定妆图 ${i + 1}`}
                  fill
                  className="object-contain"
                  onDoubleClick={() => setPreviewUrl(image.url)}
                />
              </button>
            ))
          )}
        </div>
      </div>

      {/* Pose Selection */}
      <div className="flex items-start gap-3">
        <span className="text-sm text-warm-silver w-20 pt-3">姿势 <span className="text-red-500">*</span></span>
        <div className="flex flex-wrap gap-3">
          {poses.map((pose) => (
            <button
              key={pose.id}
              onClick={() => onPoseSelect(selectedPose?.id === pose.id ? null : pose)}
              className={`
                relative w-16 aspect-[9/16] rounded-xl overflow-hidden transition-all duration-300
                ${selectedPose?.id === pose.id ? 'ring-4 ring-matcha-600' : 'hover:ring-2 ring-oat'}
              `}
            >
              <Image src={pose.url} alt={pose.name} fill className="object-contain" />
            </button>
          ))}
        </div>
      </div>

      {/* Makeup Selection */}
      <div className="flex items-start gap-3">
        <span className="text-sm text-warm-silver w-20 pt-3">妆容</span>
        <div className="flex flex-wrap gap-3">
          {makeups.map((makeup) => (
            <button
              key={makeup.id}
              onClick={() => onMakeupSelect(selectedMakeup?.id === makeup.id ? null : makeup)}
              className={`
                relative w-16 aspect-[9/16] rounded-xl overflow-hidden transition-all duration-300
                ${selectedMakeup?.id === makeup.id ? 'ring-4 ring-pink-600' : 'hover:ring-2 ring-oat'}
              `}
            >
              <Image src={makeup.url} alt={makeup.name} fill className="object-contain" />
            </button>
          ))}
        </div>
      </div>

      {/* Accessory Selection */}
      <div className="flex items-start gap-3">
        <span className="text-sm text-warm-silver w-20 pt-3">饰品</span>
        <div className="flex flex-wrap gap-3">
          {accessories.map((acc) => (
            <button
              key={acc.id}
              onClick={() => onAccessorySelect(selectedAccessory?.id === acc.id ? null : acc)}
              className={`
                relative w-16 aspect-[9/16] rounded-xl overflow-hidden transition-all duration-300
                ${selectedAccessory?.id === acc.id ? 'ring-4 ring-violet-600' : 'hover:ring-2 ring-oat'}
              `}
            >
              <Image src={acc.url} alt={acc.name} fill className="object-contain" />
            </button>
          ))}
        </div>
      </div>

      {/* Result Preview */}
      {styledImageUrl && (
        <div className="flex items-start gap-3">
          <span className="text-sm text-warm-silver w-20 pt-3">生成结果</span>
          <div
            className="relative w-20 aspect-[9/16] rounded-xl overflow-hidden bg-oat-light cursor-pointer"
            onDoubleClick={() => setPreviewUrl(styledImageUrl)}
          >
            <Image src={styledImageUrl} alt="定妆图" fill className="object-contain" />
          </div>
        </div>
      )}

      {/* Generate Button */}
      <div className="flex justify-center gap-3 pt-4 border-t border-oat">
        <label className="px-6 py-3 rounded-xl bg-white border border-oat text-warm-charcoal font-medium hover:bg-oat-light cursor-pointer flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          上传定妆图
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
                  // 保存到 StyleImage 表
                  if (modelImageId) {
                    const saveRes = await fetch(`/api/products/${productId}/style-image/save`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        modelImageId: modelImageId,
                        poseId: selectedPose?.id,
                        makeupId: selectedMakeup?.id,
                        accessoryId: selectedAccessory?.id,
                        imageUrl: data.url,
                      }),
                    })
                    if (saveRes.ok) {
                      const saveData = await saveRes.json()
                      onSelectExisting({ id: saveData.styleImageId, url: data.url })
                      onSelectStyleImageId(saveData.styleImageId)
                    }
                  } else {
                    onSelectExisting({ id: data.url, url: data.url })
                  }
                  onModeChange('select')
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
            '生成定妆图'
          )}
        </button>
      </div>

      {/* Image Preview Modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="relative max-w-full max-h-full">
            <Image
              src={previewUrl}
              alt="预览"
              width={800}
              height={1000}
              className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-2xl"
            />
            <button
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              onClick={() => setPreviewUrl(null)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Step 4: First Frame
function FirstFrameStep({
  productId,
  scenes,
  selectedScene,
  onSceneSelect,
  composition,
  onCompositionChange,
  firstFrameUrl,
  styledImageUrl,
  styledImageId,
  existingImages,
  onSelectExisting,
  onSelectFirstFrameId,
  loading,
  onGenerate,
  canGenerate,
}: {
  productId: string
  scenes: Material[]
  selectedScene: Material | null
  onSceneSelect: (m: Material) => void
  composition: string
  onCompositionChange: (text: string) => void
  firstFrameUrl: string | null
  styledImageUrl: string | null
  styledImageId: string | null
  existingImages: GeneratedImage[]
  onSelectExisting: (url: string) => void
  onSelectFirstFrameId: (id: string) => void
  loading: boolean
  onGenerate: () => void
  canGenerate: boolean
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-warm-charcoal">生成首帧图</h2>
        <p className="text-warm-silver mt-1">选择场景并描述构图</p>
      </div>

      {/* Styled Image Reference */}
      {styledImageUrl && (
        <div className="flex items-start gap-3">
          <span className="text-sm text-warm-silver w-20 pt-3">定妆图</span>
          <div
            className="relative w-16 aspect-[9/16] rounded-xl overflow-hidden bg-oat-light cursor-pointer"
            onDoubleClick={() => setPreviewUrl(styledImageUrl)}
          >
            <Image src={styledImageUrl} alt="定妆图" fill className="object-contain" />
          </div>
        </div>
      )}

      {/* Existing First Frames */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-warm-silver w-20">已有首帧图</span>
        <div className="flex flex-wrap gap-3">
          {existingImages.length === 0 ? (
            <div className="px-4 py-3 text-sm text-warm-silver bg-oat-light/50 rounded-xl">
              暂无
            </div>
          ) : (
            existingImages.map((image, i) => (
              <button
                key={image.id}
                onClick={() => {
                  onSelectExisting(image.url)
                  onSelectFirstFrameId(image.id)
                }}
                className={`
                  relative w-20 aspect-[9/16] rounded-xl overflow-hidden transition-all duration-300
                  ${firstFrameUrl === image.url ? 'ring-4 ring-matcha-600' : 'hover:ring-2 ring-oat'}
                `}
              >
                <Image
                  src={image.url}
                  alt={`已有首帧图 ${i + 1}`}
                  fill
                  className="object-contain"
                  onDoubleClick={() => setPreviewUrl(image.url)}
                />
              </button>
            ))
          )}
        </div>
      </div>

      {/* Scene Selection */}
      <div className="flex items-start gap-3">
        <span className="text-sm text-warm-silver w-20 pt-3">场景</span>
        <div className="flex flex-wrap gap-3">
          {scenes.map((scene) => (
            <button
              key={scene.id}
              onClick={() => onSceneSelect(scene)}
              className={`
                relative w-16 aspect-[9/16] rounded-xl overflow-hidden transition-all duration-300
                ${selectedScene?.id === scene.id ? 'ring-4 ring-matcha-600' : 'hover:ring-2 ring-oat'}
              `}
            >
              <Image src={scene.url} alt={scene.name} fill className="object-contain" />
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

      {/* Result Preview */}
      {firstFrameUrl && (
        <div className="flex items-start gap-3">
          <span className="text-sm text-warm-silver w-20 pt-3">生成结果</span>
          <div
            className="relative w-16 aspect-[9/16] rounded-xl overflow-hidden bg-oat-light cursor-pointer"
            onDoubleClick={() => setPreviewUrl(firstFrameUrl)}
          >
            <Image src={firstFrameUrl} alt="首帧图" fill className="object-contain" />
          </div>
        </div>
      )}

      {/* Upload and Generate Button */}
      <div className="flex justify-center gap-3 pt-4 border-t border-oat">
        <label className="px-6 py-3 rounded-xl bg-white border border-oat text-warm-charcoal font-medium hover:bg-oat-light cursor-pointer flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          上传首帧图
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
                  // 保存到 FirstFrame 表
                  if (styledImageId) {
                    const saveRes = await fetch(`/api/products/${productId}/first-frame`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        styleImageId: styledImageId,
                        sceneId: selectedScene?.id,
                        composition: composition,
                        imageUrl: data.url,
                      }),
                    })
                    if (saveRes.ok) {
                      const saveData = await saveRes.json()
                      onSelectExisting(data.url)
                      onSelectFirstFrameId(saveData.firstFrameId)
                    }
                  } else {
                    onSelectExisting(data.url)
                  }
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
            '生成首帧图'
          )}
        </button>
      </div>

      {/* Image Preview Modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="relative max-w-full max-h-full">
            <Image
              src={previewUrl}
              alt="预览"
              width={800}
              height={1000}
              className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-2xl"
            />
            <button
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              onClick={() => setPreviewUrl(null)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
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
