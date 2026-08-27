import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { registerConfirmImpl, unregisterConfirmImpl } from "@/lib/confirmAction";

const ConfirmContext = createContext(null);

const INITIAL_STATE = {
  open: false,
  title: "Confirm",
  description: "",
  confirmLabel: "Confirm",
  cancelLabel: "Cancel",
  variant: "default",
  resolve: null,
};

export function ConfirmDialogProvider({ children }) {
  const [state, setState] = useState(INITIAL_STATE);
  const settlingRef = useRef(false);

  const settle = useCallback((result) => {
    if (settlingRef.current) return;
    settlingRef.current = true;
    setState((prev) => {
      prev.resolve?.(result);
      return { ...INITIAL_STATE };
    });
    queueMicrotask(() => {
      settlingRef.current = false;
    });
  }, []);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setState({
        open: true,
        title: options.title ?? INITIAL_STATE.title,
        description: options.description ?? "",
        confirmLabel: options.confirmLabel ?? INITIAL_STATE.confirmLabel,
        cancelLabel: options.cancelLabel ?? INITIAL_STATE.cancelLabel,
        variant: options.variant ?? INITIAL_STATE.variant,
        resolve,
      });
    });
  }, []);

  useEffect(() => {
    registerConfirmImpl(confirm);
    return () => unregisterConfirmImpl();
  }, [confirm]);

  const handleOpenChange = (open) => {
    if (!open && state.open) settle(false);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <AlertDialog open={state.open} onOpenChange={handleOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{state.title}</AlertDialogTitle>
            <AlertDialogDescription>{state.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => settle(false)}>
              {state.cancelLabel}
            </AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                state.variant === "destructive" &&
                  "bg-destructive text-destructive-foreground hover:bg-destructive/90",
              )}
              onClick={() => settle(true)}
            >
              {state.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within ConfirmDialogProvider");
  }
  return ctx;
}
