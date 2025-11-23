import { Link, createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const Route = createFileRoute('/auth/')({
  component: AuthIndex,
})

function AuthIndex() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold  mb-2">Welcome</h1>
          <p className="text-lg ">Choose your account type to continue</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-2xl">🛒 Consumer</CardTitle>
              <CardDescription>Restaurant / Hotel</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm ">
                Manage your restaurant or hotel business, place orders, and
                connect with suppliers.
              </p>
              <div className="flex gap-2">
                <Link to="/auth/consumer/login" className="flex-1">
                  <Button variant="outline" className="w-full">
                    Login
                  </Button>
                </Link>
                <Link to="/auth/consumer/signup" className="flex-1">
                  <Button className="w-full">Sign Up</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-2xl">📦 Supplier</CardTitle>
              <CardDescription>Farmer / Producer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">
                Manage your farming or production business, list products, and
                connect with consumers.
              </p>
              <div className="flex gap-2">
                <Link to="/auth/supplier/login" className="flex-1">
                  <Button variant="outline" className="w-full">
                    Login
                  </Button>
                </Link>
                <Link to="/auth/supplier/signup" className="flex-1">
                  <Button className="w-full">Sign Up</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
