import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard/')({
  component: DashboardIndex,
})

function DashboardIndex() {
  // Redirect to catalog by default
  return <Navigate to="/dashboard/catalog" />
}
