import { createFileRoute } from '@tanstack/react-router'
import { LinkManagement } from '@/components/links/link-management'

export const Route = createFileRoute('/dashboard/links/')({
  component: LinksPage,
})

function LinksPage() {
  return <LinkManagement />
}
