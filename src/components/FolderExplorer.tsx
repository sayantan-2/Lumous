import { useMemo, useState, useCallback } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, Check, Search } from "lucide-react";
import { cn } from "../lib/utils";

interface FolderExplorerProps {
  folders: string[];
  selectedFolder: string;
  onFolderSelect: (folderPath: string) => void;
  includedFolders: string[];
  onFolderInclusionChange: (folderPath: string, included: boolean) => void;
  condensed?: boolean; // rail mode (no labels)
}

interface Node {
  path: string;
  name: string;
  depth: number;
  children: Node[];
  indexed: boolean;
}

export function FolderExplorer({
  folders,
  selectedFolder,
  onFolderSelect,
  includedFolders,
  onFolderInclusionChange,
  condensed = false
}: FolderExplorerProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");

  // Build folder hierarchy (lean version)
  const roots = useMemo(() => {
    if (!folders.length) return [] as Node[];
    const map = new Map<string, Node>();
    const ensure = (p: string, indexed: boolean) => {
      if (!map.has(p)) {
        const name = p.split(/[/\\]/).filter(Boolean).pop() || p;
        map.set(p, { path: p, name, depth: 0, children: [], indexed });
      } else if (indexed) {
        map.get(p)!.indexed = true;
      }
    };
    folders.forEach(f => {
      ensure(f, true);
      const parts = f.split(/[/\\]/).filter(Boolean);
      for (let i=1;i<parts.length;i++) {
        ensure(parts.slice(0,i).join('\\'), false);
      }
    });
    const roots: Node[] = [];
    map.forEach((node, path) => {
      const parts = path.split(/[/\\]/).filter(Boolean);
      if (parts.length === 1) {
        roots.push(node);
      } else {
        const parentPath = parts.slice(0,-1).join('\\');
        const parent = map.get(parentPath);
        if (parent) {
          node.depth = parent.depth + 1;
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      }
    });
    const sort = (nodes: Node[]) => {
      nodes.sort((a,b)=>a.name.localeCompare(b.name));
      nodes.forEach(n=>sort(n.children));
    };
    sort(roots);
    return roots;
  }, [folders]);

  // Auto expand path to selected
  useMemo(() => {
    if (!selectedFolder) return;
    const segs = selectedFolder.split(/[/\\]/).filter(Boolean);
    const acc: string[] = [];
    const next = new Set(expanded);
    for (let i=0;i<segs.length;i++) { acc.push(segs[i]); next.add(acc.join('\\')); }
    setExpanded(next);
  }, [selectedFolder]);

  const toggleExpand = useCallback((path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(prev => { const n = new Set(prev); n.has(path)?n.delete(path):n.add(path); return n; });
  }, []);

  const toggleInclude = useCallback((path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const included = includedFolders.includes(path);
    onFolderInclusionChange(path, !included);
  }, [includedFolders, onFolderInclusionChange]);

  const passes = (node: Node): boolean => {
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    return node.name.toLowerCase().includes(q) || node.path.toLowerCase().includes(q) || node.children.some(passes);
  };

  const render = (node: Node): JSX.Element | null => {
    if (!passes(node)) return null;
    const isSel = node.path === selectedFolder;
    const isExp = expanded.has(node.path);
    const hasKids = node.children.length > 0;
    const included = includedFolders.includes(node.path);
    const indent = node.depth * 12;
    return (
      <div key={node.path} className="select-none">
  {/* eslint-disable-next-line */}
  <div
          className={cn(
            "group flex items-center gap-1 rounded py-0.5 text-sm cursor-pointer",
            isSel && "bg-primary/10 text-primary",
            !node.indexed && "opacity-60"
          )}
          data-indent={indent}
          style={{ paddingLeft: `${indent + 4}px` }}
          onClick={() => node.indexed && onFolderSelect(node.path)}
          title={node.path}
        >
          {hasKids ? (
            <button
              onClick={(e)=>toggleExpand(node.path,e)}
              className="w-4 h-4 flex items-center justify-center text-muted-foreground hover:text-foreground"
              aria-label={isExp?"Collapse":"Expand"}
            >
              {isExp ? <ChevronDown className="w-3 h-3"/> : <ChevronRight className="w-3 h-3"/>}
            </button>
          ) : <span className="w-4 h-4" />}
          {node.indexed ? (
            <button
              onClick={(e)=>toggleInclude(node.path,e)}
              className={cn(
                "w-4 h-4 flex items-center justify-center rounded border text-[10px]",
                included ? "bg-primary border-primary text-primary-foreground" : "border-border hover:bg-muted"
              )}
              title={included?"Exclude from view":"Include in view"}
            >
              {included && <Check className="w-3 h-3"/>}
            </button>
          ) : <span className="w-4 h-4" />}
          {isSel ? <FolderOpen className="w-4 h-4 text-primary"/> : <Folder className="w-4 h-4 text-muted-foreground"/>}
          {!condensed && <span className="truncate flex-1">{node.name}</span>}
        </div>
        {hasKids && isExp && (
          <div>{node.children.map(c=>render(c))}</div>
        )}
      </div>
    );
  };

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
      <div className="max-h-72 overflow-auto pr-1 thin-scrollbar">
        {roots.map(r=>render(r))}
      </div>
    </div>
  );
}
