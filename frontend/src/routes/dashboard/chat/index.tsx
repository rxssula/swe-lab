import { createFileRoute } from '@tanstack/react-router'
import { ChatManagement } from '@/components/chat/chat-management'

export const Route = createFileRoute('/dashboard/chat/')({
  component: ChatPage,
})

function ChatPage() {
  const userType = localStorage.getItem('user_type') as 'supplier' | 'consumer'
  return <ChatManagement userType={userType || 'consumer'} />
}

