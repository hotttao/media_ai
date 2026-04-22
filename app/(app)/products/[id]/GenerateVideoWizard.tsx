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

interface Scene {
  id: string
  name: string
  thumbnailUrl: string
}

interface Pose {
  id: string
  name: string
  thumbnailUrl: string
}

interface Makeup {
  id: string
  name: string
  thumbnailUrl: string
}

interface Movement {
  id: string
  content: string
  url: string | null
  clothing: string | null
}

interface Composition {
  id: string
  name: string
  thumbnailUrl: string
}

interface ProductMaterial {
  id: string
  fullBodyUrl: string | null
  threeViewUrl: string | null
  nineViewUrl: string | null
  firstFrameUrl: string | null
}

// Step configuration
const STEPS = [
  { id: 'select-ip', label: '选择虚拟IP', icon: '🎭' },
  { id: 'select-scene', label: '场景与姿势', icon: '🎬' },
  { id: 'effect-preview', label: '效果图预览', icon: '✨' },
  { id: 'select-motion', label: '选择动作', icon: '💃' },
  { id: 'first-frame-preview', label: '首帧图预览', icon: '🖼️' },
  { id: 'video-preview', label: '视频预览', icon: '🎥' },
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

// Card hover effect matching Clay's design
const cardHoverClass = "transition-all duration-300 hover:shadow-hard hover:-translate-y-1"

// GenerateVideoWizard Component
export function GenerateVideoWizard({ productId }: { productId: string }) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1: IP Selection
  const [ips, setIps] = useState<VirtualIP[]>([])
  const [selectedIp, setSelectedIp] = useState<VirtualIP | null>(null)

  // Step 2: Scene & Pose Selection
  const [scenes, setScenes] = useState<Scene[]>([])
  const [poses, setPoses] = useState<Pose[]>([])
  const [makeups, setMakeups] = useState<Makeup[]>([])
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null)
  const [selectedPose, setSelectedPose] = useState<Pose | null>(null)
  const [selectedMakeup, setSelectedMakeup] = useState<Makeup | null>(null)

  // Step 3: Effect Image Preview
  const [effectImageUrl, setEffectImageUrl] = useState<string | null>(null)
  const [effectImageLoading, setEffectImageLoading] = useState(false)

  // Step 4: Motion Selection
  const [movements, setMovements] = useState<Movement[]>([])
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null)
  const [compositions, setCompositions] = useState<Composition[]>([])
  const [selectedComposition, setSelectedComposition] = useState<Composition | null>(null)

  // Step 5: First Frame Preview
  const [firstFrameUrl, setFirstFrameUrl] = useState<string | null>(null)
  const [firstFrameLoading, setFirstFrameLoading] = useState(false)

  // Step 6: Video Preview
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoLoading, setVideoLoading] = useState(false)
  const [videoProgress, setVideoProgress] = useState(0)

  // Product Materials
  const [productMaterials, setProductMaterials] = useState<ProductMaterial[]>([])
  const [selectedProductMaterial, setSelectedProductMaterial] = useState<ProductMaterial | null>(null)

  // Fetch IPs on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetchIPs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetchScenes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetchMovements()
  }, [])

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

  const fetchScenes = async () => {
    try {
      const res = await fetch('/api/materials?type=SCENE')
      if (res.ok) {
        const data = await res.json()
        setScenes(data.map((m: any) => ({
          id: m.id,
          name: m.name,
          thumbnailUrl: m.url,
        })))
      }
    } catch (err) {
      console.error('Failed to fetch scenes:', err)
    }

    try {
      const res = await fetch('/api/materials?type=POSE')
      if (res.ok) {
        const data = await res.json()
        setPoses(data.map((m: any) => ({
          id: m.id,
          name: m.name,
          thumbnailUrl: m.url,
        })))
      }
    } catch (err) {
      console.error('Failed to fetch poses:', err)
    }

    try {
      const res = await fetch('/api/materials?type=MAKEUP')
      if (res.ok) {
        const data = await res.json()
        setMakeups(data.map((m: any) => ({
          id: m.id,
          name: m.name,
          thumbnailUrl: m.url,
        })))
      }
    } catch (err) {
      console.error('Failed to fetch makeups:', err)
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

    // Compositions are still mock for now - could be from a separate API
    setCompositions([
      { id: 'comp-1', name: '全身构图', thumbnailUrl: 'https://picsum.photos/seed/comp1/300/400' },
      { id: 'comp-2', name: '三分构图', thumbnailUrl: 'https://picsum.photos/seed/comp2/300/400' },
      { id: 'comp-3', name: '中心构图', thumbnailUrl: 'https://picsum.photos/seed/comp3/300/400' },
    ])
  }

  // Generate effect image
  const generateEffectImage = useCallback(async () => {
    if (!selectedIp || !selectedScene) return

    setEffectImageLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        step: 'effect-image',
        ipId: selectedIp.id,
        sceneId: selectedScene.id,
      })
      if (selectedPose) params.append('poseId', selectedPose.id)
      if (selectedMakeup) params.append('makeupId', selectedMakeup.id)

      const res = await fetch(`/api/products/${productId}/generate-video?${params}`)
      if (res.ok) {
        const data = await res.json()
        setEffectImageUrl(data.url)
      } else {
        const errorText = await res.text()
        setError(`生成效果图失败: ${errorText || res.statusText}`)
      }
    } catch (err) {
      setError('生成效果图失败，请稍后重试')
    } finally {
      setEffectImageLoading(false)
    }
  }, [productId, selectedIp, selectedScene, selectedPose, selectedMakeup])

  // Generate first frame
  const generateFirstFrame = useCallback(async () => {
    if (!selectedProductMaterial || !selectedComposition) return

    setFirstFrameLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        step: 'first-frame',
        productMaterialId: selectedProductMaterial.id,
        compositionId: selectedComposition.id,
      })

      const res = await fetch(`/api/products/${productId}/generate-video?${params}`)
      if (res.ok) {
        const data = await res.json()
        setFirstFrameUrl(data.url)
      } else {
        // Mock first frame for demo
        setFirstFrameUrl(`https://picsum.photos/seed/firstframe/600/800`)
      }
    } catch (err) {
      // Mock first frame for demo
      setFirstFrameUrl(`https://picsum.photos/seed/firstframe/600/800`)
    } finally {
      setFirstFrameLoading(false)
    }
  }, [productId, selectedProductMaterial, selectedComposition])

  // Generate video
  const generateVideo = useCallback(async () => {
    if (!selectedIp || !firstFrameUrl || !selectedMovement) return

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
          ipId: selectedIp.id,
          firstFrameUrl,
          movementId: selectedMovement.id,
          productMaterialId: selectedProductMaterial?.id,
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
  }, [productId, selectedIp, firstFrameUrl, selectedMovement, selectedProductMaterial])

  // Navigation
  const goNext = useCallback(async () => {
    if (currentStep === 2 && !effectImageUrl) {
      await generateEffectImage()
    }
    if (currentStep === 4 && !firstFrameUrl) {
      await generateFirstFrame()
    }
    if (currentStep === 5 && !videoUrl) {
      await generateVideo()
    }
    setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1))
  }, [currentStep, effectImageUrl, firstFrameUrl, videoUrl, generateEffectImage, generateFirstFrame, generateVideo])

  const goBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }

  const canProceed = () => {
    switch (currentStep) {
      case 0: return !!selectedIp
      case 1: return !!selectedScene
      case 2: return !!effectImageUrl
      case 3: return !!selectedMovement
      case 4: return !!firstFrameUrl
      case 5: return !!videoUrl
      default: return false
    }
  }

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

            {currentStep === 1 && <SelectSceneStep
              scenes={scenes}
              poses={poses}
              makeups={makeups}
              selectedScene={selectedScene}
              selectedPose={selectedPose}
              selectedMakeup={selectedMakeup}
              onSceneSelect={setSelectedScene}
              onPoseSelect={setSelectedPose}
              onMakeupSelect={setSelectedMakeup}
            />}

            {currentStep === 2 && <EffectPreviewStep
              selectedIp={selectedIp}
              selectedScene={selectedScene}
              selectedPose={selectedPose}
              selectedMakeup={selectedMakeup}
              effectImageUrl={effectImageUrl}
              isLoading={effectImageLoading}
              onGenerate={generateEffectImage}
              onRegenerate={generateEffectImage}
              onUpload={() => {
                // TODO: Implement upload functionality
                alert('上传功能开发中...')
              }}
            />}

            {currentStep === 3 && <SelectMotionStep
              movements={movements}
              compositions={compositions}
              selectedMovement={selectedMovement}
              selectedComposition={selectedComposition}
              onMovementSelect={setSelectedMovement}
              onCompositionSelect={setSelectedComposition}
            />}

            {currentStep === 4 && <FirstFramePreviewStep
              firstFrameUrl={firstFrameUrl}
              isLoading={firstFrameLoading}
              onRegenerate={generateFirstFrame}
            />}

            {currentStep === 5 && <VideoPreviewStep
              videoUrl={videoUrl}
              isLoading={videoLoading}
              progress={videoProgress}
            />}
          </motion.div>
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

