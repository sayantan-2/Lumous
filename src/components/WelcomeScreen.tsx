import { useState } from "react";
import { Button } from "./ui/Button";
import { FolderOpen, Settings, Image } from "lucide-react";
import { open } from '@tauri-apps/plugin-dialog';

interface WelcomeScreenProps {
  onFolderSelect: (folderPath: string) => void;
  defaultFolder?: string | null;
}

export function WelcomeScreen({ onFolderSelect, defaultFolder }: WelcomeScreenProps) {
  const [isSelecting, setIsSelecting] = useState(false);

  const handleSelectFolder = async () => {
    setIsSelecting(true);
    try {
      console.log('Opening folder dialog...');
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Photo Folder'
      });
      
      console.log('Dialog result:', selected);
      
      if (selected) {
        console.log('Selected folder:', selected);
        onFolderSelect(selected);
      } else {
        console.log('No folder selected or dialog was cancelled');
      }
    } catch (error) {
      console.error("Failed to select folder:", error);
      // Add alert for debugging
      alert(`Error: ${error}`);
    } finally {
      setIsSelecting(false);
    }
  };

  const handleOpenDefault = () => {
    if (defaultFolder) {
      onFolderSelect(defaultFolder);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted p-8">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-full bg-primary">
              <Image className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold">Local Gallery</h1>
          </div>
        </div>

        {/* Welcome message */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">
            Welcome to Local Gallery
          </h2>
          <p className="text-muted-foreground">
            A lightning-fast photo gallery that keeps your images organized and easily accessible.
            Get started by selecting a folder to index.
          </p>
        </div>

        {/* Action buttons */}
        <div className="space-y-4">
          <Button 
            onClick={handleSelectFolder}
            disabled={isSelecting}
            className="w-full"
            size="lg"
          >
            <FolderOpen className="w-5 h-5 mr-2" />
            {isSelecting ? "Selecting..." : "Select Folder to Index"}
          </Button>

          {defaultFolder && (
            <Button 
              onClick={handleOpenDefault}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <Image className="w-5 h-5 mr-2" />
              Open Last Folder
            </Button>
          )}

          <Button 
            variant="ghost"
            className="w-full"
            size="lg"
          >
            <Settings className="w-5 h-5 mr-2" />
            Settings
          </Button>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-4 pt-8">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <Image className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-medium">Fast Indexing</h3>
            <p className="text-sm text-muted-foreground">
              Index thousands of images in seconds
            </p>
          </div>
          
          <div className="text-center space-y-2">
            <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-medium">Offline First</h3>
            <p className="text-sm text-muted-foreground">
              All data stays on your device
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
