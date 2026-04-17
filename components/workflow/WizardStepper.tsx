// components/workflow/WizardStepper.tsx
'use client'

interface Step {
  label: string
  description: string
}

interface WizardStepperProps {
  steps: Step[]
  currentStep: number
  onStepChange: (step: number) => void
}

export function WizardStepper({ steps, currentStep, onStepChange }: WizardStepperProps) {
  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center">
          <button
            onClick={() => onStepChange(index)}
            className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
              index === currentStep
                ? 'bg-matcha-600 text-white'
                : index < currentStep
                ? 'bg-matcha-300 text-white cursor-pointer'
                : 'bg-oat-light text-warm-silver'
            }`}
          >
            {index + 1}
          </button>
          <span className={`ml-2 text-sm ${
            index === currentStep ? 'text-foreground font-medium' : 'text-warm-silver'
          }`}>
            {step.label}
          </span>
          {index < steps.length - 1 && (
            <div className={`w-12 h-0.5 mx-4 ${
              index < currentStep ? 'bg-matcha-300' : 'bg-oat-light'
            }`} />
          )}
        </div>
      ))}
    </div>
  )
}

export const WIZARD_STEPS = [
  { label: '选择 IP', description: '选择虚拟人物' },
  { label: '填写参数', description: '配置素材和选项' },
  { label: '确认生成', description: '确认并提交' },
]
