import * as Alert from "@radix-ui/react-alert-dialog";
import { ReactNode } from "react";

export function AlertDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Alert.Root open={open} onOpenChange={onOpenChange}>
      <Alert.Portal>
        <Alert.Overlay className="fixed inset-0 bg-black/50" />
        <Alert.Content className="fixed inset-0 m-auto max-w-sm w-[92%] rounded-md border bg-popover p-4 shadow-xl">
          <Alert.Title className="font-semibold text-sm mb-1">{title}</Alert.Title>
          {description && (
            <Alert.Description className="text-xs text-muted-foreground mb-3">
              {description}
            </Alert.Description>
          )}
          <div className="flex justify-end gap-2">
            {children}
          </div>
        </Alert.Content>
      </Alert.Portal>
    </Alert.Root>
  );
}

export function AlertCancel({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <Alert.Cancel asChild>
      <button onClick={onClick} className="px-3 py-1.5 rounded border text-xs hover:bg-muted/60">
        {children}
      </button>
    </Alert.Cancel>
  );
}

export function AlertAction({ children, onClick, tone = "danger" }: { children: ReactNode; onClick?: () => void; tone?: "primary" | "danger" }) {
  const cls = tone === "danger"
    ? "bg-red-600 hover:bg-red-700 text-white"
    : "bg-primary text-primary-foreground hover:opacity-90";
  return (
    <Alert.Action asChild>
      <button onClick={onClick} className={`px-3 py-1.5 rounded text-xs ${cls}`}>
        {children}
      </button>
    </Alert.Action>
  );
}
