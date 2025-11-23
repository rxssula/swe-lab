import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'

export function useLogout() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const logout = () => {
    // Clear all localStorage items related to authentication
    localStorage.removeItem('access_token')
    localStorage.removeItem('user_type')
    localStorage.removeItem('role')
    localStorage.removeItem('consumer_id')
    localStorage.removeItem('supplier_id')
    localStorage.removeItem('user_id')

    // Clear all React Query cache
    queryClient.clear()

    // Navigate to auth page
    navigate({ to: '/auth' })
  }

  return { logout }
}

