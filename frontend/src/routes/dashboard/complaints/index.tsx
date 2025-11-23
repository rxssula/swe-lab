import { createFileRoute } from '@tanstack/react-router'
import { ComplaintManagement } from '@/components/complaints/complaint-management'

export const Route = createFileRoute('/dashboard/complaints/')({
  component: ComplaintsPage,
})

function ComplaintsPage() {
  const userType = localStorage.getItem('user_type') as 'supplier' | 'consumer' | null
  return <ComplaintManagement userType={userType ?? 'consumer'} />
}
