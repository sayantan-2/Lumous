import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

export interface ImageMetadata {
  id: string;
  path: string;
  name: string;
  size: number;
  width: number;
  height: number;
  created?: string;
  modified?: string;
  camera_make?: string;
  camera_model?: string;
  iso?: number;
  aperture?: number;
  shutter_speed?: string;
  focal_length?: number;
}

export interface GalleryFolder {
  path: string;
  name: string;
  image_count: number;
  last_modified?: string;
}

export type ViewMode = 'grid' | 'masonry' | 'list';
export type GridSize = 'small' | 'medium' | 'large';
export type SortType = 'lexicographical' | 'natural';

interface GalleryState {
  // Data
  images: ImageMetadata[];
  folders: GalleryFolder[];
  currentFolder: string | null;
  selectedImages: Set<string>;
  
  // UI State
  viewMode: ViewMode;
  gridSize: GridSize;
  isDarkMode: boolean;
  isLoading: boolean;
  searchQuery: string;
  sortBy: 'name' | 'date' | 'size';
  sortOrder: 'asc' | 'desc';
  sortType: SortType;
  
  // Current view
  currentImageIndex: number;
  isFullscreen: boolean;
  
  // Actions
  setImages: (images: ImageMetadata[]) => void;
  setFolders: (folders: GalleryFolder[]) => void;
  setCurrentFolder: (folder: string | null) => void;
  toggleImageSelection: (imageId: string) => void;
  clearSelection: () => void;
  selectAll: () => void;
  
  setViewMode: (mode: ViewMode) => void;
  setGridSize: (size: GridSize) => void;
  setDarkMode: (isDark: boolean) => void;
  setLoading: (loading: boolean) => void;  setSearchQuery: (query: string) => void;
  setSortBy: (sortBy: 'name' | 'date' | 'size') => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  setSortType: (type: SortType) => void;
  
  setCurrentImageIndex: (index: number) => void;
  setFullscreen: (fullscreen: boolean) => void;
  
  // Async actions
  scanFolder: (folderPath: string) => Promise<void>;
  loadRecentFolders: () => Promise<void>;
}

export const useGalleryStore = create<GalleryState>((set, get) => ({
  // Initial state
  images: [],
  folders: [],
  currentFolder: null,
  selectedImages: new Set(),
    viewMode: 'grid',
  gridSize: 'medium',
  isDarkMode: false,
  isLoading: false,
  searchQuery: '',
  sortBy: 'name',
  sortOrder: 'asc',
  sortType: 'natural',
  
  currentImageIndex: -1,
  isFullscreen: false,
  
  // Actions
  setImages: (images) => set({ images }),
  setFolders: (folders) => set({ folders }),
  setCurrentFolder: (folder) => set({ currentFolder: folder }),
  
  toggleImageSelection: (imageId) => set((state) => {
    const newSelection = new Set(state.selectedImages);
    if (newSelection.has(imageId)) {
      newSelection.delete(imageId);
    } else {
      newSelection.add(imageId);
    }
    return { selectedImages: newSelection };
  }),
  
  clearSelection: () => set({ selectedImages: new Set() }),
  
  selectAll: () => set((state) => {
    const allIds = new Set(state.images.map(img => img.id));
    return { selectedImages: allIds };
  }),
  
  setViewMode: (mode) => set({ viewMode: mode }),
  setGridSize: (size) => set({ gridSize: size }),
  setDarkMode: (isDark) => {
    document.documentElement.classList.toggle('dark', isDark);
    set({ isDarkMode: isDark });
  },
  setLoading: (loading) => set({ isLoading: loading }),  setSearchQuery: (query) => set({ searchQuery: query }),
  setSortBy: (sortBy) => set({ sortBy }),
  setSortOrder: (order) => set({ sortOrder: order }),
  setSortType: (type) => set({ sortType: type }),
  
  setCurrentImageIndex: (index) => set({ currentImageIndex: index }),
  setFullscreen: (fullscreen) => set({ isFullscreen: fullscreen }),
  
  // Async actions
  scanFolder: async (folderPath) => {
    set({ isLoading: true });
    try {
      const images: ImageMetadata[] = await invoke('scan_folder', { folderPath });
      set({ images, currentFolder: folderPath, isLoading: false });
    } catch (error) {
      console.error('Failed to scan folder:', error);
      set({ isLoading: false });
    }
  },
  
  loadRecentFolders: async () => {
    try {
      const folders: GalleryFolder[] = await invoke('get_recent_folders');
      set({ folders });
    } catch (error) {
      console.error('Failed to load recent folders:', error);
    }
  },
}));
