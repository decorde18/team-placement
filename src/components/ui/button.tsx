import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    // Mimicking class-variance-authority without another dependency
    let variantStyles = ""
    switch (variant) {
      case "default":
        variantStyles = "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary)]/90"
        break
      case "destructive":
        variantStyles = "bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:bg-[var(--destructive)]/90"
        break
      case "outline":
        variantStyles = "border border-[var(--input)] bg-transparent hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
        break
      case "secondary":
        variantStyles = "bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--secondary)]/80"
        break
      case "ghost":
        variantStyles = "hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
        break
      case "link":
        variantStyles = "text-[var(--primary)] underline-offset-4 hover:underline"
        break
    }

    let sizeStyles = ""
    switch (size) {
      case "default":
        sizeStyles = "h-10 px-4 py-2"
        break
      case "sm":
        sizeStyles = "h-9 rounded-md px-3"
        break
      case "lg":
        sizeStyles = "h-11 rounded-md px-8"
        break
      case "icon":
        sizeStyles = "h-10 w-10"
        break
    }

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-[var(--radius)] text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          variantStyles,
          sizeStyles,
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
