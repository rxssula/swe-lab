import { createFileRoute } from '@tanstack/react-router'
import { CatalogManagement } from '@/components/catalog/catalog-management'
import { ConsumerCatalog } from '@/components/catalog/consumer-catalog'

export const Route = createFileRoute('/dashboard/catalog/')({
  component: CatalogPage,
})

function CatalogPage() {
  const userType = localStorage.getItem('user_type') as 'supplier' | 'consumer'

  if (userType === 'supplier') {
    return <CatalogManagement />
  }

  return <ConsumerCatalog />
}
