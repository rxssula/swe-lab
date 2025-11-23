import { ConsumerLoginForm } from '@/components/auth/consumer/login-form'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/auth/consumer/login/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <ConsumerLoginForm />
      </div>
    </div>
  )
}
