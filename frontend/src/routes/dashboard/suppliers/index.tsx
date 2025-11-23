import { createFileRoute } from '@tanstack/react-router'
import { FindSuppliers } from '@/components/links/find-suppliers'

export const Route = createFileRoute('/dashboard/suppliers/')({
  component: SuppliersPage,
})

function SuppliersPage() {
  return <FindSuppliers />
}

