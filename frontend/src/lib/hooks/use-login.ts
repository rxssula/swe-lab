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

      // Navigate based on user type
      navigate({ to: '/dashboard/catalog' }).catch(() => {
        navigate({ to: '/' })
      })
    },
  })
}
