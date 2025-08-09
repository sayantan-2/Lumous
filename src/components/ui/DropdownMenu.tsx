import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { ReactNode } from "react";

export function DropdownMenu({
  trigger,
  children,
}: {
  trigger: ReactNode;
  children: ReactNode;
}) {
  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>{trigger}</Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content
          side="bottom"
          align="end"
          sideOffset={6}
          className="z-40 rounded-md border bg-popover shadow-md py-1 min-w-[11rem]"
        >
          {children}
          <Dropdown.Arrow className="fill-popover" />
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}

export function DropdownItem({
  onSelect,
  children,
  className = "",
}: {
  onSelect?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Dropdown.Item
  onSelect={() => onSelect?.()}
      className={`px-2 py-1.5 text-xs flex items-center gap-2 hover:bg-muted/60 outline-none cursor-pointer ${className}`}
    >
      {children}
    </Dropdown.Item>
  );
}

export function DropdownSeparator() {
  return <Dropdown.Separator className="h-px bg-border my-1" />;
}
