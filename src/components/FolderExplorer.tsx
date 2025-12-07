import { useEffect, useMemo, useState } from "react";
import {
  Folder,
  FolderOpen,
  MoreVertical,
  Trash2,
  RefreshCcw,
  Eye,
  ChevronRight,
  ChevronDown
} from "lucide-react";
import { DropdownMenu, DropdownItem, DropdownSeparator } from "./ui/DropdownMenu";
import { AlertDialog, AlertAction, AlertCancel } from "./ui/AlertDialog";
import { invoke } from "@tauri-apps/api/core";
import { cn, naturalCompare } from "../lib/utils";

// --- Types ---
interface TreeNode {
  path: string; // The full system path (unique ID)
  name: string; // Display name (segment)
  children: TreeNode[];
  isVirtual: boolean; // True if inferred from hierarchy, false if actually indexed
}

interface FolderExplorerProps {
  folders: string[];
  selectedFolder: string;
  onFolderSelect: (folderPath: string) => void;
  condensed?: boolean;
  collapseAllToken?: number;
}

// --- Logic ---

// 1. Find the longest common directory prefix of all paths
function getCommonBase(paths: string[]): string {
  if (paths.length === 0) return "";
  if (paths.length === 1) {
    return "";
  }

  // Normalize separators
  const normPaths = paths.map(p => p.replace(/\\/g, "/"));
  const sorted = [...normPaths].sort();
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  let i = 0;
  while (i < first.length && first.charAt(i) === last.charAt(i)) {
    i++;
  }

  let prefix = first.substring(0, i);

  // Backtrack to last slash to ensure valid folder path
  if (prefix.lastIndexOf("/") !== -1) {
    prefix = prefix.substring(0, prefix.lastIndexOf("/"));
  }

  return prefix;
}

// 2. Build Tree relative to the Common Base
function buildAncestryTree(paths: string[]): TreeNode[] {
  if (!paths.length) return [];

  const cleanPaths = [...new Set(paths)].map(p => {
    const raw = p.startsWith("\\\\?\\") ? p.slice(4) : p;
    return { original: p, normalized: raw.replace(/\\/g, "/") };
  });

  const normalizedStrings = cleanPaths.map(x => x.normalized);
  const commonBase = getCommonBase(normalizedStrings);
  const commonBaseLen = commonBase.length > 0 ? commonBase.length + 1 : 0;

  const nodeMap = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  cleanPaths.sort((a, b) => a.normalized.length - b.normalized.length);

  cleanPaths.forEach(item => {
    const relative = item.normalized.substring(commonBaseLen);
    if (!relative) return;

    const segments = relative.split("/");
    let currentPath = commonBase;
    let parentNode: TreeNode | undefined;

    segments.forEach((segment, idx) => {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      const nodeKey = currentPath.toLowerCase();
      let node = nodeMap.get(nodeKey);

      if (!node) {
        const isLastSegment = idx === segments.length - 1;

        node = {
          path: isLastSegment ? item.original : currentPath,
          name: segment,
          children: [],
          isVirtual: !isLastSegment
        };

        nodeMap.set(nodeKey, node);

        if (parentNode) {
          parentNode.children.push(node);
        } else {
          roots.push(node);
        }
      } else {
        if (idx === segments.length - 1) {
          node.isVirtual = false;
          node.path = item.original;
        }
      }

      parentNode = node;
    });
  });

  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => naturalCompare(a.name, b.name));
    nodes.forEach(n => sortNodes(n.children));
  };
  sortNodes(roots);

  return roots;
}

export function FolderExplorer({
  folders,
  selectedFolder,
  onFolderSelect,
  condensed = false,
  collapseAllToken,
}: FolderExplorerProps) {
  const treeRoots = useMemo(() => buildAncestryTree(folders), [folders]);

  if (!folders.length)
    return (
      <div className="text-xs text-muted-foreground py-4 text-center">No indexed folders</div>
    );

  return (
    <div className="flex flex-col min-h-0 select-none">
      <div className="overflow-x-hidden pr-1 thin-scrollbar">
        {treeRoots.map((node) => (
          <FolderTreeItem
            key={node.path}
            node={node}
            selectedFolder={selectedFolder}
            onSelect={onFolderSelect}
            depth={0}
            condensed={condensed}
            collapseAllToken={collapseAllToken}
          />
        ))}
      </div>
    </div>
  );
}

// --- Recursive Tree Item Component ---
interface TreeItemProps {
  node: TreeNode;
  selectedFolder: string;
  onSelect: (path: string) => void;
  depth: number;
  condensed: boolean;
  collapseAllToken?: number;
}

