import { Toaster } from "@/components/ui/sonner";

/**
 * Global toast host — mount once at app root.
 */
export function ToastProvider() {
  return (
    <Toaster
      richColors
      position="top-right"
      duration={3500}
      closeButton
      theme="light"
    />
  );
}
