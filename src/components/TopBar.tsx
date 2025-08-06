import { useState } from "react";
import { Search, FolderOpen, Settings, Grid, Heart } from "lucide-react";
import { Button } from "./ui/Button";

interface TopBarProps {
  folderPath: string;
  onFolderChange: (folderPath: string) => void;
  fileCount: number;
}

export function TopBar({ folderPath, onFolderChange, fileCount }: TopBarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSelectFolder = async () => {
    try {
      // TODO: Replace with actual Tauri dialog
      const demoPath = "C:\\Users\\Demo\\Documents";
      onFolderChange(demoPath);
    } catch (error) {
      console.error("Failed to select folder:", error);
    }
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b bg-card">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-semibold">Local Gallery</h1>
        <span className="text-sm text-muted-foreground">
          {fileCount} images
        </span>
      </div>

      <div className="flex-1 max-w-md mx-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search images..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSelectFolder}
        >
          <FolderOpen className="w-4 h-4 mr-2" />
          Change Folder
        </Button>
        
        <Button variant="ghost" size="icon">
          <Settings className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
