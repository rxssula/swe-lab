import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Link } from '@tanstack/react-router'
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useConsumerSignup } from '@/lib/hooks/use-signup'

const signupSchema = z
  .object({
    businessName: z.string().min(1, 'Business name is required'),
    businessType: z.string().min(1, 'Business type is required'),
    address: z.string().min(1, 'Address is required'),
    city: z.string().min(1, 'City is required'),
    country: z.string().min(1, 'Country is required'),
    email: z.email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    phoneNumber: z.string().min(1, 'Phone number is required'),
    name: z.string().min(1, 'Name is required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

type SignupFormValues = z.infer<typeof signupSchema>

export function ConsumerSignupForm({
  ...props
}: React.ComponentProps<typeof Card>) {
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      businessName: '',
      businessType: '',
      email: '',
      password: '',
      confirmPassword: '',
      phoneNumber: '',
      address: '',
      city: '',
      country: '',
      name: '',
    },
  })

  const signupMutation = useConsumerSignup()

  const onSubmit = (data: SignupFormValues) => {
    const apiData = {
      business_name: data.businessName,
      business_type: data.businessType,
      address: data.address,
      city: data.city,
      country: data.country,
      email: data.email,
      password: data.password,
      phone_number: data.phoneNumber,
      name: data.name,
    }

    signupMutation.mutate(apiData)
  }

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>Create Consumer Account</CardTitle>
        <CardDescription>
          Register your restaurant or hotel business
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Your Name</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="John Doe"
                        required
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Business Name</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Your Restaurant Name"
                        required
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="businessType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Type</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Restaurant, Hotel, etc."
                        required
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        required
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="m@example.com"
                        required
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      We&apos;ll use this to contact you. We will not share your
                      email with anyone else.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" required {...field} />
                    </FormControl>
                    <FormDescription>
                      Must be at least 8 characters long.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" required {...field} />
                    </FormControl>
                    <FormDescription>
                      Please confirm your password.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Street address"
                        required
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="City"
                        required
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Country"
                        required
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="mt-6 space-y-4">
              {signupMutation.isError && (
                <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
                  {signupMutation.error instanceof Error
                    ? signupMutation.error.message
                    : 'An error occurred during signup'}
                </div>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={signupMutation.isPending}
              >
                {signupMutation.isPending
                  ? 'Creating Account...'
                  : 'Create Account'}
              </Button>
              <FormDescription className="text-center">
                Already have an account?{' '}
                <Link to="/auth/consumer/login">Sign in</Link>
              </FormDescription>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
