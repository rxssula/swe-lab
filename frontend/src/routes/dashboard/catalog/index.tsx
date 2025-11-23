import { createFileRoute, redirect } from '@tanstack/react-router'
import { CatalogManagement } from '@/components/catalog/catalog-management'

export const Route = createFileRoute('/dashboard/catalog/')({
  component: CatalogPage,
  beforeLoad: () => {
    const userType = localStorage.getItem('user_type')
    if (userType !== 'supplier') {
      throw redirect({
        to: '/dashboard',
      })
    }
  },
})

function CatalogPage() {
  return <CatalogManagement />
}
