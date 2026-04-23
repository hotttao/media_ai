'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'

// Types
interface VirtualIP {
  id: string
  name: string
  avatarUrl: string | null
  type: string
}

interface Material {
  id: string
  name: string
  thumbnailUrl: string
  url: string
}

interface Movement {
  id: string
  content: string
  url: string | null
  clothing: string | null
}

// Step configuration - PRD 4.2 5-step flow
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

// Selection summary component - shows previous step inputs
function SelectionSummary({
  selectedIp,
  modelImageUrl,
  styledImageUrl,
  firstFrameUrl,
}: {
  selectedIp: VirtualIP | null
  modelImageUrl: string | null
  styledImageUrl: string | null
  firstFrameUrl: string | null
}) {
  const hasAnySelection = selectedIp || modelImageUrl || styledImageUrl || firstFrameUrl
  if (!hasAnySelection) return null

  return (
    <div className="flex flex-wrap gap-3 justify-center text-sm">
      {selectedIp && (
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-matcha-100 text-matcha-700">
          <span>🎭</span> {selectedIp.name}
        </span>
      )}
      {modelImageUrl && (
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-100 text-violet-700">
          <span>👗</span> 模特图
        </span>
      )}
      {styledImageUrl && (
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-pink-100 text-pink-700">
          <span>💄</span> 定妆图
        </span>
      )}
      {firstFrameUrl && (
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700">
          <span>🖼️</span> 首帧图
        </span>
      )}
    </div>
  )
}

// Mode toggle component
function ModeToggle({
  mode,
  onModeChange,
  canToggle = true
}: {
  mode: 'select' | 'generate'
  onModeChange: (mode: 'select' | 'generate') => void
  canToggle?: boolean
}) {
  return (
    <div className="inline-flex gap-1 p-1 bg-oat-light/50 rounded-xl">
      <button
        onClick={() => onModeChange('select')}
        disabled={!canToggle}
        className={`
          px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300
          ${mode === 'select'
            ? 'bg-white text-warm-charcoal shadow-sm'
            : 'text-warm-silver hover:text-warm-charcoal disabled:opacity-50'
          }
        `}
      >
        选择已有
      </button>
      <button
        onClick={() => onModeChange('generate')}
        disabled={!canToggle}
        className={`
          px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300
          ${mode === 'generate'
            ? 'bg-white text-warm-charcoal shadow-sm'
            : 'text-warm-silver hover:text-warm-charcoal disabled:opacity-50'
          }
        `}
      >
        生成新的
      </button>
    </div>
  )
}

