// src/components/ui/toaster.jsx

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { CheckCircle2, XCircle, AlertTriangle, Info, Loader2 } from "lucide-react"

const variantIcons = {
  default: null,
  destructive: XCircle,
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
  loading: Loader2,
}

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, className, ...props }) {
        const Icon = variantIcons[variant] || variantIcons.default

        return (
          <Toast key={id} variant={variant} className={className} {...props}>
            <div className="flex items-start gap-3">
              {Icon && (
                <Icon
                  className={`h-5 w-5 flex-shrink-0 mt-0.5 ${variant === 'loading' ? 'animate-spin' : ''
                    }`}
                />
              )}
              <div className="grid gap-1 flex-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport className="pointer-events-none right-4 top-4 w-full md:max-w-[420px]" />
    </ToastProvider>
  )
}
