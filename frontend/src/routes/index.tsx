import { Button } from '@/components/ui/button'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  const onClick = () => {
    alert('AMAN LOH')
  }

  return (
    <div className="flex min-h-screen min-w-screen justify-center items-center">
      <Button onClick={onClick}>Click Me!</Button>
    </div>
  )
}
