import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {UserUpdateRequest} from '@/lib/api/auth';
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {  getCurrentUser, updateUser } from '@/lib/api/auth'

const accountSchema = z.object({
  email: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
  phone_number: z.string().optional().or(z.literal('')),
  password: z.string().optional().or(z.literal('')),
  confirmPassword: z.string().optional().or(z.literal('')),
}).refine((data) => {
  // If password is provided, it must be at least 8 characters
  if (data.password && data.password.length > 0 && data.password.length < 8) {
    return false
  }
  return true
}, {
  message: 'Password must be at least 8 characters',
  path: ['password'],
}).refine((data) => {
  // If password is provided, confirmPassword must match
  if (data.password && data.password.length > 0) {
    return data.password === data.confirmPassword
  }
  return true
}, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type AccountFormValues = z.infer<typeof accountSchema>

export function AccountSettings() {
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const queryClient = useQueryClient()

  // Fetch current user data
  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
  })

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      email: '',
      phone_number: '',
      password: '',
      confirmPassword: '',
    },
    values: currentUser ? {
      email: currentUser.email || '',
      phone_number: currentUser.phone_number || '',
      password: '',
      confirmPassword: '',
    } : undefined,
  })

  const updateMutation = useMutation({
    mutationFn: (data: UserUpdateRequest) => {
      if (!currentUser?.id) {
        throw new Error('User ID not found')
      }
      return updateUser(currentUser.id, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] })
      setSuccessMessage('Your account information has been updated successfully.')
      setErrorMessage(null)
      // Reset password fields after successful update
      form.resetField('password')
      form.resetField('confirmPassword')
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000)
    },
    onError: (error: Error) => {
      setErrorMessage(error.message || 'Failed to update account information')
      setSuccessMessage(null)
    },
  })

  const onSubmit = (data: AccountFormValues) => {
    const updateData: UserUpdateRequest = {}
    
    // Only include fields that have been changed
    if (data.email && data.email !== currentUser?.email) {
      updateData.email = data.email
    }
    
    if (data.phone_number !== currentUser?.phone_number) {
      updateData.phone_number = data.phone_number || undefined
    }
    
    if (data.password && data.password.length > 0) {
      updateData.password = data.password
    }

    // If no changes, show a message
    if (Object.keys(updateData).length === 0) {
      setErrorMessage('No changes were made to your account.')
      setSuccessMessage(null)
      return
    }

    setErrorMessage(null)
    setSuccessMessage(null)
    updateMutation.mutate(updateData)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Settings</CardTitle>
        <CardDescription>
          Update your account information. Leave fields empty to keep current values.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="your.email@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-4 pt-4 border-t">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Leave empty to keep current password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Confirm your new password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {successMessage && (
              <div className="rounded-md bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-400">
                {successMessage}
              </div>
            )}
            {errorMessage && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
                {errorMessage}
              </div>
            )}
            {form.formState.errors.root && (
              <div className="text-sm text-red-500">
                {form.formState.errors.root.message}
              </div>
            )}
            <Button
              type="submit"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Updating...' : 'Update Account'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

