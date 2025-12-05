import { useState } from "react";
import { Plus, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "./ui/Button";
import { AlertDialog, AlertAction, AlertCancel } from "./ui/AlertDialog";
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
        multiple: true, // 1. CHANGE THIS TO TRUE
        title: "Select folder(s) to index",
      });

      // 2. UPDATE THIS LOGIC
      // The dialog can now return a single string OR an array of strings
      if (result) {
        if (Array.isArray(result)) {
          // If multiple folders selected, loop through and add each one
          result.forEach((path) => onFolderSelect(path));
        } else if (typeof result === 'string') {
          // If only one folder selected
          onFolderSelect(result);
        }
      }
    } catch (error) {
      console.error("Failed to open folder dialog:", error);
    }
  };

  const handleToggleSlim = () => onToggleSlim();
  const [resetting, setResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleReset = async () => {
    try {
      setResetting(true);
      await invoke("reset_library");
      window.location.reload();
    } catch (e) {
      console.error("Reset failed", e);
      alert("Reset failed: " + e);
    } finally {
      setResetting(false);
    }
  };

  return (
    <aside
      className={`bg-card border-r flex flex-col min-h-0 transition-[width] duration-300 ease-out ${isSlim ? 'w-18' : 'w-70'
        }`}
    >
      {/* Sidebar Header */}
      <div className="p-3 border-b flex items-center gap-2 h-14">
        {!isSlim && (
          <>
            <h2 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Library</h2>
            {isIndexing && (
              <span className="ml-2 inline-flex items-center gap-1 rounded px-2 py-0.5 bg-primary/10 text-primary text-[10px]">
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
                Syncing…
              </span>
            )}
          </>
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
              condensed={isSlim}
            />
          </div>
          {/* Filters removed as requested */}
        </nav>

        {/* Footer Section */}
        <div className="px-3 py-3 border-t space-y-3">
          {/* Dedicated Reset button at bottom */}
          <Button
            variant="ghost"
            disabled={resetting}
            onClick={() => setShowResetConfirm(true)}
            className={`w-full ${isSlim ? 'justify-center' : 'justify-start'} text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30`}
            title="Clear in-app database (does not delete actual image files)"
          >
            <Trash2 className="w-4 h-4" />
            {!isSlim && <span className="ml-2">{resetting ? 'Resetting…' : 'Reset Library'}</span>}
          </Button>
          <AlertDialog
            open={showResetConfirm}
            onOpenChange={(o) => !o && setShowResetConfirm(false)}
            title="Reset entire library?"
            description="This clears all indexed entries and thumbnails. Your original files on disk remain untouched."
            tone="danger"
          >
            <AlertCancel onClick={() => setShowResetConfirm(false)}>Cancel</AlertCancel>
            <AlertAction tone="danger" onClick={handleReset}>Reset</AlertAction>
          </AlertDialog>

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
// (Filters removed)