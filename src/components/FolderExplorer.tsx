import { useMemo, useState } from "react";
import { Folder, FolderOpen, Search } from "lucide-react";
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
  // Natural sort so that e.g. "Folder2" comes before "Folder10"
  .sort((a,b)=>naturalCompare(a.name, b.name));
  }, [folders, filter]);

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
          return (
            <div
              key={f.path}
              className={cn(
                "group flex items-center gap-1 rounded py-0.5 px-1 text-sm cursor-pointer",
                isSel && "bg-primary/10 text-primary"
              )}
              onClick={() => onFolderSelect(f.path)}
              title={f.path}
            >
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
