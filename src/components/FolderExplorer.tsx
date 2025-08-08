import { useMemo, useState, useCallback } from "react";
import { Folder, FolderOpen, Check, Search } from "lucide-react";
import { cn } from "../lib/utils";

interface FolderExplorerProps {
  folders: string[]; // full paths of indexed folders
  selectedFolder: string;
  onFolderSelect: (folderPath: string) => void;
  includedFolders: string[];
  onFolderInclusionChange: (folderPath: string, included: boolean) => void;
  condensed?: boolean; // rail mode (no labels)
}

export function FolderExplorer({
  folders,
  selectedFolder,
  onFolderSelect,
  includedFolders,
  onFolderInclusionChange,
  condensed = false
}: FolderExplorerProps) {
  const [filter, setFilter] = useState("");

  const flatList = useMemo(() => {
    const unique = Array.from(new Set(folders));
    return unique
      .map(path => ({
        path,
        name: path.split(/[/\\]/).filter(Boolean).pop() || path
      }))
      .filter(f => {
        if (!filter.trim()) return true;
        const q = filter.toLowerCase();
        return f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q);
      })
      .sort((a,b)=>a.name.localeCompare(b.name));
  }, [folders, filter]);

  const toggleInclude = useCallback((path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const included = includedFolders.includes(path);
    onFolderInclusionChange(path, !included);
  }, [includedFolders, onFolderInclusionChange]);

  if (!folders.length) return <div className="text-xs text-muted-foreground py-4 text-center">No indexed folders</div>;

  return (
    <div className="flex flex-col gap-2">
      {!condensed && (
        <div className="relative">
          <input
            value={filter}
            onChange={e=>setFilter(e.target.value)}
            placeholder="Filter folders..."
            className="w-full rounded bg-muted/50 px-6 py-1.5 text-xs outline-none focus:ring-1 ring-primary"
          />
          <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
        </div>
      )}
      <div className="max-h-72 overflow-auto pr-1 thin-scrollbar space-y-0.5">
        {flatList.map(f => {
          const isSel = f.path === selectedFolder;
            const included = includedFolders.includes(f.path);
          return (
            <div
              key={f.path}
              className={cn(
                "group flex items-center gap-1 rounded py-0.5 px-1 text-sm cursor-pointer",
                isSel && "bg-primary/10 text-primary"
              )}
              onClick={() => onFolderSelect(f.path)}
              title={f.path} // full path on hover
            >
              <button
                onClick={(e)=>toggleInclude(f.path,e)}
                className={cn(
                  "w-4 h-4 flex items-center justify-center rounded border text-[10px]",
                  included ? "bg-primary border-primary text-primary-foreground" : "border-border hover:bg-muted"
                )}
                title={included?"Exclude from view":"Include in view"}
              >
                {included && <Check className="w-3 h-3"/>}
              </button>
              {isSel ? <FolderOpen className="w-4 h-4 text-primary"/> : <Folder className="w-4 h-4 text-muted-foreground"/>}
              {!condensed && <span className="truncate flex-1" title={f.path}>{f.name}</span>}
              {condensed && <span className="sr-only">{f.name}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
