"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

export interface ModalProps extends React.HTMLAttributes<HTMLDivElement> {
  isOpen: boolean
  onClose: () => void
  title?: string
}

export function Modal({ isOpen, onClose, title, children, className, ...props }: ModalProps) {
  // Prevent scrolling when modal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => { document.body.style.overflow = "unset" }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity">
      <div 
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative w-full max-w-lg rounded-[var(--radius-lg)] border bg-[var(--card)] p-6 shadow-lg animate-in zoom-in-95 duration-200", 
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-between mb-4">
          {title && <h2 className="text-lg font-semibold leading-none tracking-tight text-[var(--foreground)]">{title}</h2>}
          <button 
            onClick={onClose}
            className="rounded-full p-1 opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </div>
        <div className="text-sm text-[var(--foreground)]">
          {children}
        </div>
      </div>
    </div>
  )
}