function FolderTreeItem({ node, selectedFolder, onSelect, depth, condensed, collapseAllToken }: TreeItemProps) {
  const isSelected = !node.isVirtual && node.path.toLowerCase() === selectedFolder.toLowerCase();

  const hasSelectedChild = selectedFolder.toLowerCase().startsWith(node.path.toLowerCase()) &&
    selectedFolder.toLowerCase() !== node.path.toLowerCase();

  // FIX 1: Default state is now FALSE (collapsed), ignoring virtual status.
  const [isOpen, setIsOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // Auto-expand only if a child is actively selected
  useEffect(() => {
    if (hasSelectedChild) setIsOpen(true);
  }, [hasSelectedChild]);

  // Collapse all when token changes
  useEffect(() => {
    if (typeof collapseAllToken !== "undefined") {
      setIsOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapseAllToken]);

  const hasChildren = node.children.length > 0;

  if (condensed && depth > 0) return null;

  return (
    <div className="flex flex-col">
      <div
        className={cn(
          // FIX 2: Unified styling. Removed "text-muted-foreground" condition for virtual nodes.
          "group flex items-center gap-1.5 py-1 px-2 text-sm rounded-sm transition-colors border-l-2 border-transparent",
          "cursor-pointer hover:bg-muted/50 hover:text-foreground", // Applied to ALL nodes now
          isSelected
            ? "bg-primary/10 text-primary font-medium border-l-primary"
            : "text-foreground" // Ensure text is "lit" (bright) when not selected
        )}
        style={{ paddingLeft: condensed ? undefined : `${depth * 16 + 4}px` }}
        onClick={() => {
          // Both virtual and real nodes now toggle expansion on click (unless it's a leaf selection)
          if (node.isVirtual || hasChildren) {
            setIsOpen(!isOpen);
          }
          if (!node.isVirtual) {
            onSelect(node.path);
          }
        }}
        title={node.path}
      >
        {/* Toggle Arrow */}
        {!condensed && (
          <span
            className={cn(
              "flex items-center justify-center w-4 h-4 rounded-sm hover:bg-black/5 dark:hover:bg-white/10 shrink-0 cursor-pointer",
              !hasChildren && "invisible"
            )}
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
          >
            {isOpen ? <ChevronDown className="w-3.5 h-3.5 opacity-70" /> : <ChevronRight className="w-3.5 h-3.5 opacity-70" />}
          </span>
        )}

        {/* Folder Icon */}
        <div className={cn("shrink-0", condensed && "mx-auto")}>
          {node.isVirtual ? (
            // Removed opacity-50 from icon to make it brighter
            <Folder className="w-4 h-4 text-foreground/70" />
          ) : (
            isSelected || (isOpen && hasChildren) ? (
              <FolderOpen className={cn("w-4 h-4", isSelected ? "text-primary" : "text-foreground")} />
            ) : (
              <Folder className="w-4 h-4" />
            )
          )}
        </div>

        {/* Name Label */}
        {!condensed && (
          <span className={cn(
            "truncate flex-1 leading-none pt-0.5 select-none",
            // FIX 3: Removed opacity-70 from virtual nodes so text is bright/lit
            node.isVirtual && "font-medium"
          )}>
            {node.name}
          </span>
        )}

        {/* Actions Menu (Real Folders Only) */}
        {!node.isVirtual && (
          <div className={cn("ml-auto flex items-center", condensed && "hidden")}>
            <DropdownMenu
              trigger={
                <button
                  className="p-0.5 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-background shadow-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              }
            >
              <DropdownItem onSelect={() => invoke("index_folder_streaming", { root: node.path, recursive: false })}>
                <RefreshCcw className="w-4 h-4" />
                <span>Re-index</span>
              </DropdownItem>
              <DropdownItem onSelect={() => { invoke("watch_folder", { folderPath: node.path }).catch(() => { }); }}>
                <Eye className="w-4 h-4" />
                <span>Watch folder</span>
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem onSelect={() => setConfirmReset(true)}>
                <Trash2 className="w-4 h-4 text-red-600" />
                <span className="text-red-600">Reset folder</span>
              </DropdownItem>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Children Recursion */}
      {!condensed && isOpen && hasChildren && (
        <div className="flex flex-col border-l border-border/30 ml-[calc(16px+10px)]">
          {node.children.map((child) => (
            <div key={child.path} className="-ml-[calc(16px+10px)]">
              <FolderTreeItem
                node={child}
                selectedFolder={selectedFolder}
                onSelect={onSelect}
                depth={depth + 1}
                condensed={condensed}
                collapseAllToken={collapseAllToken}
              />
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset folder?"
        description={`This clears index data for "${node.name}". Files on disk are safe.`}
        tone="danger"
      >
        <AlertCancel onClick={() => setConfirmReset(false)}>Cancel</AlertCancel>
        <AlertAction
          tone="danger"
          onClick={async () => {
            await invoke("reset_folder", { folderPath: node.path });
            setConfirmReset(false);
            if (selectedFolder === node.path) window.location.reload();
          }}
        >
          Reset
        </AlertAction>
      </AlertDialog>
    </div>
  );
}