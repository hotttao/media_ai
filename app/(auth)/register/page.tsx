import { RegisterForm } from '@/components/auth/RegisterForm'

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-feature border border-border shadow-clay p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold tracking-tight">创建账号</h1>
            <p className="text-sm text-warm-silver mt-2">
              加入 AI Content Factory
            </p>
          </div>

          <RegisterForm />
        </div>
      </div>
    </div>
  )
}
