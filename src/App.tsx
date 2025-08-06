import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileGrid } from "./components/FileGrid";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { AppSettings, FileMeta } from "./types";

function App() {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<"grid" | "albums">("grid");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexingProgress, setIndexingProgress] = useState<string>("");
  const [includedFolders, setIncludedFolders] = useState<string[]>([]);
  const queryClient = useQueryClient();

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

      // Listen for indexing completed
      const completedUnlisten = await listen('indexing-completed', (event) => {
        setIsIndexing(false);
        setIndexingProgress('');
        // Refresh indexed folders and current folder files
        queryClient.invalidateQueries({ queryKey: ["indexedFolders"] });
        if (selectedFolder) {
          queryClient.invalidateQueries({ queryKey: ["files", selectedFolder] });
        }
      });

      // Listen for individual file indexed (for real-time updates)
      const fileIndexedUnlisten = await listen('file-indexed', (event) => {
        const file = event.payload as FileMeta;
        // Update the current query cache if we're viewing the same folder
        if (selectedFolder && file.path.startsWith(selectedFolder)) {
          queryClient.setQueryData(["files", selectedFolder], (oldData: FileMeta[] | undefined) => {
            if (!oldData) return [file];
            // Add file if not already present
            const exists = oldData.some(f => f.id === file.id);
            return exists ? oldData : [...oldData, file];
          });
        }
      });

      return () => {
        progressUnlisten();
        startedUnlisten();
        completedUnlisten();
        fileIndexedUnlisten();
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
          theme: "system",
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
    queryKey: ["files", includedFolders],
    queryFn: async (): Promise<FileMeta[]> => {
      if (includedFolders.length === 0) {
        console.log("No folders included, returning empty array");
        return [];
      }
      
      console.log("Loading files for ONLY these included folders:", includedFolders);
      
      // Get files from ONLY the included folders - NO RECURSION
      const folderFilesPromises = includedFolders.map(async (folder) => {
        try {
          console.log(`Fetching files from EXACT folder: ${folder}`);
          const files = await invoke("get_files", { 
            folderPath: folder,
            offset: 0, 
            limit: 1000 
          }) as FileMeta[];
          
          // Double-check: only include files that belong EXACTLY to this folder
          const exactFiles = files.filter(file => {
            const fileFolder = file.path.substring(0, file.path.lastIndexOf('\\') || file.path.lastIndexOf('/'));
            const belongsToExactFolder = fileFolder.toLowerCase() === folder.toLowerCase();
            if (!belongsToExactFolder) {
              console.warn(`File ${file.path} filtered out - belongs to ${fileFolder}, not ${folder}`);
            }
            return belongsToExactFolder;
          });
          
          console.log(`Found ${files.length} total files, ${exactFiles.length} exact files in ${folder}`);
          return exactFiles;
        } catch (error) {
          console.warn(`Failed to load files from ${folder}:`, error);
          return [] as FileMeta[];
        }
      });
      
      const allFolderFiles = await Promise.all(folderFilesPromises);
      const flattenedFiles = allFolderFiles.flat();
      
      // Remove duplicates based on file path
      const uniqueFiles = flattenedFiles.filter((file, index, self) => 
        index === self.findIndex(f => f.path === file.path)
      );
      
      console.log(`Total unique files from ${includedFolders.length} folders: ${uniqueFiles.length}`);
      return uniqueFiles;
    },
    enabled: includedFolders.length > 0,
  });

  // Filter files based on search query
  const files = allFiles.filter(file => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      file.name.toLowerCase().includes(query) ||
      file.path.toLowerCase().includes(query) ||
      file.file_type.toLowerCase().includes(query)
    );
  });

  const handleFolderInclusionChange = (folderPath: string, included: boolean) => {
    setIncludedFolders(prev => {
      if (included && !prev.includes(folderPath)) {
        return [...prev, folderPath];
      } else if (!included && prev.includes(folderPath)) {
        return prev.filter(f => f !== folderPath);
      }
      return prev;
    });
  };

  const handleFolderSelect = async (folderPath: string) => {
    try {
      console.log("Selecting folder:", folderPath);
      
      // Clear search query
      setSearchQuery("");
      
      // Set new folder immediately to show it in UI
      setSelectedFolder(folderPath);
      
      // Check if folder is already indexed
      const isAlreadyIndexed = await invoke("is_folder_indexed", { folderPath: folderPath });
      
      if (isAlreadyIndexed) {
        console.log("Folder already indexed");
        setIndexingProgress("Folder already indexed");
        
        // Don't auto-include - let user decide with checkbox
        setTimeout(() => setIndexingProgress(""), 1000);
        return;
      }
      
      // Start streaming indexing process
      console.log("Starting streaming indexing...");
      const result = await invoke("index_folder_streaming", { 
        root: folderPath, 
        recursive: true 
      });
      console.log("Streaming indexing completed:", result);
      
      // Auto-include newly indexed folder only
      if (!includedFolders.includes(folderPath)) {
        setIncludedFolders(prev => [...prev, folderPath]);
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
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        folderPath={selectedFolder}
        onFolderSelect={handleFolderSelect}
        isIndexing={isIndexing}
        indexingProgress={indexingProgress}
        includedFolders={includedFolders}
        onFolderInclusionChange={handleFolderInclusionChange}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          folderPath={selectedFolder}
          onFolderChange={handleFolderSelect}
          fileCount={files.length}
          onSearch={handleSearch}
        />

        <main className="flex-1 overflow-hidden">
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
              isLoading={filesLoading || isIndexing}
              thumbnailSize={settings?.thumbnailSize || 200}
              loadingMessage={indexingProgress || (filesLoading ? "Loading images..." : "")}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
