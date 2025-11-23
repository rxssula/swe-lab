import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { Separator } from '@/components/ui/separator'
import { getCurrentUser } from '@/lib/api/auth'

export const Route = createFileRoute('/dashboard')({
  component: DashboardLayout,
  beforeLoad: async ({ location }) => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      throw redirect({
        to: '/auth',
        search: {
          redirect: location.href,
        },
      })
    }

    // Verify token is valid by calling /auth/me
    try {
      await getCurrentUser()
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      const statusCode = (error as any)?.status

      // Handle 401 or any authentication errors
      if (
        statusCode === 401 ||
        errorMessage.includes('401') ||
        errorMessage.includes('Unauthorized') ||
        errorMessage.includes('No access token')
      ) {
        // Clear invalid auth data
        localStorage.removeItem('access_token')
        localStorage.removeItem('user_type')
        localStorage.removeItem('role')

        throw redirect({
          to: '/auth',
          search: {
            redirect: location.href,
          },
        })
      }

      // Re-throw other errors
      throw error
    }
  },
})

function DashboardLayout() {
  const userType = localStorage.getItem('user_type') as 'supplier' | 'consumer'

  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    retry: false,
  })

  if (isLoading || !user) {
    return (
      <SidebarProvider>
        <SidebarInset>
          <div className="flex h-screen items-center justify-center">
            <div className="text-sm text-muted-foreground">Loading...</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar userType={userType} user={{ email: user.email }} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">
              {userType === 'supplier' ? 'Supplier' : 'Consumer'} Dashboard
            </h1>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
