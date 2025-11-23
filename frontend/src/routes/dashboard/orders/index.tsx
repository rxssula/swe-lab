import { createFileRoute } from '@tanstack/react-router'
import { OrderManagement } from '@/components/orders/order-management'

export const Route = createFileRoute('/dashboard/orders/')({
  component: OrdersPage,
})

function OrdersPage() {
  const userType = localStorage.getItem('user_type') as 'supplier' | 'consumer'
  return <OrderManagement userType={userType || 'consumer'} />
}
