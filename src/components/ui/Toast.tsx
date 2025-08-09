import * as Toast from "@radix-ui/react-toast";
import { ReactNode } from "react";
import { CheckCircle, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "../../lib/utils";

export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <Toast.Provider swipeDirection="right">
      {children}
      <Toast.Viewport className="fixed top-4 right-4 z-50 w-[420px] max-w-[92vw] outline-none" />
    </Toast.Provider>
  );
}

type ToastVariant = "default" | "success" | "error" | "warning" | "info";

export function AppToast({
  title,
  description,
  open,
  onOpenChange,
  variant = "default",
  duration = 2500,
}: {
  title: string;
  description?: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  variant?: ToastVariant;
  duration?: number;
}) {
  const Icon = (
    variant === "success" ? CheckCircle :
    variant === "error" ? X :
    variant === "warning" ? AlertTriangle :
    Info
  );

  return (
    <Toast.Root
      open={open}
      onOpenChange={onOpenChange}
      duration={duration}
      className={cn(
        "group relative pointer-events-auto w-full overflow-hidden rounded-md border shadow-lg backdrop-blur-sm",
        "bg-popover/90",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-80",
        "data-[state=open]:fade-in-80 data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]",
        "data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]"
      )}
    >
      <div className="p-3 pr-10 flex gap-3 items-start">
        <Icon className={cn(
          "mt-0.5 h-4 w-4",
          variant === "success" && "text-emerald-500",
          variant === "error" && "text-red-500",
          variant === "warning" && "text-amber-500",
          variant === "info" && "text-sky-500",
          variant === "default" && "text-foreground/70"
        )} />
        <div className="flex-1 min-w-0">
          <Toast.Title className="text-sm font-semibold truncate">{title}</Toast.Title>
          {description && (
            <Toast.Description className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
              {description}
            </Toast.Description>
          )}
        </div>
      </div>
      <Toast.Close asChild>
        <button
          className="absolute right-2.5 top-2.5 inline-flex h-6 w-6 items-center justify-center rounded-md text-foreground/70 hover:text-foreground hover:bg-accent/60 focus:outline-none"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </Toast.Close>
    </Toast.Root>
  );
}