// Step 2: Select Scene & Pose - Tab-based layout
function SelectSceneStep({
  scenes,
  poses,
  makeups,
  selectedScene,
  selectedPose,
  selectedMakeup,
  onSceneSelect,
  onPoseSelect,
  onMakeupSelect,
}: {
  scenes: Scene[]
  poses: Pose[]
  makeups: Makeup[]
  selectedScene: Scene | null
  selectedPose: Pose | null
  selectedMakeup: Makeup | null
  onSceneSelect: (scene: Scene) => void
  onPoseSelect: (pose: Pose | null) => void
  onMakeupSelect: (makeup: Makeup | null) => void
}) {
  const [activeTab, setActiveTab] = useState<'scene' | 'pose' | 'makeup'>('scene')

  const tabs = [
    { id: 'scene' as const, label: '场景', icon: '🎬', required: true, count: scenes.length, selected: selectedScene },
    { id: 'pose' as const, label: '姿势', icon: '🧍', required: false, count: poses.length, selected: selectedPose },
    { id: 'makeup' as const, label: '妆容', icon: '💄', required: false, count: makeups.length, selected: selectedMakeup },
  ]

  const renderContent = () => {
    switch (activeTab) {
      case 'scene':
        if (scenes.length === 0) {
          return (
            <div className="flex flex-col items-center justify-center py-16">
              <span className="text-5xl mb-4">🎬</span>
              <p className="text-warm-charcoal font-medium mb-2">暂无可用场景</p>
              <p className="text-warm-silver text-sm mb-4">需要先添加场景素材</p>
              <a href="/materials" className="px-4 py-2 bg-matcha-600 text-white rounded-lg font-medium hover:bg-matcha-800 transition-all">
                去添加场景
              </a>
            </div>
          )
        }
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {scenes.map((scene) => (
              <button
                key={scene.id}
                onClick={() => onSceneSelect(scene)}
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
        )

      case 'pose':
        if (poses.length === 0) {
          return (
            <div className="flex flex-col items-center justify-center py-16">
              <span className="text-5xl mb-4">🧍</span>
              <p className="text-warm-charcoal font-medium mb-2">暂无可用姿势</p>
              <p className="text-warm-silver text-sm mb-4">需要先添加姿势素材</p>
              <a href="/materials" className="px-4 py-2 bg-matcha-600 text-white rounded-lg font-medium hover:bg-matcha-800 transition-all">
                去添加姿势
              </a>
            </div>
          )
        }
        return (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {poses.map((pose) => (
              <button
                key={pose.id}
                onClick={() => onPoseSelect(pose.id === selectedPose?.id ? null : pose)}
                className={`
                  flex-shrink-0 w-36 aspect-[3/4] relative rounded-xl overflow-hidden transition-all duration-300
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
        )

      case 'makeup':
        if (makeups.length === 0) {
          return (
            <div className="flex flex-col items-center justify-center py-16">
              <span className="text-5xl mb-4">💄</span>
              <p className="text-warm-charcoal font-medium mb-2">暂无可用妆容</p>
              <p className="text-warm-silver text-sm mb-4">需要先添加妆容素材</p>
              <a href="/materials" className="px-4 py-2 bg-matcha-600 text-white rounded-lg font-medium hover:bg-matcha-800 transition-all">
                去添加妆容
              </a>
            </div>
          )
        }
        return (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {makeups.map((makeup) => (
              <button
                key={makeup.id}
                onClick={() => onMakeupSelect(makeup.id === selectedMakeup?.id ? null : makeup)}
                className={`
                  flex-shrink-0 w-36 aspect-[3/4] relative rounded-xl overflow-hidden transition-all duration-300
                  ${selectedMakeup?.id === makeup.id
                    ? 'ring-4 ring-matcha-600 shadow-xl scale-[1.02]'
                    : 'hover:scale-[1.02] hover:shadow-lg grayscale hover:grayscale-0'
                  }
                `}
              >
                <Image src={makeup.thumbnailUrl} alt={makeup.name} fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-0 inset-x-0 p-2">
                  <span className="text-white font-medium text-xs">{makeup.name}</span>
                </div>
                {selectedMakeup?.id === makeup.id && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-matcha-600 rounded-full flex items-center justify-center shadow-lg">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        )
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold text-warm-charcoal">
          选择场景与姿势
        </h2>
        <p className="text-warm-silver">
          为你的视频选择合适的场景、姿势和妆容
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 p-1 bg-oat-light/50 rounded-xl">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-300
              ${activeTab === tab.id
                ? 'bg-white text-warm-charcoal shadow-sm'
                : 'text-warm-silver hover:text-warm-charcoal'
              }
            `}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.required && <span className="text-pomegranate-400">*</span>}
            {tab.selected && (
              <span className="w-5 h-5 rounded-full bg-matcha-600 text-white text-xs flex items-center justify-center">
                ✓
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {renderContent()}
      </div>

      {/* Selected Summary */}
      <div className="flex gap-4 justify-center text-sm text-warm-silver">
        {selectedScene && (
          <span className="flex items-center gap-1">
            <span className="text-matcha-600">✓</span> 场景: {selectedScene.name}
          </span>
        )}
        {selectedPose && (
          <span className="flex items-center gap-1">
            <span className="text-matcha-600">✓</span> 姿势: {selectedPose.name}
          </span>
        )}
        {selectedMakeup && (
          <span className="flex items-center gap-1">
            <span className="text-matcha-600">✓</span> 妆容: {selectedMakeup.name}
          </span>
        )}
      </div>
    </div>
  )
}

// Step 3: Effect Image Preview (renamed to 首帧图预览)
function EffectPreviewStep({
  selectedIp,
  selectedScene,
  selectedPose,
  selectedMakeup,
  effectImageUrl,
  isLoading,
  onGenerate,
  onRegenerate,
  onUpload,
}: {
  selectedIp: VirtualIP | null
  selectedScene: Scene | null
  selectedPose: Pose | null
  selectedMakeup: Makeup | null
  effectImageUrl: string | null
  isLoading: boolean
  onGenerate: () => void
  onRegenerate: () => void
  onUpload: () => void
}) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold text-warm-charcoal">
          首帧图预览
        </h2>
        <p className="text-warm-silver">
          选择或上传首帧图，用于视频生成
        </p>
      </div>

      {/* Selected Materials - Show actual images */}
      <div className="grid grid-cols-4 gap-4">
        {/* IP */}
        <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-oat-light">
          {selectedIp?.avatarUrl ? (
            <Image src={selectedIp.avatarUrl} alt={selectedIp.name} fill className="object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl">🎭</span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
            <span className="text-white text-xs font-medium">{selectedIp?.name || '虚拟IP'}</span>
          </div>
        </div>
        {/* Scene */}
        <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-oat-light">
          {selectedScene?.thumbnailUrl ? (
            <Image src={selectedScene.thumbnailUrl} alt={selectedScene.name} fill className="object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl">🎬</span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
            <span className="text-white text-xs font-medium">{selectedScene?.name || '场景'}</span>
          </div>
        </div>
        {/* Pose */}
        <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-oat-light">
          {selectedPose?.thumbnailUrl ? (
            <Image src={selectedPose.thumbnailUrl} alt={selectedPose.name} fill className="object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl">🧍</span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
            <span className="text-white text-xs font-medium">{selectedPose?.name || '姿势'}</span>
          </div>
        </div>
        {/* Makeup */}
        <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-oat-light">
          {selectedMakeup?.thumbnailUrl ? (
            <Image src={selectedMakeup.thumbnailUrl} alt={selectedMakeup.name} fill className="object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl">💄</span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
            <span className="text-white text-xs font-medium">{selectedMakeup?.name || '妆容'}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center">
        <button
          onClick={onGenerate}
          disabled={!selectedIp || !selectedScene || isLoading}
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
        <button
          onClick={onUpload}
          disabled={isLoading}
          className="flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-oat text-warm-charcoal font-medium hover:bg-oat-light transition-all duration-300 disabled:opacity-50"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          上传首帧图
        </button>
      </div>

      {/* Preview Area */}
      <div className="max-w-sm mx-auto">
        <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-oat-light border-2 border-dashed border-oat">
          {isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-16 h-16 border-4 border-matcha-600 border-t-transparent rounded-full animate-spin mb-4" />
              <span className="text-warm-charcoal font-medium">正在生成首帧图...</span>
            </div>
          ) : effectImageUrl ? (
            <>
              <Image src={effectImageUrl} alt="首帧图" fill className="object-cover" />
              <div className="absolute bottom-4 left-4 right-4 flex gap-3">
                <button
                  onClick={onRegenerate}
                  disabled={!selectedIp || !selectedScene}
                  className="flex-1 py-3 px-4 rounded-xl bg-white/90 backdrop-blur-sm text-warm-charcoal font-medium hover:bg-white transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  重新生成
                </button>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <svg className="w-16 h-16 text-warm-silver mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-warm-silver">点击上方按钮生成或上传首帧图</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Step 4: Select Motion
function SelectMotionStep({
  movements,
  compositions,
  selectedMovement,
  selectedComposition,
  onMovementSelect,
  onCompositionSelect,
}: {
  movements: Movement[]
  compositions: Composition[]
  selectedMovement: Movement | null
  selectedComposition: Composition | null
  onMovementSelect: (movement: Movement) => void
  onCompositionSelect: (composition: Composition) => void
}) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-10"
    >
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-semibold tracking-tight" style={{ fontFeatureSettings: '"ss01", "ss03", "ss10", "ss11", "ss12"' }}>
          选择动作
        </h2>
        <p className="text-warm-charcoal text-lg">
          选择视频中的人物动作和构图方式
        </p>
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

      {/* Composition Selection */}
      <motion.div variants={itemVariants} className="space-y-4">
        <h3 className="text-lg font-semibold text-warm-charcoal flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-slushie-500/20 text-slushie-800 flex items-center justify-center text-sm">
            2
          </span>
          选择构图
        </h3>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {compositions.map((comp) => (
            <button
              key={comp.id}
              onClick={() => onCompositionSelect(comp)}
              className={`
                flex-shrink-0 w-40 aspect-[3/4] relative rounded-xl overflow-hidden transition-all duration-300
                ${selectedComposition?.id === comp.id
                  ? 'ring-4 ring-matcha-600 ring-offset-4 ring-offset-background'
                  : 'hover:scale-105 hover:shadow-xl grayscale hover:grayscale-0'
                }
              `}
            >
              <Image src={comp.thumbnailUrl} alt={comp.name} fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-0 inset-x-0 p-3">
                <span className="text-white font-medium text-sm">{comp.name}</span>
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

// Step 5: First Frame Preview
function FirstFramePreviewStep({
  firstFrameUrl,
  isLoading,
  onRegenerate,
}: {
  firstFrameUrl: string | null
  isLoading: boolean
  onRegenerate: () => void
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
          首帧图预览
        </h2>
        <p className="text-warm-charcoal text-lg">
          这是视频的第一帧画面，确认后开始生成视频
        </p>
      </div>

      <motion.div variants={itemVariants} className="max-w-md mx-auto">
        <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-oat-light border-2 border-dashed border-oat">
          {isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-16 h-16 border-4 border-matcha-600 border-t-transparent rounded-full animate-spin mb-4" />
              <span className="text-warm-charcoal font-medium">正在生成首帧图...</span>
            </div>
          ) : firstFrameUrl ? (
            <>
              <Image src={firstFrameUrl} alt="首帧图" fill className="object-cover" />
              <div className="absolute bottom-4 left-4 right-4 flex gap-3">
                <button
                  onClick={onRegenerate}
                  className="flex-1 py-3 px-4 rounded-xl bg-white/90 backdrop-blur-sm text-warm-charcoal font-medium hover:bg-white transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  重新生成
                </button>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <svg className="w-16 h-16 text-warm-silver mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-warm-silver">点击&quot;下一步&quot;生成首帧图</span>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// Step 6: Video Preview
function VideoPreviewStep({
  videoUrl,
  isLoading,
  progress,
}: {
  videoUrl: string | null
  isLoading: boolean
  progress: number
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
          视频预览
        </h2>
        <p className="text-warm-charcoal text-lg">
          你的视频已准备就绪，可以下载或重新生成
        </p>
      </div>

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
              <span className="text-warm-silver">点击&quot;完成&quot;生成视频</span>
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
