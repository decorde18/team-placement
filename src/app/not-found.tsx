import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-[var(--background)] p-4 text-center">
      <div className="max-w-md space-y-6">
        <h1 className="text-6xl font-black text-[var(--primary)]">404</h1>
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">Page Not Found</h2>
        <p className="text-[var(--muted-foreground)] text-muted-foreground">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <div className="flex justify-center pt-4">
<Button size="lg" className="...">
  <Link href="/" className="flex items-center justify-center w-full h-full">
    Return to Home
  </Link>
</Button>
        </div>
      </div>
    </div>
  )
}
