import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FolderOpen, 
  Image, 
  Star, 
  Clock, 
  Settings, 
  Moon, 
  Sun,
  Plus,
  ChevronRight
} from 'lucide-react';
import { useGalleryStore } from '../store/galleryStore';
import { open } from '@tauri-apps/plugin-dialog';

export function Sidebar() {
  const { 
    folders, 
    currentFolder, 
    isDarkMode, 
    setCurrentFolder, 
    setDarkMode, 
    scanFolder 
  } = useGalleryStore();
  
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleOpenFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });
      
      if (selected && typeof selected === 'string') {
        await scanFolder(selected);
      }
    } catch (error) {
      console.error('Failed to open folder:', error);
    }
  };

  const sidebarVariants = {
    expanded: { width: 280 },
    collapsed: { width: 60 }
  };

  return (
    <motion.div
      className="bg-card border-r border-border flex flex-col"
      variants={sidebarVariants}
      animate={isCollapsed ? 'collapsed' : 'expanded'}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <h1 className="text-xl font-bold text-foreground">Gallery</h1>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <motion.div
              animate={{ rotate: isCollapsed ? 0 : 180 }}
              transition={{ duration: 0.3 }}
            >
              <ChevronRight className="w-4 h-4" />
            </motion.div>
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 p-4 space-y-2">
        {/* Open Folder Button */}
        <button
          onClick={handleOpenFolder}
          className="w-full flex items-center gap-3 p-3 hover:bg-accent rounded-lg transition-colors text-left"
        >
          <Plus className="w-5 h-5 text-primary" />
          {!isCollapsed && (
            <span className="font-medium">Open Folder</span>
          )}
        </button>

        {/* Quick Access */}
        {!isCollapsed && (
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-muted-foreground px-3 py-2">
              Quick Access
            </h3>
            
            <div className="space-y-1">
              {[
                { icon: Image, label: 'All Images', path: null },
                { icon: Star, label: 'Favorites', path: 'favorites' },
                { icon: Clock, label: 'Recent', path: 'recent' },
              ].map(({ icon: Icon, label, path }) => (
                <button
                  key={label}
                  onClick={() => setCurrentFolder(path)}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left ${
                    currentFolder === path ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent Folders */}
        {!isCollapsed && folders.length > 0 && (
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-muted-foreground px-3 py-2">
              Recent Folders
            </h3>
            
            <div className="space-y-1">
              {folders.map((folder) => (
                <button
                  key={folder.path}
                  onClick={() => scanFolder(folder.path)}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left ${
                    currentFolder === folder.path ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                  }`}
                >
                  <FolderOpen className="w-4 h-4" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{folder.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {folder.image_count} images
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="p-4 border-t border-border space-y-2">
        <button
          onClick={() => setDarkMode(!isDarkMode)}
          className="w-full flex items-center gap-3 p-2 hover:bg-accent rounded-lg transition-colors"
        >
          {isDarkMode ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
          {!isCollapsed && (
            <span className="text-sm">
              {isDarkMode ? 'Light Mode' : 'Dark Mode'}
            </span>
          )}
        </button>

        <button className="w-full flex items-center gap-3 p-2 hover:bg-accent rounded-lg transition-colors">
          <Settings className="w-4 h-4" />
          {!isCollapsed && (
            <span className="text-sm">Settings</span>
          )}
        </button>
      </div>
    </motion.div>
  );
}
