import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileGrid } from "./components/FileGrid";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { AppSettings, FileMeta } from "./types";
import { naturalSortFiles } from "./lib/utils";
import { ToastProvider, AppToast } from "./components/ui/Toast";

function App() {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<"grid" | "albums">("grid");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexingProgress, setIndexingProgress] = useState<string>("");
  // Removed includedFolders concept; we now show only the selected folder
  const [isSidebarSlim, setIsSidebarSlim] = useState(false);
  const [sortKey, setSortKey] = useState<'name'|'date'|'size'>('name');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc');
  const queryClient = useQueryClient();
  const [toastOpen, setToastOpen] = useState(false);
  const [toastTitle, setToastTitle] = useState("");
  const [toastDesc, setToastDesc] = useState<string | undefined>(undefined);

  // Restore full library state (last selected + included folders) once on mount
  useEffect(() => {
    (async () => {
      try {
        const state = await invoke<{
          last_selected_folder: string | null;
          indexed_folders: string[];
        }>("get_library_state");

        if (state.indexed_folders?.length) {
          const toSelect = state.last_selected_folder && state.indexed_folders.includes(state.last_selected_folder)
            ? state.last_selected_folder
            : state.indexed_folders[0];
          setSelectedFolder(toSelect || null);
        }
      } catch (e) {
        console.warn("Failed to load library state", e);
      }
    })();
  }, []);

  // Listen for indexing events
  useEffect(() => {
    const setupEventListeners = async () => {
      // Listen for indexing progress
      const progressUnlisten = await listen('indexing-progress', (event) => {
        setIndexingProgress(event.payload as string);
      });

      // Listen for indexing started
      const startedUnlisten = await listen('indexing-started', (event) => {
        setIsIndexing(true);
        setIndexingProgress('Starting indexing...');
      });

      // Listen for indexing completed (compat)
      const completedUnlisten = await listen('indexing-completed', (event) => {
        setIsIndexing(false);
        setIndexingProgress('');
        // Refresh indexed folders and current folder files
        queryClient.invalidateQueries({ queryKey: ["indexedFolders"] });
        if (selectedFolder) {
          queryClient.invalidateQueries({ queryKey: ["files", selectedFolder] });
        }
        setToastTitle("Sync complete");
        setToastDesc(undefined);
        setToastOpen(true);
      });

      // New summary event with change counts
      const completedSummaryUnlisten = await listen('indexing-completed-summary', (event) => {
        setIsIndexing(false);
        setIndexingProgress('');
        const payload = event.payload as { root: string; total: number; upserted: number; deleted: number; unchanged: number };
        // Only invalidate queries if there were changes
        if ((payload.upserted ?? 0) > 0 || (payload.deleted ?? 0) > 0) {
          queryClient.invalidateQueries({ queryKey: ["indexedFolders"] });
          if (selectedFolder && payload.root && selectedFolder.toLowerCase() === payload.root.toLowerCase()) {
            queryClient.invalidateQueries({ queryKey: ["files", selectedFolder] });
          }
        }
        setToastTitle("Sync complete");
        setToastDesc(`${payload.upserted} updated • ${payload.deleted} removed`);
        setToastOpen(true);
      });

      // Listen for individual file indexed (for real-time updates)
      const fileIndexedUnlisten = await listen('file-indexed', (event) => {
        const file = event.payload as FileMeta;
        if (selectedFolder && file.path.toLowerCase().startsWith(selectedFolder.toLowerCase())) {
          queryClient.setQueryData(["files", selectedFolder], (oldData: FileMeta[] | undefined) => {
            if (!oldData) return [file];
            const norm = (p: string) => p.toLowerCase();
            const exists = oldData.some(f => norm(f.path) === norm(file.path));
            return exists ? oldData : [...oldData, file];
          });
        }
      });

      // Batched file-indexed event to reduce churn
      const batchUnlisten = await listen('files-indexed-batch', (event) => {
        const batch = event.payload as FileMeta[];
        if (!Array.isArray(batch) || batch.length === 0) return;
        if (selectedFolder) {
          const folderLc = selectedFolder.toLowerCase();
          const forThisFolder = batch.filter(f => f.path.toLowerCase().startsWith(folderLc));
          if (forThisFolder.length === 0) return;
          queryClient.setQueryData(["files", selectedFolder], (oldData: FileMeta[] | undefined) => {
            const norm = (p: string) => p.toLowerCase();
            const map = new Map<string, FileMeta>();
            if (oldData) {
              for (const f of oldData) map.set(norm(f.path), f);
            }
            for (const f of forThisFolder) map.set(norm(f.path), f);
            return Array.from(map.values());
          });
        }
      });

      // Optional: handle file-updated for late thumbnail availability
      const updatedUnlisten = await listen('file-updated', (event) => {
        const updated = event.payload as FileMeta;
        if (!updated) return;
        if (selectedFolder) {
          const folderLc = selectedFolder.toLowerCase();
          if (!updated.path.toLowerCase().startsWith(folderLc)) return;
          queryClient.setQueryData(["files", selectedFolder], (oldData: FileMeta[] | undefined) => {
            if (!oldData) return [updated];
            const norm = (p: string) => p.toLowerCase();
            const idx = oldData.findIndex(f => norm(f.path) === norm(updated.path));
            if (idx === -1) return [...oldData, updated];
            const copy = oldData.slice();
            copy[idx] = updated;
            return copy;
          });
        }
      });

      return () => {
        progressUnlisten();
        startedUnlisten();
        completedUnlisten();
        completedSummaryUnlisten();
  fileIndexedUnlisten();
  batchUnlisten();
  updatedUnlisten();
      };
    };

    setupEventListeners();
  }, [queryClient, selectedFolder]);

  // Load app settings
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async (): Promise<AppSettings> => {
      try {
        return await invoke("get_settings");
      } catch (error) {
        console.warn("No settings found, using defaults:", error);
        return {
          theme: "dark",
          thumbnailSize: 200,
          defaultFolder: null,
          cacheLocation: null,
        };
      }
    },
  });

  // Load files from included folders when selection changes
  const {
    data: allFiles = [],
    isLoading: filesLoading,
    error: filesError
  } = useQuery({
    queryKey: ["files", selectedFolder],
    queryFn: async (): Promise<FileMeta[]> => {
      if (!selectedFolder) return [];
      try {
        const files = await invoke("get_files", {
          folderPath: selectedFolder,
          offset: 0,
          limit: 2000
        }) as FileMeta[];
        return files;
      } catch (error) {
        console.warn("Failed to load files for folder", selectedFolder, error);
        return [];
      }
    },
    enabled: !!selectedFolder,
  });

  // Filter files based on search query
  const filtered = allFiles.filter(file => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      file.name.toLowerCase().includes(query) ||
      file.path.toLowerCase().includes(query) ||
      file.file_type.toLowerCase().includes(query)
    );
  });
  // Sort according to sortKey/sortDir
  const files = useMemo(()=> {
    let base: FileMeta[];
    if (sortKey === 'name') {
      base = naturalSortFiles(filtered);
    } else if (sortKey === 'date') {
      base = [...filtered].sort((a,b)=> (new Date(a.modified).getTime() - new Date(b.modified).getTime()));
    } else { // size
      base = [...filtered].sort((a,b)=> a.size - b.size);
    }
    if (sortDir === 'desc') base.reverse();
    return base;
  }, [filtered, sortKey, sortDir]);

  const handleFolderSelect = async (folderPath: string) => {
    try {
      console.log("Selecting folder:", folderPath);

      // Clear search query
      setSearchQuery("");

      // Set new folder immediately to show it in UI
      setSelectedFolder(folderPath);
  invoke("update_last_selected_folder", { folder: folderPath }).catch(() => {});

      // Check if folder is already indexed
      const isAlreadyIndexed = await invoke("is_folder_indexed", { folderPath: folderPath });
      if (!isAlreadyIndexed) {
        // Fire-and-forget streaming indexing process; UI stays responsive
        console.log("Starting streaming indexing (background)...");
        invoke("index_folder_streaming", { root: folderPath, recursive: false }).catch((e)=>{
          console.error("Indexing failed to start", e);
        });
      }

    } catch (error) {
      console.error("Failed to process folder:", error);
      setIsIndexing(false);
      setIndexingProgress("");
      alert(`Failed to process folder: ${error}`);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  if (!selectedFolder) {
    return (
      <WelcomeScreen
        onFolderSelect={handleFolderSelect}
        defaultFolder={settings?.defaultFolder}
      />
    );
  }

  return (
  <ToastProvider>
  <div className="flex h-screen bg-background text-foreground">
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        folderPath={selectedFolder}
        onFolderSelect={handleFolderSelect}
        isIndexing={isIndexing}
        indexingProgress={indexingProgress}
        isSlim={isSidebarSlim}
        onToggleSlim={() => setIsSidebarSlim(!isSidebarSlim)}
      />

  <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <TopBar
          folderPath={selectedFolder}
          onFolderChange={handleFolderSelect}
          fileCount={files.length}
          onSearch={handleSearch}
          sortKey={sortKey}
          sortDir={sortDir}
          onChangeSortKey={setSortKey}
          onChangeSortDir={() => setSortDir(d=> d==='asc'?'desc':'asc')}
        />

  <main className="flex-1 overflow-hidden min-h-0 flex">
          {filesError ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">Error loading files</h2>
                <p className="text-muted-foreground">
                  {filesError instanceof Error ? filesError.message : "Unknown error"}
                </p>
              </div>
            </div>
          ) : (
            <FileGrid
              files={files}
              isLoading={filesLoading}
              thumbnailSize={settings?.thumbnailSize || 200}
              loadingMessage={filesLoading ? "Loading images..." : ""}
              isSidebarSlim={isSidebarSlim}
            />
          )}
        </main>
      </div>
  </div>
  <AppToast title={toastTitle} description={toastDesc} open={toastOpen} onOpenChange={setToastOpen} />
  </ToastProvider>
  );
}

export default App;
