import { Grid, Heart, Folder, Tags, Star, Plus } from "lucide-react";
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
}

export function Sidebar({ 
  currentView, 
  onViewChange, 
  folderPath, 
  onFolderSelect, 
  isIndexing = false, 
  indexingProgress = "",
  includedFolders,
  onFolderInclusionChange
}: SidebarProps) {
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

  return (
    <aside className="w-64 bg-card border-r flex flex-col">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Current Folder
        </h2>
        <p className="mt-1 text-sm truncate" title={folderPath}>
          {getFolderName(folderPath)}
        </p>
      </div>

      <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
        <div className="space-y-1">
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
          
          <FolderTree 
            folders={indexedFolders}
            selectedFolder={folderPath}
            onFolderSelect={onFolderSelect}
            includedFolders={includedFolders}
            onFolderInclusionChange={onFolderInclusionChange}
          />
        </div>

        <div className="space-y-1">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">
            Views
          </h3>
          
          <Button
            variant={currentView === "grid" ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => onViewChange("grid")}
          >
            <Grid className="w-4 h-4 mr-2" />
            All Images
          </Button>
          
          <Button
            variant={currentView === "albums" ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => onViewChange("albums")}
          >
            <Folder className="w-4 h-4 mr-2" />
            Albums
          </Button>
        </div>

        <div className="space-y-1">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">
            Quick Filters
          </h3>
          
          <Button
            variant="ghost"
            className="w-full justify-start"
          >
            <Star className="w-4 h-4 mr-2" />
            Favorites
          </Button>
          
          <Button
            variant="ghost"
            className="w-full justify-start"
          >
            <Heart className="w-4 h-4 mr-2" />
            Recently Added
          </Button>
          
          <Button
            variant="ghost"
            className="w-full justify-start"
          >
            <Tags className="w-4 h-4 mr-2" />
            Tagged
          </Button>
        </div>
      </nav>

      <div className="p-4 border-t">
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
      </div>
    </aside>
  );
}
