import { useState } from "react";
import { Grid, Heart, Tags, Star, Plus, Settings, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/Button";
import { FolderExplorer } from "./FolderExplorer";
import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

interface SidebarProps {
  currentView: "grid" | "albums";
  onViewChange: (view: "grid" | "albums") => void;
  folderPath: string;
  onFolderSelect: (folderPath: string) => void;
  isIndexing?: boolean;
  indexingProgress?: string;
  includedFolders: string[];
  onFolderInclusionChange: (folderPath: string, included: boolean) => void;
  isSlim: boolean;
  onToggleSlim: () => void;
}

export function Sidebar({ 
  currentView, 
  onViewChange, 
  folderPath, 
  onFolderSelect, 
  isIndexing = false, 
  indexingProgress = "",
  includedFolders,
  onFolderInclusionChange,
  isSlim,
  onToggleSlim
}: SidebarProps) {
  // Simplified UX: explicit toggle only (no hover auto-expand)
  const shouldShowContent = !isSlim;
  
  const getFolderName = (path: string) => {
    return path.split(/[/\\]/).pop() || path;
  };

  // Load indexed folders
  const { data: indexedFolders = [] } = useQuery({
    queryKey: ["indexedFolders"],
    queryFn: async (): Promise<string[]> => {
      try {
        return await invoke("get_indexed_folders");
      } catch (error) {
        console.warn("Failed to load indexed folders:", error);
        return [];
      }
    },
    refetchInterval: 2000, // Refresh every 2 seconds to pick up new folders quickly
    staleTime: 1000, // Consider data stale after 1 second
  });

  const handleBrowseNewFolder = async () => {
    try {
      const result = await open({
        directory: true,
        multiple: false,
        title: "Select folder to index",
      });

      if (result && typeof result === 'string') {
        onFolderSelect(result);
      }
    } catch (error) {
      console.error("Failed to open folder dialog:", error);
    }
  };

  const handleToggleSlim = () => onToggleSlim();

  return (
    <aside
      className={`bg-card border-r flex flex-col min-h-0 transition-[width] duration-300 ease-out ${
        isSlim ? 'w-14' : 'w-72'
      }`}
    >
      {/* Sidebar Header */}
      <div className="p-3 border-b flex items-center gap-2">
        {!isSlim && (
          <h2 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Library</h2>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggleSlim}
          className="h-7 w-7 ml-auto"
          title={isSlim ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isSlim ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Current Folder Section */}
        {!isSlim && (
          <div className="px-3 py-2 border-b space-y-1">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Current</div>
            <div className="text-sm truncate" title={folderPath}>{getFolderName(folderPath)}</div>
          </div>
        )}

        {/* Navigation Content */}
        <nav className="flex-1 px-3 py-3 space-y-5 overflow-y-auto">
          <div className="space-y-2">
            {!isSlim && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Folders</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" title="Add folder" onClick={handleBrowseNewFolder}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            )}
            <FolderExplorer
              folders={indexedFolders}
              selectedFolder={folderPath}
              onFolderSelect={onFolderSelect}
              includedFolders={includedFolders}
              onFolderInclusionChange={onFolderInclusionChange}
              condensed={isSlim}
            />
          </div>
          <div className="space-y-2">
            {!isSlim && (
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Filters</div>
            )}
            <div className={`flex flex-col gap-1 ${isSlim ? 'items-center' : ''}`}>
              <Button variant="ghost" className={cnFilterBtn(isSlim)} title="Favorites">
                <Star className="w-4 h-4" />
                {!isSlim && <span>Favorites</span>}
              </Button>
              <Button variant="ghost" className={cnFilterBtn(isSlim)} title="Recently Added">
                <Heart className="w-4 h-4" />
                {!isSlim && <span>Recently Added</span>}
              </Button>
              <Button variant="ghost" className={cnFilterBtn(isSlim)} title="Tagged">
                <Tags className="w-4 h-4" />
                {!isSlim && <span>Tagged</span>}
              </Button>
            </div>
          </div>
        </nav>

        {/* Footer Section */}
  <div className="px-3 py-3 border-t space-y-3">
          {/* Settings Button */}
          <Button variant="ghost" className={`w-full justify-start ${isSlim ? 'p-0 h-8 flex items-center justify-center' : ''}`} title="Settings">
            <Settings className="w-4 h-4" />
            {!isSlim && <span className="ml-2">Settings</span>}
          </Button>
          
          {/* Status Info */}
          {!isSlim && (
            <div className="text-[10px] text-muted-foreground leading-relaxed">
              {isIndexing ? (
                <>
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                    <span>Indexing in progress...</span>
                  </div>
                  {indexingProgress && (
                    <p className="truncate" title={indexingProgress}>
                      {indexingProgress}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p>📁 {indexedFolders.length} folders indexed</p>
                  <p className="mt-1">Ready for browsing</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

// Local helper for different button layout in slim vs expanded
function cnFilterBtn(isSlim: boolean) {
  return isSlim ? "w-8 h-8 p-0 flex items-center justify-center" : "justify-start w-full";
}