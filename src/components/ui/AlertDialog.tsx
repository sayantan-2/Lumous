import * as Alert from "@radix-ui/react-alert-dialog";
import { ReactNode } from "react";
import { Button } from "./Button";
import { AlertTriangle } from "lucide-react";

export function AlertDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  tone = "neutral",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  tone?: "neutral" | "danger" | "primary";
}) {
  return (
    <Alert.Root open={open} onOpenChange={onOpenChange}>
      <Alert.Portal>
        <Alert.Overlay className="fixed inset-0 bg-black/45 backdrop-blur-sm" />
        <Alert.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-w-md w-[92%] rounded-xl border bg-popover p-5 shadow-2xl">
          <div className="flex items-start gap-3 mb-3">
            {tone === 'danger' && (
              <div className="mt-0.5 text-red-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
            )}
            <div>
              <Alert.Title className="font-semibold text-sm mb-1">{title}</Alert.Title>
              {description && (
                <Alert.Description className="text-xs text-muted-foreground">
                  {description}
                </Alert.Description>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
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
      <Button onClick={onClick} variant="outline" size="sm">
        {children}
      </Button>
    </Alert.Cancel>
  );
}

export function AlertAction({ children, onClick, tone = "danger" }: { children: ReactNode; onClick?: () => void; tone?: "primary" | "danger" }) {
  return (
    <Alert.Action asChild>
      {tone === 'danger' ? (
        <Button onClick={onClick} variant="destructive" size="sm">{children}</Button>
      ) : (
        <Button onClick={onClick} size="sm">{children}</Button>
      )}
    </Alert.Action>
  );
}
