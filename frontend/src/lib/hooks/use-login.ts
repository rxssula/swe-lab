import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { login, type LoginRequest, type SignupResponse } from '../api/auth'

export function useLogin() {
  const navigate = useNavigate()

  return useMutation<SignupResponse, Error, LoginRequest>({
    mutationFn: login,
    onSuccess: (data) => {
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('user_type', data.user_type)
      localStorage.setItem('role', data.role)
      if (data.consumer_id) {
        localStorage.setItem('consumer_id', data.consumer_id)
      }
      if (data.supplier_id) {
        localStorage.setItem('supplier_id', data.supplier_id)
      }
      if (data.user?.id) {
        localStorage.setItem('user_id', data.user.id)
      }

      // Navigate based on user type
      navigate({ to: '/dashboard/catalog' }).catch(() => {
        navigate({ to: '/' })
      })
    },
  })
}
