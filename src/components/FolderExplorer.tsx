import { useEffect, useMemo, useState } from "react";
import { Folder, FolderOpen, Search, MoreVertical, Trash2, RefreshCcw } from "lucide-react";
import { DropdownMenu, DropdownItem, DropdownSeparator } from "./ui/DropdownMenu";
import { AlertDialog, AlertAction, AlertCancel } from "./ui/AlertDialog";
import { invoke } from "@tauri-apps/api/core";
import { cn, naturalCompare } from "../lib/utils";

interface FolderExplorerProps {
  folders: string[]; // full paths of indexed folders
  selectedFolder: string;
  onFolderSelect: (folderPath: string) => void;
  condensed?: boolean; // rail mode (no labels)
}

export function FolderExplorer({
  folders,
  selectedFolder,
  onFolderSelect,
  condensed = false,
}: FolderExplorerProps) {
  const [filter, setFilter] = useState("");
  const [openMenuPath, setOpenMenuPath] = useState<string | null>(null);
  const [confirmResetFor, setConfirmResetFor] = useState<string | null>(null);

  // Close menu on global click/escape
  useEffect(() => {
    if (!openMenuPath) return;
    const onDocClick = () => setOpenMenuPath(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenuPath(null);
    };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [openMenuPath]);

  const flatList = useMemo(() => {
    const unique = Array.from(new Set(folders));
    return unique
      .map((path) => ({
        path,
        name: path.split(/[/\\]/).filter(Boolean).pop() || path,
      }))
      .filter((f) => {
        if (!filter.trim()) return true;
        const q = filter.toLowerCase();
        return f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q);
      })
      .sort((a, b) => naturalCompare(a.name, b.name));
  }, [folders, filter]);

  if (!folders.length)
    return (
      <div className="text-xs text-muted-foreground py-4 text-center">No indexed folders</div>
    );

  return (
    <div className="flex flex-col gap-2">
      {!condensed && (
        <div className="relative">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter folders..."
            className="w-full rounded bg-muted/50 px-6 py-1.5 text-xs outline-none focus:ring-1 ring-primary"
          />
          <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
        </div>
      )}
      <div className="max-h-72 overflow-y-auto overflow-x-hidden pr-1 thin-scrollbar space-y-0.5">
        {flatList.map((f) => {
          const isSel = f.path === selectedFolder;
          return (
            <div
              key={f.path}
              className={cn(
                "group relative flex items-center gap-1 rounded py-0.5 px-1 text-sm cursor-pointer whitespace-nowrap",
                isSel && "bg-primary/10 text-primary"
              )}
              onClick={() => onFolderSelect(f.path)}
              title={f.path}
            >
              {isSel ? (
                <FolderOpen className="w-4 h-4 text-primary" />
              ) : (
                <Folder className="w-4 h-4 text-muted-foreground" />
              )}
              {!condensed && (
                <span className="truncate flex-1" title={f.path}>
                  {f.name}
                </span>
              )}
              {condensed && <span className="sr-only">{f.name}</span>}
              <DropdownMenu
                trigger={
                  <button
                    className={cn(
                      "ml-auto p-1 rounded hover:bg-muted/70",
                      condensed ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}
                    title="Folder actions"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <MoreVertical className="w-4 h-4 text-muted-foreground" />
                  </button>
                }
              >
                <DropdownItem
                  onSelect={async () => {
                    invoke("index_folder_streaming", { root: f.path, recursive: false }).catch((err)=>{
                      console.error("Failed to re-index folder", err);
                      alert("Failed to re-index folder: " + err);
                    });
                  }}
                >
                  <RefreshCcw className="w-4 h-4" />
                  <span>Re-index</span>
                </DropdownItem>
                <DropdownSeparator />
                <DropdownItem onSelect={() => setConfirmResetFor(f.path)}>
                  <Trash2 className="w-4 h-4 text-red-600" />
                  <span className="text-red-600">Reset folder</span>
                </DropdownItem>
              </DropdownMenu>
              <AlertDialog
                open={confirmResetFor === f.path}
                onOpenChange={(o) => !o && setConfirmResetFor(null)}
                title="Reset folder?"
                description={`This clears the in-app index and thumbnails for "${f.name}". Your files on disk stay intact.`}
              >
                <AlertCancel onClick={() => setConfirmResetFor(null)}>Cancel</AlertCancel>
                <AlertAction
                  onClick={async () => {
                    try {
                      await invoke("reset_folder", { folderPath: f.path });
                      setConfirmResetFor(null);
                      if (selectedFolder === f.path) {
                        window.location.reload();
                      }
                    } catch (err) {
                      console.error("Failed to reset folder", err);
                      alert("Failed to reset folder: " + err);
                    }
                  }}
                  tone="danger"
                >
                  Reset
                </AlertAction>
              </AlertDialog>
            </div>
          );
        })}
      </div>
    </div>
  );
}
