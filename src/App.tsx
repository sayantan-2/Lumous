import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileGrid } from "./components/FileGrid";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { invoke } from "@tauri-apps/api/core";
import type { AppSettings, FileMeta } from "./types";

function App() {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<"grid" | "albums">("grid");
  const queryClient = useQueryClient();

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

  // Load files when folder is selected
  const { 
    data: files = [], 
    isLoading: filesLoading, 
    error: filesError 
  } = useQuery({
    queryKey: ["files", selectedFolder],
    queryFn: async (): Promise<FileMeta[]> => {
      if (!selectedFolder) return [];
      console.log("Fetching files for folder:", selectedFolder);
      const result = await invoke("get_files", { offset: 0, limit: 1000 }) as FileMeta[];
      console.log("Files fetched:", result);
      return result;
    },
    enabled: !!selectedFolder,
  });

  const handleFolderSelect = async (folderPath: string) => {
    try {
      console.log("Starting to index folder:", folderPath);
      setSelectedFolder(folderPath);
      
      // Start indexing the folder
      const result = await invoke("index_folder", { root: folderPath, recursive: true });
      console.log("Indexing result:", result);
      
      // Small delay to ensure indexing is complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Invalidate and refetch the files query
      await queryClient.invalidateQueries({ queryKey: ["files", folderPath] });
      
    } catch (error) {
      console.error("Failed to index folder:", error);
      alert(`Failed to index folder: ${error}`);
    }
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
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar 
          folderPath={selectedFolder}
          onFolderChange={handleFolderSelect}
          fileCount={files.length}
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
              isLoading={filesLoading}
              thumbnailSize={settings?.thumbnailSize || 200}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
