// app/(app)/workflows/[code]/wizard/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { WizardStepper, WIZARD_STEPS } from '@/components/workflow/WizardStepper'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { usePermissions } from '@/foundation/hooks/usePermissions'
import Link from 'next/link'

export default function WizardPage({ params }: { params: { code: string } }) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [workflow, setWorkflow] = useState<any>(null)
  const [ips, setIps] = useState<any[]>([])
  const [selectedIpId, setSelectedIpId] = useState<string | null>(null)
  const [params_, setParams] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    // 加载工作流
    fetch(`/api/workflows/${params.code}`)
      .then(res => res.json())
      .then(setWorkflow)

    // 加载 IP 列表
    fetch('/api/ips')
      .then(res => res.json())
      .then(setIps)
  }, [params.code])

  function handleIpSelect(ipId: string) {
    setSelectedIpId(ipId)
    setCurrentStep(1)
  }

  async function handleSubmit() {
    if (!selectedIpId) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/workflows/${params.code}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ipId: selectedIpId,
          params: params_,
        }),
      })

      const data = await response.json()
      router.push(`/tasks?taskId=${data.taskId}`)
    } catch (error) {
      console.error('Submit error:', error)
      setIsSubmitting(false)
    }
  }

  if (!workflow) {
    return <div>加载中...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{workflow.name}</h1>
        <p className="text-warm-silver">{workflow.description}</p>
      </div>

      <WizardStepper
        steps={WIZARD_STEPS}
        currentStep={currentStep}
        onStepChange={setCurrentStep}
      />

      {/* Step 1: 选择 IP */}
      {currentStep === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>选择虚拟 IP</CardTitle>
          </CardHeader>
          <CardContent>
            {ips.length === 0 ? (
              <p className="text-warm-silver">暂无可用 IP，请先创建 IP</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {ips.map(ip => (
                  <div
                    key={ip.id}
                    onClick={() => handleIpSelect(ip.id)}
                    className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${
                      selectedIpId === ip.id ? 'border-matcha-600' : 'border-border'
                    }`}
                  >
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-oat-light mx-auto">
                      <img
                        src={ip.images?.[0]?.avatarUrl || ip.avatar || '/placeholder.png'}
                        alt={ip.nickname}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-center mt-2 font-medium">{ip.nickname}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: 填写参数 */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>填写参数</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {workflow.nodes?.[0]?.tool?.inputs?.map((input: any) => (
              <div key={input.name} className="space-y-2">
                <Label>
                  {input.name}
                  {input.required && <span className="text-red-500">*</span>}
                </Label>
                <Input
                  placeholder={`输入 ${input.name}`}
                  value={params_[input.name] || ''}
                  onChange={(e) => setParams(p => ({ ...p, [input.name]: e.target.value }))}
                />
              </div>
            ))}
            <div className="flex gap-4">
              <Button onClick={() => setCurrentStep(0)} variant="outline">上一步</Button>
              <Button onClick={() => setCurrentStep(2)}>下一步</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: 确认 */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>确认生成</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p><span className="font-medium">工作流：</span>{workflow.name}</p>
              <p><span className="font-medium">IP：</span>{ips.find(i => i.id === selectedIpId)?.nickname}</p>
              <p><span className="font-medium">参数：</span></p>
              <pre className="bg-oat-light p-2 rounded text-sm">
                {JSON.stringify(params_, null, 2)}
              </pre>
            </div>
            <div className="flex gap-4">
              <Button onClick={() => setCurrentStep(1)} variant="outline">上一步</Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? '提交中...' : '确认并生成'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
