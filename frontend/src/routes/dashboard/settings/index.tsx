import { createFileRoute } from '@tanstack/react-router'
import { StaffManagement } from '@/components/staff/staff-management'
import { AccountSettings } from '@/components/settings/account-settings'

export const Route = createFileRoute('/dashboard/settings/')({
  component: SettingsPage,
})

function SettingsPage() {
  const userType = localStorage.getItem('user_type') as 'supplier' | 'consumer'
  const userRole = localStorage.getItem('role') as string | null

  const isOwner = userType === 'supplier' && userRole === 'OWNER'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Account Settings - Available for all users */}
      <AccountSettings />

      {/* Staff Management - Only for supplier owners */}
      {isOwner && (
        <div className="space-y-6 pt-6 border-t">
          <div>
            <h3 className="text-2xl font-semibold tracking-tight">Staff Management</h3>
            <p className="text-muted-foreground">
              Manage your team members and their roles
            </p>
          </div>
          <StaffManagement />
        </div>
      )}
    </div>
  )
}

