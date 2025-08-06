import { FolderOpen, Settings } from "lucide-react";
import { Button } from "./ui/Button";
import { SearchBar } from "./SearchBar";
import { open } from '@tauri-apps/plugin-dialog';

interface TopBarProps {
  folderPath: string;
  onFolderChange: (folderPath: string) => void;
  fileCount: number;
  onSearch: (query: string) => void;
}

export function TopBar({ folderPath, onFolderChange, fileCount, onSearch }: TopBarProps) {
  const handleSelectFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Photo Folder'
      });
      
      if (selected) {
        onFolderChange(selected);
      }
    } catch (error) {
      console.error("Failed to select folder:", error);
    }
  };

  const folderName = folderPath.split(/[/\\]/).pop() || folderPath;

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b bg-card">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-semibold">Local Gallery</h1>
        <div className="flex flex-col">
          <span className="text-sm text-muted-foreground">
            {fileCount} images
          </span>
          <span className="text-xs text-muted-foreground truncate max-w-48">
            {folderName}
          </span>
        </div>
      </div>

      <div className="flex-1 max-w-md mx-4">
        <SearchBar onSearch={onSearch} />
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
