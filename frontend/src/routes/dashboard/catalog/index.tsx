import { createFileRoute } from "@tanstack/react-router"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const Route = createFileRoute("/dashboard/catalog/")({
  component: CatalogPage,
})

function CatalogPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Catalog</h2>
        <p className="text-muted-foreground">
          Manage your products and inventory
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Catalog Management</CardTitle>
          <CardDescription>
            This is a test page to verify the sidebar navigation is working correctly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            The sidebar should be visible on the left side of the screen. You can test
            navigation by clicking on different menu items.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

