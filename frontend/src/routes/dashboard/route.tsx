import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { Separator } from '@/components/ui/separator'
import { getCurrentUser } from '@/lib/api/auth'

/**
 * Decodes and validates a JWT token without making an API call
 * Returns true if token is valid, false otherwise
 */
function isValidToken(token: string): boolean {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return false
    }

    // Decode the payload (second part)
    const payload = JSON.parse(atob(parts[1]))

    // Check expiration
    if (payload.exp) {
      const exp = payload.exp * 1000 // Convert to milliseconds
      if (Date.now() >= exp) {
        return false // Token expired
      }
    }

    return true
  } catch (error) {
    // Invalid token format
    return false
  }
}

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

    // Validate token locally without API call (fast!)
    if (!isValidToken(token)) {
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
  },
})

function DashboardLayout() {
  const userType = localStorage.getItem('user_type') as 'supplier' | 'consumer'
  const navigate = useNavigate()

  const {
    data: user,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    retry: false,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  })

  // Handle auth errors (e.g., token revoked on server)
  useEffect(() => {
    if (error) {
      const statusCode = (error as any)?.status
      const errorMessage =
        error instanceof Error ? error.message : String(error)

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

        navigate({ to: '/auth' })
      }
    }
  }, [error, navigate])

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
