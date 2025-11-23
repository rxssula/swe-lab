import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  signupConsumer,
  signupSupplier,
  type ConsumerSignupRequest,
  type SupplierSignupRequest,
  type SignupResponse,
} from '../api/auth'

export function useConsumerSignup() {
  const navigate = useNavigate()

  return useMutation<SignupResponse, Error, ConsumerSignupRequest>({
    mutationFn: signupConsumer,
    onSuccess: (data) => {
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('user_type', data.user_type)
      localStorage.setItem('role', data.role)

      navigate({ to: '/dashboard/catalog' }).catch(() => {
        navigate({ to: '/' })
      })
    },
  })
}

export function useSupplierSignup() {
  const navigate = useNavigate()

  return useMutation<SignupResponse, Error, SupplierSignupRequest>({
    mutationFn: signupSupplier,
    onSuccess: (data) => {
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('user_type', data.user_type)
      localStorage.setItem('role', data.role)

      navigate({ to: '/dashboard/catalog' }).catch(() => {
        navigate({ to: '/' })
      })
    },
  })
}