// Image grid selector
function ImageGridSelector({
  images,
  selectedImage,
  onSelect,
  columns = 4
}: {
  images: { id: string; url: string; name?: string }[]
  selectedImage: string | null
  onSelect: (url: string) => void
  columns?: number
}) {
  if (images.length === 0) {
    return (
      <div className="text-center py-12 text-warm-silver">
        <span className="text-4xl mb-3 block">📭</span>
        <p>暂无已有素材</p>
      </div>
    )
  }

  return (
    <div className={`grid grid-cols-${columns} gap-4`}>
      {images.map((img) => (
        <button
          key={img.id}
          onClick={() => onSelect(img.url)}
          className={`
            relative aspect-[3/4] rounded-xl overflow-hidden transition-all duration-300
            ${selectedImage === img.url
              ? 'ring-4 ring-matcha-600 shadow-xl scale-[1.02]'
              : 'hover:scale-[1.02] hover:shadow-lg'
            }
          `}
        >
          <Image src={img.url} alt={img.name || ''} fill className="object-cover" />
          {selectedImage === img.url && (
            <div className="absolute top-3 right-3 w-6 h-6 bg-matcha-600 rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
        </button>
      ))}
    </div>
  )
}

// GenerateVideoWizard Component
export function GenerateVideoWizard({ productId }: { productId: string }) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1: IP Selection
  const [ips, setIps] = useState<VirtualIP[]>([])
  const [selectedIp, setSelectedIp] = useState<VirtualIP | null>(null)

  // Step 2: Model Image
  const [existingModelImage, setExistingModelImage] = useState<string | null>(null)
  const [modelImageUrl, setModelImageUrl] = useState<string | null>(null)
  const [modelImageLoading, setModelImageLoading] = useState(false)
  const [modelImageMode, setModelImageMode] = useState<'select' | 'generate'>('generate')

  // Step 3: Style Image
  const [existingStyleImages, setExistingStyleImages] = useState<string[]>([])
  const [selectedPose, setSelectedPose] = useState<Material | null>(null)
  const [selectedMakeup, setSelectedMakeup] = useState<Material | null>(null)
  const [selectedAccessory, setSelectedAccessory] = useState<Material | null>(null)
  const [styledImageUrl, setStyledImageUrl] = useState<string | null>(null)
  const [styleImageLoading, setStyleImageLoading] = useState(false)
  const [styleImageMode, setStyleImageMode] = useState<'select' | 'generate'>('generate')

  // Step 4: First Frame
  const [existingFirstFrames, setExistingFirstFrames] = useState<string[]>([])
  const [selectedScene, setSelectedScene] = useState<Material | null>(null)
  const [compositionText, setCompositionText] = useState('')
  const [firstFrameUrl, setFirstFrameUrl] = useState<string | null>(null)
  const [firstFrameLoading, setFirstFrameLoading] = useState(false)
  const [firstFrameMode, setFirstFrameMode] = useState<'select' | 'generate'>('generate')

  // Step 5: Video
  const [movements, setMovements] = useState<Movement[]>([])
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoLoading, setVideoLoading] = useState(false)
  const [videoProgress, setVideoProgress] = useState(0)

  // Product Materials - stores the current product material ID for API calls
  const [currentProductMaterialId, setCurrentProductMaterialId] = useState<string | null>(null)

  // New ID state variables for API chaining
  const [currentModelImageId, setCurrentModelImageId] = useState<string | null>(null)
  const [currentStyleImageId, setCurrentStyleImageId] = useState<string | null>(null)
  const [currentFirstFrameId, setCurrentFirstFrameId] = useState<string | null>(null)

  // Material pools
  const [poses, setPoses] = useState<Material[]>([])
  const [makeups, setMakeups] = useState<Material[]>([])
  const [accessories, setAccessories] = useState<Material[]>([])
  const [scenes, setScenes] = useState<Material[]>([])

  // Fetch IPs and movements on mount
  useEffect(() => {
    fetchIPs()
    fetchMovements()
    fetchMaterials()
  }, [])

  // Fetch existing materials when IP or step changes
  useEffect(() => {
    if (selectedIp && productId && currentStep >= 1) {
      fetchExistingMaterials()
    }
  }, [selectedIp, productId, currentStep])

  // Keyboard shortcut to go home (Escape key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        router.push('/')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router])

  const fetchIPs = async () => {
    try {
      const res = await fetch('/api/ips')
      if (res.ok) {
        const data = await res.json()
        setIps(data.map((ip: any) => ({
          id: ip.id,
          name: ip.nickname || ip.name || '未命名',
          avatarUrl: ip.avatarUrl,
          type: ip.type || ip.occupation || '虚拟IP',
        })))
      }
    } catch (err) {
      console.error('Failed to fetch IPs:', err)
    }
  }

  const fetchMaterials = async () => {
    try {
      const [posesRes, makeupsRes, accessoriesRes, scenesRes] = await Promise.all([
        fetch('/api/materials?type=POSE'),
        fetch('/api/materials?type=MAKEUP'),
        fetch('/api/materials?type=ACCESSORY'),
        fetch('/api/materials?type=SCENE'),
      ])

      if (posesRes.ok) {
        const data = await posesRes.json()
        setPoses(data.map((m: any) => ({
          id: m.id,
          name: m.name,
          thumbnailUrl: m.url,
          url: m.url,
        })))
      }

      if (makeupsRes.ok) {
        const data = await makeupsRes.json()
        setMakeups(data.map((m: any) => ({
          id: m.id,
          name: m.name,
          thumbnailUrl: m.url,
          url: m.url,
        })))
      }

      if (accessoriesRes.ok) {
        const data = await accessoriesRes.json()
        setAccessories(data.map((m: any) => ({
          id: m.id,
          name: m.name,
          thumbnailUrl: m.url,
          url: m.url,
        })))
      }

      if (scenesRes.ok) {
        const data = await scenesRes.json()
        setScenes(data.map((m: any) => ({
          id: m.id,
          name: m.name,
          thumbnailUrl: m.url,
          url: m.url,
        })))
      }
    } catch (err) {
      console.error('Failed to fetch materials:', err)
    }
  }

  const fetchMovements = async () => {
    try {
      const res = await fetch('/api/movement-materials')
      if (res.ok) {
        const data = await res.json()
        setMovements(data.map((m: any) => ({
          id: m.id,
          content: m.content,
          url: m.url,
          clothing: m.clothing,
        })))
      }
    } catch (err) {
      console.error('Failed to fetch movements:', err)
    }
  }

  const fetchExistingMaterials = async () => {
    try {
      const res = await fetch(`/api/product-materials?productId=${productId}&ipId=${selectedIp?.id}`)
      if (res.ok) {
        const data = await res.json()
        // Model image - one per IP+product (fullBodyUrl)
        const modelImg = data.find((d: any) => d.fullBodyUrl)
        if (modelImg) {
          setExistingModelImage(modelImg.fullBodyUrl)
          setCurrentProductMaterialId(modelImg.id)
        }
        // Style images - multiple (using same fullBodyUrl field but different records)
        setExistingStyleImages(data.map((d: any) => d.fullBodyUrl).filter(Boolean))
        // First frames
        setExistingFirstFrames(data.map((d: any) => d.firstFrameUrl).filter(Boolean))
      }
    } catch (err) {
      console.error('Failed to fetch existing materials:', err)
    }
  }

  // Step 2: Model Image Generation
  const generateModelImage = async () => {
    if (!selectedIp || !productId) return

    setModelImageLoading(true)
    setError(null)

    try {
      // Get product main image and detail images from parent component's product data
      // Since we don't have direct access, we'll fetch from the product API
      const productRes = await fetch(`/api/products/${productId}`)
      if (!productRes.ok) throw new Error('Failed to fetch product')
      const product = await productRes.json()
      const mainImage = product.images?.find((img: any) => img.isMain) || product.images?.[0]
      const detailImages = product.images?.filter((img: any) => !img.isMain).map((img: any) => img.url) || []

      const res = await fetch(`/api/products/${productId}/model-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ipId: selectedIp.id,
          productMainImageUrl: mainImage?.url,
          productDetailImageUrls: detailImages,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setModelImageUrl(data.modelImageUrl)
        setCurrentModelImageId(data.modelImageId)
        setCurrentProductMaterialId(data.productMaterialId)
      } else {
        const errorText = await res.text()
        setError(`生成模特图失败: ${errorText || res.statusText}`)
      }
    } catch (err) {
      setError('生成模特图失败，请稍后重试')
    } finally {
      setModelImageLoading(false)
    }
  }

  // Step 3: Style Image Generation
  const generateStyleImage = async () => {
    if (!selectedPose || !currentModelImageId) return

    setStyleImageLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/products/${productId}/style-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelImageId: currentModelImageId,
          pose: selectedPose.name || selectedPose.id, // pose is text description or material ID
          makeupUrl: selectedMakeup?.url,
          accessoryUrl: selectedAccessory?.url,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setStyledImageUrl(data.styledImageUrl)
        setCurrentStyleImageId(data.styleImageId)
      } else {
        const errorText = await res.text()
        setError(`生成定妆图失败: ${errorText || res.statusText}`)
      }
    } catch (err) {
      setError('生成定妆图失败，请稍后重试')
    } finally {
      setStyleImageLoading(false)
    }
  }

  // Step 4: First Frame Generation
  const generateFirstFrame = async () => {
    if (!selectedScene || !compositionText) return

    setFirstFrameLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/products/${productId}/generate-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'first-frame',
          ipId: selectedIp?.id,
          styleImageId: currentStyleImageId,
          sceneId: selectedScene.id,
          composition: compositionText,
          imageUrl: styledImageUrl,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setFirstFrameUrl(data.firstFrameUrl)
        setCurrentFirstFrameId(data.firstFrameId)
      } else {
        // Mock for demo
        setFirstFrameUrl(`https://picsum.photos/seed/firstframe/600/800`)
      }
    } catch (err) {
      // Mock for demo
      setFirstFrameUrl(`https://picsum.photos/seed/firstframe/600/800`)
    } finally {
      setFirstFrameLoading(false)
    }
  }

  // Step 5: Video Generation
  const generateVideo = async () => {
    if (!selectedMovement || !firstFrameUrl) return

    setVideoLoading(true)
    setVideoProgress(0)
    setError(null)

    // Simulate progress
    const progressInterval = setInterval(() => {
      setVideoProgress(prev => Math.min(prev + Math.random() * 15, 95))
    }, 1000)

    try {
      const res = await fetch(`/api/products/${productId}/generate-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ipId: selectedIp?.id,
          firstFrameUrl,
          movementId: selectedMovement.id,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setVideoUrl(data.url || `https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4`)
      } else {
        // Mock video for demo
        setVideoUrl(`https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4`)
      }
    } catch (err) {
      // Mock video for demo
      setVideoUrl(`https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4`)
    } finally {
      clearInterval(progressInterval)
      setVideoProgress(100)
      setVideoLoading(false)
    }
  }

  // Mutual exclusion: selecting existing clears generated and vice versa
  const handleSelectExistingModel = (url: string) => {
    setExistingModelImage(url)
    setModelImageMode('select')
    setModelImageUrl(null)
  }

  const handleSelectExistingStyle = (url: string) => {
    setStyledImageUrl(url)
    setStyleImageMode('select')
  }

  const handleSelectExistingFirstFrame = (url: string) => {
    setFirstFrameUrl(url)
    setFirstFrameMode('select')
  }

  // Navigation
  const goNext = useCallback(async () => {
    // Auto-generate when moving to next step if needed
    if (currentStep === 1 && modelImageMode === 'generate' && !modelImageUrl) {
      await generateModelImage()
    }
    if (currentStep === 2 && styleImageMode === 'generate' && !styledImageUrl) {
      await generateStyleImage()
    }
    if (currentStep === 3 && firstFrameMode === 'generate' && !firstFrameUrl) {
      await generateFirstFrame()
    }
    if (currentStep === 4 && !videoUrl) {
      await generateVideo()
    }
    setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1))
  }, [currentStep, modelImageMode, modelImageUrl, styleImageMode, styledImageUrl, firstFrameMode, firstFrameUrl, videoUrl])

  const goBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }

  const canProceed = () => {
    switch (currentStep) {
      case 0: return !!selectedIp
      case 1: return modelImageMode === 'select' ? !!existingModelImage : !!modelImageUrl
      case 2: return styleImageMode === 'select' ? !!styledImageUrl : !!styledImageUrl
      case 3: return firstFrameMode === 'select' ? !!firstFrameUrl : !!firstFrameUrl
      case 4: return !!videoUrl
      default: return false
    }
  }

  // Determine preview URL for each step
  const getModelImagePreview = () => modelImageMode === 'select' ? existingModelImage : modelImageUrl
  const getStyleImagePreview = () => styleImageMode === 'select' ? styledImageUrl : styledImageUrl
  const getFirstFramePreview = () => firstFrameMode === 'select' ? firstFrameUrl : firstFrameUrl

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header Bar */}
      <header className="flex-shrink-0 sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-oat">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-semibold tracking-tight" style={{ fontFeatureSettings: '"ss01", "ss03", "ss10", "ss11", "ss12"' }}>
                生成视频
              </h1>
              <span className="px-3 py-1 rounded-full bg-lemon-400/20 text-lemon-700 text-sm font-medium">
                向导模式
              </span>
            </div>

            {/* Step Pills */}
            <div className="hidden md:flex items-center gap-2">
              {STEPS.map((step, idx) => (
                <button
                  key={step.id}
                  onClick={() => idx < currentStep && setCurrentStep(idx)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300
                    ${idx === currentStep
                      ? 'bg-matcha-600 text-white shadow-lg'
                      : idx < currentStep
                        ? 'bg-oat-light text-warm-charcoal hover:bg-oat cursor-pointer'
                        : 'bg-gray-100 text-warm-silver'
                    }
                  `}
                >
                  <span>{step.icon}</span>
                  <span className="hidden lg:inline">{step.label}</span>
                  {idx < currentStep && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Step Indicator */}
          <div className="md:hidden mt-4 flex items-center justify-between">
            <span className="text-sm text-warm-silver">
              步骤 {currentStep + 1} / {STEPS.length}
            </span>
            <span className="text-sm font-medium text-warm-charcoal">
              {STEPS[currentStep].icon} {STEPS[currentStep].label}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content - Scrollable */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {/* Error Banner */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 rounded-xl bg-pomegranate-400/10 border border-pomegranate-400/30 text-pomegranate-400"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              </motion.div>
            )}

            {/* Step Content */}
            {currentStep === 0 && <SelectIPStep
              ips={ips}
              selectedIp={selectedIp}
              onSelect={setSelectedIp}
            />}

            {currentStep === 1 && <ModelImageStep
              existingImage={existingModelImage}
              generatedImage={modelImageUrl}
              isLoading={modelImageLoading}
              mode={modelImageMode}
              onModeChange={setModelImageMode}
              onSelectExisting={handleSelectExistingModel}
              onGenerate={generateModelImage}
              canGenerate={!!selectedIp}
              selectedIp={selectedIp}
            />}

            {currentStep === 2 && <StyleImageStep
              existingImages={existingStyleImages}
              generatedImage={styledImageUrl}
              isLoading={styleImageLoading}
              mode={styleImageMode}
              onModeChange={setStyleImageMode}
              onSelectExisting={handleSelectExistingStyle}
              onGenerate={generateStyleImage}
              canGenerate={!!selectedPose}
              poses={poses}
              makeups={makeups}
              accessories={accessories}
              selectedPose={selectedPose}
              selectedMakeup={selectedMakeup}
              selectedAccessory={selectedAccessory}
              onPoseSelect={setSelectedPose}
              onMakeupSelect={setSelectedMakeup}
              onAccessorySelect={setSelectedAccessory}
              selectedIp={selectedIp}
              modelImageUrl={modelImageUrl}
            />}

            {currentStep === 3 && <FirstFrameStep
              existingImages={existingFirstFrames}
              generatedImage={firstFrameUrl}
              isLoading={firstFrameLoading}
              mode={firstFrameMode}
              onModeChange={setFirstFrameMode}
              onSelectExisting={handleSelectExistingFirstFrame}
              onGenerate={generateFirstFrame}
              canGenerate={!!selectedScene && !!compositionText}
              scenes={scenes}
              selectedScene={selectedScene}
              onSceneSelect={setSelectedScene}
              compositionText={compositionText}
              onCompositionChange={setCompositionText}
              selectedIp={selectedIp}
              styledImageUrl={styledImageUrl}
            />}

            {currentStep === 4 && <VideoStep
              videoUrl={videoUrl}
              isLoading={videoLoading}
              progress={videoProgress}
              movements={movements}
              selectedMovement={selectedMovement}
              onMovementSelect={setSelectedMovement}
              onGenerate={generateVideo}
              canGenerate={!!selectedMovement && !!firstFrameUrl}
            />}
          </motion.div>

          {/* Selection Summary - shows previous step inputs */}
          <SelectionSummary
            selectedIp={selectedIp}
            modelImageUrl={modelImageUrl}
            styledImageUrl={styledImageUrl}
            firstFrameUrl={firstFrameUrl}
          />
          </AnimatePresence>
        </div>
      </main>

      {/* Navigation Footer - Fixed at bottom */}
      <footer className="flex-shrink-0 bg-background/95 backdrop-blur-md border-t border-oat">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-warm-silver hover:bg-oat-light hover:text-warm-charcoal transition-all duration-300"
                title="返回首页 (Esc)"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="hidden sm:inline">首页</span>
              </button>

              <button
                onClick={goBack}
                disabled={currentStep === 0}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300
                  ${currentStep === 0
                    ? 'text-warm-silver cursor-not-allowed'
                    : 'text-warm-charcoal hover:bg-oat-light'
                }
                `}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                上一步
              </button>
            </div>

            <span className="text-sm text-warm-silver">
              {STEPS[currentStep].icon} {STEPS[currentStep].label}
            </span>

            <button
              onClick={goNext}
              disabled={!canProceed()}
              className={`
                flex items-center gap-2 px-6 py-2 rounded-xl font-medium transition-all duration-300
                ${canProceed()
                  ? 'bg-matcha-600 text-white hover:bg-matcha-800 hover:shadow-hard active:scale-98'
                  : 'bg-gray-100 text-warm-silver cursor-not-allowed'
                }
              `}
            >
              {currentStep === STEPS.length - 1 ? '完成' : '下一步'}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </footer>

      {/* Decorative Elements */}
      <div className="fixed top-40 left-20 w-72 h-72 bg-matcha-300/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="fixed bottom-40 right-20 w-64 h-64 bg-slushie-500/20 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }} />
    </div>
  )
}

// Step 1: Select Virtual IP
function SelectIPStep({
  ips,
  selectedIp,
  onSelect,
}: {
  ips: VirtualIP[]
  selectedIp: VirtualIP | null
  onSelect: (ip: VirtualIP) => void
}) {
  if (ips.length === 0) {
    return (
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-semibold tracking-tight" style={{ fontFeatureSettings: '"ss01", "ss03", "ss10", "ss11", "ss12"' }}>
            选择虚拟 IP
          </h2>
          <p className="text-warm-charcoal text-lg">
            从你的虚拟IP库中选择一个作为视频主角
          </p>
        </div>
        <div className="text-center py-16">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-oat-light flex items-center justify-center">
            <svg className="w-12 h-12 text-warm-silver" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h3 className="text-xl font-medium text-warm-charcoal mb-2">暂无虚拟IP</h3>
          <p className="text-warm-silver mb-6">创建你的第一个虚拟IP来开始生成视频</p>
          <button className="px-6 py-3 bg-matcha-600 text-white rounded-xl font-medium hover:bg-matcha-800 transition-all duration-300">
            创建虚拟IP
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-semibold tracking-tight" style={{ fontFeatureSettings: '"ss01", "ss03", "ss10", "ss11", "ss12"' }}>
          选择虚拟 IP
        </h2>
        <p className="text-warm-charcoal text-lg">
          从你的虚拟IP库中选择一个作为视频主角
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {ips.map((ip) => (
          <button
            key={ip.id}
            onClick={() => onSelect(ip)}
            className={`
              relative p-6 rounded-2xl border-2 transition-all duration-300 group
              ${selectedIp?.id === ip.id
                ? 'border-matcha-600 bg-matcha-600/5 shadow-lg'
                : 'border-oat bg-white hover:border-matcha-300 hover:shadow-lg'
              }
            `}
          >
            <div className="aspect-square relative mb-4 rounded-xl overflow-hidden bg-oat-light">
              {ip.avatarUrl ? (
                <Image src={ip.avatarUrl} alt={ip.name} fill className="object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl">🎭</span>
                </div>
              )}
            </div>
            <h3 className="font-semibold text-warm-charcoal group-hover:text-matcha-600 transition-colors">
              {ip.name}
            </h3>
            <p className="text-sm text-warm-silver">{ip.type}</p>

            {selectedIp?.id === ip.id && (
              <div className="absolute -top-3 -right-3 w-8 h-8 bg-matcha-600 rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// Step 2: Model Image (with mode toggle)
function ModelImageStep({
  existingImage,
  generatedImage,
  isLoading,
  mode,
  onModeChange,
  onSelectExisting,
  onGenerate,
  canGenerate,
  selectedIp,
}: {
  existingImage: string | null
  generatedImage: string | null
  isLoading: boolean
  mode: 'select' | 'generate'
  onModeChange: (mode: 'select' | 'generate') => void
  onSelectExisting: (url: string) => void
  onGenerate: () => void
  canGenerate: boolean
  selectedIp: VirtualIP | null
}) {
  const previewUrl = mode === 'select' ? existingImage : generatedImage

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold text-warm-charcoal">
          模特图
        </h2>
        <p className="text-warm-silver">
          生成虚拟IP穿着服装的全身模特图
        </p>
        {selectedIp && (
          <p className="text-sm text-matcha-600 font-medium">
            🎭 已选择虚拟IP: {selectedIp.name}
          </p>
        )}
      </div>

      {/* Mode Toggle */}
      <div className="flex justify-center">
        <ModeToggle mode={mode} onModeChange={onModeChange} canToggle={!!existingImage} />
      </div>

      {/* Content based on mode */}
      {mode === 'select' ? (
        <div className="space-y-6">
          <ImageGridSelector
            images={existingImage ? [{ id: 'existing', url: existingImage, name: '已有模特图' }] : []}
            selectedImage={existingImage || null}
            onSelect={onSelectExisting}
          />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-oat-light/30 rounded-xl p-6 text-center">
            <p className="text-warm-charcoal mb-4">
              基于所选虚拟IP的全身图和产品图片，AI将生成模特图
            </p>
            <button
              onClick={onGenerate}
              disabled={!canGenerate || isLoading}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-matcha-600 text-white font-medium hover:bg-matcha-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mx-auto"
            >
              {isLoading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  生成中...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  AI 生成模特图
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Preview Area */}
      <div className="max-w-sm mx-auto">
        <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-oat-light border-2 border-dashed border-oat">
          {isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-16 h-16 border-4 border-matcha-600 border-t-transparent rounded-full animate-spin mb-4" />
              <span className="text-warm-charcoal font-medium">正在生成模特图...</span>
            </div>
          ) : previewUrl ? (
            <>
              <Image src={previewUrl} alt="模特图" fill className="object-cover" />
              {mode === 'generate' && (
                <div className="absolute bottom-4 left-4 right-4 flex gap-3">
                  <button
                    onClick={onGenerate}
                    disabled={!canGenerate}
                    className="flex-1 py-3 px-4 rounded-xl bg-white/90 backdrop-blur-sm text-warm-charcoal font-medium hover:bg-white transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    重新生成
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <svg className="w-16 h-16 text-warm-silver mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-warm-silver">点击上方按钮生成或选择已有模特图</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// Step 3: Style Image (with mode toggle)
function StyleImageStep({
  existingImages,
  generatedImage,
  isLoading,
  mode,
  onModeChange,
  onSelectExisting,
  onGenerate,
  canGenerate,
  poses,
  makeups,
  accessories,
  selectedPose,
  selectedMakeup,
  selectedAccessory,
  onPoseSelect,
  onMakeupSelect,
  onAccessorySelect,
  selectedIp,
  modelImageUrl,
}: {
  existingImages: string[]
  generatedImage: string | null
  isLoading: boolean
  mode: 'select' | 'generate'
  onModeChange: (mode: 'select' | 'generate') => void
  onSelectExisting: (url: string) => void
  onGenerate: () => void
  canGenerate: boolean
  poses: Material[]
  makeups: Material[]
  accessories: Material[]
  selectedPose: Material | null
  selectedMakeup: Material | null
  selectedAccessory: Material | null
  onPoseSelect: (pose: Material | null) => void
  onMakeupSelect: (makeup: Material | null) => void
  onAccessorySelect: (accessory: Material | null) => void
  selectedIp: VirtualIP | null
  modelImageUrl: string | null
}) {
  const previewUrl = mode === 'select' ? generatedImage : generatedImage

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold text-warm-charcoal">
          定妆图
        </h2>
        <p className="text-warm-silver">
          为虚拟IP选择姿势、妆容和饰品，生成定妆图
        </p>
        <div className="flex flex-wrap gap-2 justify-center text-sm">
          {selectedIp && (
            <span className="px-2 py-0.5 rounded-full bg-matcha-100 text-matcha-700">
              🎭 {selectedIp.name}
            </span>
          )}
          {modelImageUrl && (
            <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
              👗 模特图已生成
            </span>
          )}
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex justify-center">
        <ModeToggle mode={mode} onModeChange={onModeChange} canToggle={existingImages.length > 0} />
      </div>

      {/* Content based on mode */}
      {mode === 'select' ? (
        <div className="space-y-6">
          <ImageGridSelector
            images={existingImages.map((url, i) => ({ id: `style-${i}`, url, name: `定妆图 ${i + 1}` }))}
            selectedImage={generatedImage || null}
            onSelect={onSelectExisting}
          />
        </div>
      ) : (
        <motion.div variants={itemVariants} className="space-y-6">
          {/* Pose Selection */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-warm-charcoal flex items-center gap-2">
              <span>🧍</span> 选择姿势 <span className="text-pomegranate-400">*</span>
            </h3>
            {poses.length === 0 ? (
              <div className="text-center py-8 bg-oat-light/30 rounded-xl">
                <span className="text-3xl mb-2 block">🧍</span>
                <p className="text-warm-silver">暂无可用姿势</p>
              </div>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-2">
                {poses.map((pose) => (
                  <button
                    key={pose.id}
                    onClick={() => onPoseSelect(selectedPose?.id === pose.id ? null : pose)}
                    className={`
                      flex-shrink-0 w-28 aspect-[3/4] relative rounded-xl overflow-hidden transition-all duration-300
                      ${selectedPose?.id === pose.id
                        ? 'ring-4 ring-matcha-600 shadow-xl scale-[1.02]'
                        : 'hover:scale-[1.02] hover:shadow-lg grayscale hover:grayscale-0'
                      }
                    `}
                  >
                    <Image src={pose.thumbnailUrl} alt={pose.name} fill className="object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute bottom-0 inset-x-0 p-2">
                      <span className="text-white font-medium text-xs">{pose.name}</span>
                    </div>
                    {selectedPose?.id === pose.id && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-matcha-600 rounded-full flex items-center justify-center shadow-lg">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Makeup Selection (Optional) */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-warm-charcoal flex items-center gap-2">
              <span>💄</span> 选择妆容 <span className="text-warm-silver text-sm">(可选)</span>
            </h3>
            {makeups.length === 0 ? (
              <div className="text-center py-6 bg-oat-light/30 rounded-xl text-warm-silver text-sm">
                暂无可用妆容
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {makeups.map((makeup) => (
                  <button
                    key={makeup.id}
                    onClick={() => onMakeupSelect(selectedMakeup?.id === makeup.id ? null : makeup)}
                    className={`
                      flex-shrink-0 w-24 aspect-square relative rounded-xl overflow-hidden transition-all duration-300
                      ${selectedMakeup?.id === makeup.id
                        ? 'ring-4 ring-matcha-600 shadow-xl scale-[1.02]'
                        : 'hover:scale-[1.02] hover:shadow-lg grayscale hover:grayscale-0'
                      }
                    `}
                  >
                    <Image src={makeup.thumbnailUrl} alt={makeup.name} fill className="object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute bottom-0 inset-x-0 p-1.5">
                      <span className="text-white font-medium text-xs">{makeup.name}</span>
                    </div>
                    {selectedMakeup?.id === makeup.id && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-matcha-600 rounded-full flex items-center justify-center shadow-lg">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Accessory Selection (Optional) */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-warm-charcoal flex items-center gap-2">
              <span>💎</span> 选择饰品 <span className="text-warm-silver text-sm">(可选)</span>
            </h3>
            {accessories.length === 0 ? (
              <div className="text-center py-6 bg-oat-light/30 rounded-xl text-warm-silver text-sm">
                暂无可用饰品
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {accessories.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => onAccessorySelect(selectedAccessory?.id === acc.id ? null : acc)}
                    className={`
                      flex-shrink-0 w-24 aspect-square relative rounded-xl overflow-hidden transition-all duration-300
                      ${selectedAccessory?.id === acc.id
                        ? 'ring-4 ring-matcha-600 shadow-xl scale-[1.02]'
                        : 'hover:scale-[1.02] hover:shadow-lg grayscale hover:grayscale-0'
                      }
                    `}
                  >
                    <Image src={acc.thumbnailUrl} alt={acc.name} fill className="object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute bottom-0 inset-x-0 p-1.5">
                      <span className="text-white font-medium text-xs">{acc.name}</span>
                    </div>
                    {selectedAccessory?.id === acc.id && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-matcha-600 rounded-full flex items-center justify-center shadow-lg">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Generate Button */}
          <div className="flex justify-center pt-4">
            <button
              onClick={onGenerate}
              disabled={!canGenerate || isLoading}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-matcha-600 text-white font-medium hover:bg-matcha-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  生成中...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  AI 生成定妆图
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}

      {/* Preview Area */}
      <div className="max-w-sm mx-auto">
        <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-oat-light border-2 border-dashed border-oat">
          {isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-16 h-16 border-4 border-matcha-600 border-t-transparent rounded-full animate-spin mb-4" />
              <span className="text-warm-charcoal font-medium">正在生成定妆图...</span>
            </div>
          ) : previewUrl ? (
            <>
              <Image src={previewUrl} alt="定妆图" fill className="object-cover" />
              {mode === 'generate' && (
                <div className="absolute bottom-4 left-4 right-4 flex gap-3">
                  <button
                    onClick={onGenerate}
                    disabled={!canGenerate}
                    className="flex-1 py-3 px-4 rounded-xl bg-white/90 backdrop-blur-sm text-warm-charcoal font-medium hover:bg-white transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    重新生成
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <svg className="w-16 h-16 text-warm-silver mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-warm-silver">选择姿势后点击生成按钮</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// Step 4: First Frame (with mode toggle)
function FirstFrameStep({
  existingImages,
  generatedImage,
  isLoading,
  mode,
  onModeChange,
  onSelectExisting,
  onGenerate,
  canGenerate,
  scenes,
  selectedScene,
  onSceneSelect,
  compositionText,
  onCompositionChange,
  selectedIp,
  styledImageUrl,
}: {
  existingImages: string[]
  generatedImage: string | null
  isLoading: boolean
  mode: 'select' | 'generate'
  onModeChange: (mode: 'select' | 'generate') => void
  onSelectExisting: (url: string) => void
  onGenerate: () => void
  canGenerate: boolean
  scenes: Material[]
  selectedScene: Material | null
  onSceneSelect: (scene: Material | null) => void
  compositionText: string
  onCompositionChange: (text: string) => void
  selectedIp: VirtualIP | null
  styledImageUrl: string | null
}) {
  const previewUrl = mode === 'select' ? generatedImage : generatedImage

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold text-warm-charcoal">
          首帧图
        </h2>
        <p className="text-warm-silver">
          选择场景并描述构图，生成视频的首帧画面
        </p>
        <div className="flex flex-wrap gap-2 justify-center text-sm">
          {selectedIp && (
            <span className="px-2 py-0.5 rounded-full bg-matcha-100 text-matcha-700">
              🎭 {selectedIp.name}
            </span>
          )}
          {styledImageUrl && (
            <span className="px-2 py-0.5 rounded-full bg-pink-100 text-pink-700">
              💄 定妆图已生成
            </span>
          )}
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex justify-center">
        <ModeToggle mode={mode} onModeChange={onModeChange} canToggle={existingImages.length > 0} />
      </div>

      {/* Content based on mode */}
      {mode === 'select' ? (
        <div className="space-y-6">
          <ImageGridSelector
            images={existingImages.map((url, i) => ({ id: `frame-${i}`, url, name: `首帧图 ${i + 1}` }))}
            selectedImage={generatedImage || null}
            onSelect={onSelectExisting}
          />
        </div>
      ) : (
        <motion.div variants={itemVariants} className="space-y-6">
          {/* Scene Selection */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-warm-charcoal flex items-center gap-2">
              <span>🎬</span> 选择场景 <span className="text-pomegranate-400">*</span>
            </h3>
            {scenes.length === 0 ? (
              <div className="text-center py-8 bg-oat-light/30 rounded-xl">
                <span className="text-3xl mb-2 block">🎬</span>
                <p className="text-warm-silver">暂无可用场景</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {scenes.map((scene) => (
                  <button
                    key={scene.id}
                    onClick={() => onSceneSelect(selectedScene?.id === scene.id ? null : scene)}
                    className={`
                      relative aspect-[3/4] rounded-xl overflow-hidden transition-all duration-300
                      ${selectedScene?.id === scene.id
                        ? 'ring-4 ring-matcha-600 shadow-xl scale-[1.02]'
                        : 'hover:scale-[1.02] hover:shadow-lg'
                      }
                    `}
                  >
                    <Image src={scene.thumbnailUrl} alt={scene.name} fill className="object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute bottom-0 inset-x-0 p-3">
                      <span className="text-white font-medium text-sm">{scene.name}</span>
                    </div>
                    {selectedScene?.id === scene.id && (
                      <div className="absolute top-3 right-3 w-6 h-6 bg-matcha-600 rounded-full flex items-center justify-center shadow-lg">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Composition Text */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-warm-charcoal flex items-center gap-2">
              <span>📝</span> 构图描述 <span className="text-warm-silver text-sm">(可选)</span>
            </h3>
            <textarea
              value={compositionText}
              onChange={(e) => onCompositionChange(e.target.value)}
              placeholder="描述你想要的画面构图，如：人物站在画面中央，背景是城市夜景..."
              className="w-full h-24 px-4 py-3 rounded-xl border-2 border-oat bg-white text-warm-charcoal placeholder-warm-silver focus:border-matcha-600 focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* Generate Button */}
          <div className="flex justify-center pt-4">
            <button
              onClick={onGenerate}
              disabled={!canGenerate || isLoading}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-matcha-600 text-white font-medium hover:bg-matcha-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  生成中...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  AI 生成首帧图
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}

      {/* Preview Area */}
      <div className="max-w-sm mx-auto">
        <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-oat-light border-2 border-dashed border-oat">
          {isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-16 h-16 border-4 border-matcha-600 border-t-transparent rounded-full animate-spin mb-4" />
              <span className="text-warm-charcoal font-medium">正在生成首帧图...</span>
            </div>
          ) : previewUrl ? (
            <>
              <Image src={previewUrl} alt="首帧图" fill className="object-cover" />
              {mode === 'generate' && (
                <div className="absolute bottom-4 left-4 right-4 flex gap-3">
                  <button
                    onClick={onGenerate}
                    disabled={!canGenerate}
                    className="flex-1 py-3 px-4 rounded-xl bg-white/90 backdrop-blur-sm text-warm-charcoal font-medium hover:bg-white transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    重新生成
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <svg className="w-16 h-16 text-warm-silver mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-warm-silver">选择场景后点击生成按钮</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// Step 5: Video Generation
function VideoStep({
  videoUrl,
  isLoading,
  progress,
  movements,
  selectedMovement,
  onMovementSelect,
  onGenerate,
  canGenerate,
  selectedIp,
  firstFrameUrl,
}: {
  videoUrl: string | null
  isLoading: boolean
  progress: number
  movements: Movement[]
  selectedMovement: Movement | null
  onMovementSelect: (movement: Movement) => void
  onGenerate: () => void
  canGenerate: boolean
  selectedIp: VirtualIP | null
  firstFrameUrl: string | null
}) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-8"
    >
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-semibold tracking-tight" style={{ fontFeatureSettings: '"ss01", "ss03", "ss10", "ss11", "ss12"' }}>
          生成视频
        </h2>
        <p className="text-warm-charcoal text-lg">
          选择动作，AI将生成带货视频
        </p>
        <div className="flex flex-wrap gap-2 justify-center text-sm">
          {selectedIp && (
            <span className="px-2 py-0.5 rounded-full bg-matcha-100 text-matcha-700">
              🎭 {selectedIp.name}
            </span>
          )}
          {firstFrameUrl && (
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
              🖼️ 首帧图已选择
            </span>
          )}
        </div>
      </div>

      {/* Movement Selection */}
      <motion.div variants={itemVariants} className="space-y-4">
        <h3 className="text-lg font-semibold text-warm-charcoal flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-matcha-600/20 text-matcha-600 flex items-center justify-center text-sm">
            1
          </span>
          选择动作
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {movements.map((movement) => (
            <button
              key={movement.id}
              onClick={() => onMovementSelect(movement)}
              className={`
                p-4 rounded-xl border-2 transition-all duration-300 text-left
                ${selectedMovement?.id === movement.id
                  ? 'border-matcha-600 bg-matcha-600/5'
                  : 'border-oat bg-white hover:border-matcha-300'
                }
              `}
            >
              <div className="w-12 h-12 rounded-full bg-oat-light flex items-center justify-center mb-3">
                <span className="text-2xl">💃</span>
              </div>
              <h4 className="font-semibold text-warm-charcoal mb-1">{movement.content}</h4>
              {movement.clothing && (
                <p className="text-sm text-warm-silver">{movement.clothing}</p>
              )}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Generate Button */}
      <motion.div variants={itemVariants} className="flex justify-center">
        <button
          onClick={onGenerate}
          disabled={!canGenerate || isLoading}
          className="flex items-center gap-2 px-8 py-4 rounded-xl bg-matcha-600 text-white font-medium hover:bg-matcha-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
        >
          {isLoading ? (
            <>
              <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              生成中... {Math.round(progress)}%
            </>
          ) : (
            <>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              AI 生成视频
            </>
          )}
        </button>
      </motion.div>

      {/* Video Preview */}
      <motion.div variants={itemVariants} className="max-w-2xl mx-auto">
        <div className="relative aspect-video rounded-2xl overflow-hidden bg-black">
          {isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-matcha-800 to-slushie-800">
              <div className="w-full max-w-xs px-8">
                <div className="h-2 bg-white/20 rounded-full mb-4 overflow-hidden">
                  <motion.div
                    className="h-full bg-lemon-400 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-white text-center font-medium">
                  正在生成视频... {Math.round(progress)}%
                </p>
                <p className="text-white/60 text-center text-sm mt-2">
                  这可能需要几分钟时间
                </p>
              </div>
            </div>
          ) : videoUrl ? (
            <video
              src={videoUrl}
              controls
              className="w-full h-full object-contain"
              poster=""
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <svg className="w-20 h-20 text-warm-silver mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="text-warm-silver">选择动作后点击生成视频</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {videoUrl && (
          <div className="mt-6 flex gap-4 justify-center">
            <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-matcha-600 text-white font-medium hover:bg-matcha-800 transition-all duration-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              下载视频
            </button>
            <button className="flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-oat text-warm-charcoal font-medium hover:bg-oat-light transition-all duration-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              分享
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
