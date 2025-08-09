import * as Toast from "@radix-ui/react-toast";
import { ReactNode, useState } from "react";

export function ToastProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Toast.Provider swipeDirection="right">
      {children}
      <Toast.Viewport className="fixed bottom-4 right-4 z-50 w-96 max-w-[92vw]" />
    </Toast.Provider>
  );
}

export function AppToast({ title, description, open, onOpenChange }: { title: string; description?: string; open: boolean; onOpenChange: (o: boolean) => void; }) {
  return (
    <Toast.Root open={open} onOpenChange={onOpenChange} className="bg-popover border shadow-md rounded p-3">
      <Toast.Title className="text-sm font-semibold">{title}</Toast.Title>
      {description && <Toast.Description className="text-xs text-muted-foreground mt-1">{description}</Toast.Description>}
    </Toast.Root>
  );
}
