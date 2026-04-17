import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-feature border border-border shadow-clay p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold tracking-tight">Welcome Back</h1>
            <p className="text-sm text-warm-silver mt-2">
              Sign in to your Media AI account
            </p>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  )
}
