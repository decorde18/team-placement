"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface ToggleProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Toggle = React.forwardRef<HTMLInputElement, ToggleProps>(
  ({ className, defaultChecked, checked, onChange, ...props }, ref) => {
    const [isChecked, setIsChecked] = React.useState(checked ?? defaultChecked ?? false)

    React.useEffect(() => {
      if (checked !== undefined) setIsChecked(checked)
    }, [checked])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setIsChecked(e.target.checked)
      onChange?.(e)
    }

    return (
      <label className="relative inline-flex cursor-pointer items-center">
        <input
          type="checkbox"
          ref={ref}
          checked={isChecked}
          onChange={handleChange}
          className="peer sr-only"
          {...props}
        />
        <div
          className={cn(
            "peer h-6 w-11 rounded-full bg-[var(--input)] transition-colors after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-[var(--primary)] peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--ring)] peer-focus:ring-offset-2 peer-focus:ring-offset-background",
            className
          )}
        ></div>
      </label>
    )
  }
)
Toggle.displayName = "Toggle"

export { Toggle }
