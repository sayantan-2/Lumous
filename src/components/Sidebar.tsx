import { useState } from "react";
import { Grid, Heart, Folder, Tags, Star, Plus, Settings, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/Button";
import { FolderTree } from "./FolderTree";
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
  const [isHovered, setIsHovered] = useState(false);
  const [isTogglingSlim, setIsTogglingSlim] = useState(false);
  const shouldShowContent = !isSlim || (isHovered && !isTogglingSlim);
  
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

  const handleToggleSlim = () => {
    setIsTogglingSlim(true);
    onToggleSlim();
    // Re-enable hover after a short delay
    setTimeout(() => setIsTogglingSlim(false), 300);
  };

  return (
    <aside 
      className={`bg-card border-r flex flex-col transition-all duration-300 ${
        isSlim && !isHovered ? 'w-16' : 'w-64'
      }`}
    >
      {/* Sidebar Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div 
          className="flex-1"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {shouldShowContent && (
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Navigation
            </h2>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggleSlim}
          className="h-6 w-6 flex-shrink-0"
          title={isSlim ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isSlim ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Main content area with hover */}
      <div 
        className="flex-1 flex flex-col"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Current Folder Section */}
        {shouldShowContent && (
          <div className="p-4 border-b">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Current Folder
            </h3>
            <p className="mt-1 text-sm truncate" title={folderPath}>
              {getFolderName(folderPath)}
            </p>
          </div>
        )}

        {/* Navigation Content */}
        <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Indexed Folders Section */}
        <div className="space-y-1">
          {shouldShowContent && (
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Indexed Folders
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={handleBrowseNewFolder}
                title="Add new folder"
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          )}
          
          {shouldShowContent ? (
            <FolderTree 
              folders={indexedFolders}
              selectedFolder={folderPath}
              onFolderSelect={onFolderSelect}
              includedFolders={includedFolders}
              onFolderInclusionChange={onFolderInclusionChange}
            />
          ) : (
            <div className="flex flex-col items-center space-y-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBrowseNewFolder}
                title="Add new folder"
                className="w-8 h-8"
              >
                <Plus className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title="Folders"
                className="w-8 h-8"
              >
                <Folder className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Quick Filters Section */}
        <div className="space-y-1">
          {shouldShowContent && (
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">
              Quick Filters
            </h3>
          )}
          
          <Button
            variant="ghost"
            className={shouldShowContent ? 'w-full justify-start' : 'w-8 h-8 p-0'}
            title="Favorites"
          >
            <Star className={`w-4 h-4 ${shouldShowContent ? 'mr-2' : ''}`} />
            {shouldShowContent && "Favorites"}
          </Button>
          
          <Button
            variant="ghost"
            className={shouldShowContent ? 'w-full justify-start' : 'w-8 h-8 p-0'}
            title="Recently Added"
          >
            <Heart className={`w-4 h-4 ${shouldShowContent ? 'mr-2' : ''}`} />
            {shouldShowContent && "Recently Added"}
          </Button>
          
          <Button
            variant="ghost"
            className={shouldShowContent ? 'w-full justify-start' : 'w-8 h-8 p-0'}
            title="Tagged"
          >
            <Tags className={`w-4 h-4 ${shouldShowContent ? 'mr-2' : ''}`} />
            {shouldShowContent && "Tagged"}
          </Button>
        </div>
        </nav>

        {/* Footer Section */}
        <div className="p-4 border-t space-y-3">
          {/* Settings Button */}
          <Button
            variant="ghost"
            className={shouldShowContent ? 'w-full justify-start' : 'w-8 h-8 p-0'}
            title="Settings"
          >
            <Settings className={`w-4 h-4 ${shouldShowContent ? 'mr-2' : ''}`} />
            {shouldShowContent && "Settings"}
          </Button>
          
          {/* Status Info */}
          {shouldShowContent && (
            <div className="text-xs text-muted-foreground">
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