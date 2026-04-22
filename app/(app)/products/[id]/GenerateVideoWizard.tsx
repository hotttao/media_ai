'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'

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

  const fetchIPs = async () => {
    try {
      const res = await fetch('/api/ips')
      if (res.ok) {
        const data = await res.json()
        setIps(data)
      }
    } catch (err) {
      console.error('Failed to fetch IPs:', err)
    }
  }

  const fetchScenes = async () => {
    // Mock data - in production, this would be an API call
    setScenes([
      { id: 'scene-1', name: '户外街拍', thumbnailUrl: 'https://picsum.photos/seed/scene1/300/400' },
      { id: 'scene-2', name: '室内棚拍', thumbnailUrl: 'https://picsum.photos/seed/scene2/300/400' },
      { id: 'scene-3', name: '咖啡厅', thumbnailUrl: 'https://picsum.photos/seed/scene3/300/400' },
      { id: 'scene-4', name: '海边沙滩', thumbnailUrl: 'https://picsum.photos/seed/scene4/300/400' },
    ])
    setPoses([
      { id: 'pose-1', name: '站姿展示', thumbnailUrl: 'https://picsum.photos/seed/pose1/300/400' },
      { id: 'pose-2', name: '坐姿展示', thumbnailUrl: 'https://picsum.photos/seed/pose2/300/400' },
      { id: 'pose-3', name: '走姿展示', thumbnailUrl: 'https://picsum.photos/seed/pose3/300/400' },
    ])
    setMakeups([
      { id: 'makeup-1', name: '自然妆容', thumbnailUrl: 'https://picsum.photos/seed/makeup1/300/400' },
      { id: 'makeup-2', name: '精致妆容', thumbnailUrl: 'https://picsum.photos/seed/makeup2/300/400' },
      { id: 'makeup-3', name: '无妆感', thumbnailUrl: 'https://picsum.photos/seed/makeup3/300/400' },
    ])
  }

  const fetchMovements = async () => {
    // Mock data - in production, this would be an API call
    setMovements([
      { id: 'mov-1', content: '优雅转身', url: null, clothing: '连衣裙' },
      { id: 'mov-2', content: '自信走步', url: null, clothing: '休闲装' },
      { id: 'mov-3', content: '活泼跳跃', url: null, clothing: '运动装' },
      { id: 'mov-4', content: '静态展示', url: null, clothing: '正装' },
    ])
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
    <div className="min-h-screen bg-background">
      {/* Header Bar */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-oat">
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

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
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
              effectImageUrl={effectImageUrl}
              isLoading={effectImageLoading}
              onRegenerate={generateEffectImage}
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

        {/* Navigation Footer */}
        <div className="mt-12 flex items-center justify-between">
          <button
            onClick={goBack}
            disabled={currentStep === 0}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300
              ${currentStep === 0
                ? 'text-warm-silver cursor-not-allowed'
                : 'text-warm-charcoal hover:bg-oat-light'
              }
            `}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            上一步
          </button>

          <div className="flex items-center gap-4">
            <span className="text-sm text-warm-silver">
              {STEPS[currentStep].icon} {STEPS[currentStep].label}
            </span>
          </div>

          <button
            onClick={goNext}
            disabled={!canProceed()}
            className={`
              flex items-center gap-2 px-8 py-3 rounded-xl font-medium transition-all duration-300
              ${canProceed()
                ? 'bg-matcha-600 text-white hover:bg-matcha-800 hover:shadow-hard active:scale-98'
                : 'bg-gray-100 text-warm-silver cursor-not-allowed'
              }
            `}
          >
            {currentStep === STEPS.length - 1 ? '完成' : '下一步'}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </main>

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
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-8"
    >
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-semibold tracking-tight" style={{ fontFeatureSettings: '"ss01", "ss03", "ss10", "ss11", "ss12"' }}>
          选择虚拟 IP
        </h2>
        <p className="text-warm-charcoal text-lg">
          从你的虚拟IP库中选择一个作为视频主角
        </p>
      </div>

      {ips.length === 0 ? (
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
      ) : (
        <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {ips.map((ip) => (
            <motion.button
              key={ip.id}
              variants={itemVariants}
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
            </motion.button>
          ))}
        </motion.div>
      )}
    </motion.div>
  )
}

// Step 2: Select Scene & Pose
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
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-10"
    >
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-semibold tracking-tight" style={{ fontFeatureSettings: '"ss01", "ss03", "ss10", "ss11", "ss12"' }}>
          选择场景与姿势
        </h2>
        <p className="text-warm-charcoal text-lg">
          为你的视频选择合适的场景、姿势和妆容
        </p>
      </div>

      {/* Scene Selection */}
      <motion.div variants={itemVariants} className="space-y-4">
        <h3 className="text-lg font-semibold text-warm-charcoal flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-slushie-500/20 text-slushie-800 flex items-center justify-center text-sm">
            1
          </span>
          选择场景
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {scenes.map((scene) => (
            <button
              key={scene.id}
              onClick={() => onSceneSelect(scene)}
              className={`
                relative aspect-[3/4] rounded-xl overflow-hidden transition-all duration-300 group
                ${selectedScene?.id === scene.id
                  ? 'ring-4 ring-matcha-600 ring-offset-4 ring-offset-background'
                  : 'hover:scale-105 hover:shadow-xl'
                }
              `}
            >
              <Image src={scene.thumbnailUrl} alt={scene.name} fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-0 inset-x-0 p-3">
                <span className="text-white font-medium text-sm">{scene.name}</span>
              </div>
              {selectedScene?.id === scene.id && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-matcha-600 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Pose Selection */}
      <motion.div variants={itemVariants} className="space-y-4">
        <h3 className="text-lg font-semibold text-warm-charcoal flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-lemon-400/20 text-lemon-700 flex items-center justify-center text-sm">
            2
          </span>
          选择姿势（可选）
        </h3>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {poses.map((pose) => (
            <button
              key={pose.id}
              onClick={() => onPoseSelect(pose.id === selectedPose?.id ? null : pose)}
              className={`
                flex-shrink-0 w-32 aspect-[3/4] relative rounded-xl overflow-hidden transition-all duration-300
                ${selectedPose?.id === pose.id
                  ? 'ring-4 ring-matcha-600 ring-offset-4 ring-offset-background'
                  : 'hover:scale-105 hover:shadow-xl grayscale hover:grayscale-0'
                }
              `}
            >
              <Image src={pose.thumbnailUrl} alt={pose.name} fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-0 inset-x-0 p-2">
                <span className="text-white font-medium text-xs">{pose.name}</span>
              </div>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Makeup Selection */}
      <motion.div variants={itemVariants} className="space-y-4">
        <h3 className="text-lg font-semibold text-warm-charcoal flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-pomegranate-400/20 text-pomegranate-400 flex items-center justify-center text-sm">
            3
          </span>
          选择妆容（可选）
        </h3>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {makeups.map((makeup) => (
            <button
              key={makeup.id}
              onClick={() => onMakeupSelect(makeup.id === selectedMakeup?.id ? null : makeup)}
              className={`
                flex-shrink-0 w-32 aspect-[3/4] relative rounded-xl overflow-hidden transition-all duration-300
                ${selectedMakeup?.id === makeup.id
                  ? 'ring-4 ring-matcha-600 ring-offset-4 ring-offset-background'
                  : 'hover:scale-105 hover:shadow-xl grayscale hover:grayscale-0'
                }
              `}
            >
              <Image src={makeup.thumbnailUrl} alt={makeup.name} fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-0 inset-x-0 p-2">
                <span className="text-white font-medium text-xs">{makeup.name}</span>
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

// Step 3: Effect Image Preview
function EffectPreviewStep({
  effectImageUrl,
  isLoading,
  onRegenerate,
}: {
  effectImageUrl: string | null
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
          效果图预览
        </h2>
        <p className="text-warm-charcoal text-lg">
          查看生成的效果图，确认后继续下一步
        </p>
      </div>

      <motion.div variants={itemVariants} className="max-w-md mx-auto">
        <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-oat-light border-2 border-dashed border-oat">
          {isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-16 h-16 border-4 border-matcha-600 border-t-transparent rounded-full animate-spin mb-4" />
              <span className="text-warm-charcoal font-medium">正在生成效果图...</span>
            </div>
          ) : effectImageUrl ? (
            <>
              <Image src={effectImageUrl} alt="效果图" fill className="object-cover" />
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
              <span className="text-warm-silver">点击&quot;下一步&quot;生成效果图</span>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
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
