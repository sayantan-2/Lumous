import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, Folder, FolderOpen, Check } from "lucide-react";
import { Button } from "./ui/Button";
import { cn } from "../lib/utils";

interface FolderNode {
  path: string;
  name: string;
  children: FolderNode[];
  depth: number;
  isIndexed: boolean; // Whether this folder is actually indexed or just a parent
}

interface FolderTreeProps {
  folders: string[];
  selectedFolder: string;
  onFolderSelect: (folderPath: string) => void;
  includedFolders: string[];
  onFolderInclusionChange: (folderPath: string, included: boolean) => void;
}

export function FolderTree({ 
  folders, 
  selectedFolder, 
  onFolderSelect, 
  includedFolders, 
  onFolderInclusionChange 
}: FolderTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Auto-expand parent folders when folders change
  useMemo(() => {
    const newExpanded = new Set(expandedFolders);
    
    folders.forEach(folderPath => {
      // Auto-expand all parent folders for this folder
      folders.forEach(potentialParent => {
        if (potentialParent !== folderPath) {
          const normalizedCurrent = folderPath.replace(/\\/g, '/').toLowerCase();
          const normalizedParent = potentialParent.replace(/\\/g, '/').toLowerCase();
          
          if (normalizedCurrent.startsWith(normalizedParent + '/')) {
            newExpanded.add(potentialParent);
          }
        }
      });
    });
    
    setExpandedFolders(newExpanded);
  }, [folders]);

  // Build folder tree - Include ALL parent folders, not just indexed ones
  const folderTree = useMemo(() => {
    if (folders.length === 0) return [];

    console.log("Building tree from indexed folders:", folders);

    const allPaths = new Set<string>();
    const nodeMap = new Map<string, FolderNode>();
    
    // Add all indexed folders
    folders.forEach(folder => allPaths.add(folder));
    
    // Add ALL parent folders to show complete hierarchy
    folders.forEach(folder => {
      const parts = folder.split(/[/\\]/).filter(Boolean);
      for (let i = 1; i < parts.length; i++) {
        const parentPath = parts.slice(0, i).join('\\');
        allPaths.add(parentPath);
      }
    });

    console.log("All paths including parents:", Array.from(allPaths));

    // Create nodes for all paths
    Array.from(allPaths).forEach(folderPath => {
      const parts = folderPath.split(/[/\\]/).filter(Boolean);
      const name = parts[parts.length - 1] || folderPath;
      
      nodeMap.set(folderPath, {
        path: folderPath,
        name: name,
        children: [],
        depth: 0,
        isIndexed: folders.includes(folderPath)
      });
    });

    // Build parent-child relationships
    const rootNodes: FolderNode[] = [];
    
    nodeMap.forEach((node, folderPath) => {
      const parts = folderPath.split(/[/\\]/).filter(Boolean);
      
      if (parts.length === 1) {
        // Root level folder
        rootNodes.push(node);
      } else {
        // Find direct parent
        const parentPath = parts.slice(0, -1).join('\\');
        const parentNode = nodeMap.get(parentPath);
        
        if (parentNode) {
          node.depth = parentNode.depth + 1;
          parentNode.children.push(node);
          console.log(`${folderPath} is child of ${parentPath}`);
        } else {
          // Fallback: add to root
          rootNodes.push(node);
          console.log(`${folderPath} is root node (parent not found)`);
        }
      }
    });

    // Sort children at each level
    const sortChildren = (nodes: FolderNode[]) => {
      nodes.sort((a, b) => a.name.localeCompare(b.name));
      nodes.forEach(node => sortChildren(node.children));
    };
    
    sortChildren(rootNodes);
    console.log("Final tree structure:", rootNodes);
    
    return rootNodes;
  }, [folders]);

  const toggleFolder = (folderPath: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  const handleInclusionToggle = (folderPath: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const isCurrentlyIncluded = includedFolders.includes(folderPath);
    onFolderInclusionChange(folderPath, !isCurrentlyIncluded);
  };

  const renderFolderNode = (node: FolderNode) => {
    const isSelected = node.path === selectedFolder;
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedFolders.has(node.path);
    const isIncluded = includedFolders.includes(node.path);
    const { isIndexed } = node;

    const paddingClass = node.depth === 0 ? "pl-2" : 
                        node.depth === 1 ? "pl-6" : 
                        node.depth === 2 ? "pl-10" : 
                        node.depth === 3 ? "pl-14" : "pl-16";

    return (
      <div key={node.path}>
        <div 
          className={cn(
            "flex items-center w-full text-left p-1 h-auto hover:bg-muted/50 rounded",
            isSelected && "bg-secondary",
            !isIndexed && "opacity-60", // Dim non-indexed (parent-only) folders
            paddingClass
          )}
        >
          
          {/* Expand/Collapse Button */}
          {hasChildren ? (
            <button
              className="flex items-center justify-center w-4 h-4 mr-1 hover:bg-muted rounded flex-shrink-0"
              onClick={(e) => toggleFolder(node.path, e)}
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
          ) : (
            <div className="w-5 flex-shrink-0" />
          )}

          {/* Inclusion Checkbox - Only for indexed folders */}
          {isIndexed ? (
            <button
              className={cn(
                "flex items-center justify-center w-4 h-4 mr-2 border rounded flex-shrink-0",
                isIncluded 
                  ? "bg-primary border-primary text-primary-foreground" 
                  : "border-muted-foreground/30 hover:border-muted-foreground/50"
              )}
              onClick={(e) => handleInclusionToggle(node.path, e)}
              title={isIncluded ? "Exclude from view" : "Include in view"}
            >
              {isIncluded && <Check className="w-3 h-3" />}
            </button>
          ) : (
            <div className="w-6 flex-shrink-0" />
          )}

          {/* Folder Icon and Name */}
          <Button
            variant="ghost"
            className="flex items-center flex-1 justify-start p-0 h-auto min-h-0"
            onClick={() => isIndexed ? onFolderSelect(node.path) : undefined}
            disabled={!isIndexed}
          >
            {isSelected ? (
              <FolderOpen className="w-4 h-4 mr-2 flex-shrink-0" />
            ) : (
              <Folder className="w-4 h-4 mr-2 flex-shrink-0" />
            )}
            
            <span className={cn(
              "truncate text-sm",
              !isIndexed && "text-muted-foreground"
            )} title={node.path}>
              {node.name}
            </span>
          </Button>
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {node.children.map(child => renderFolderNode(child))}
          </div>
        )}
      </div>
    );
  };

  if (folders.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        No indexed folders yet.<br />
        Select a folder to get started.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {folderTree.map(node => renderFolderNode(node))}
    </div>
  );
}
