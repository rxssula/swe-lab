import { Outlet, createFileRoute } from '@tanstack/react-router'
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { Separator } from '@/components/ui/separator'

export const Route = createFileRoute('/dashboard')({
  component: DashboardLayout,
})

function DashboardLayout() {
  // TODO: Get user type and user info from auth context/state
  // For now, using mock data for testing
  const userType = 'supplier' as 'supplier' | 'consumer'
  const user = {
    name: 'John Doe',
    email: 'john@example.com',
    avatar: undefined,
  }

  return (
    <SidebarProvider>
      <AppSidebar userType={userType} user={user} />
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
