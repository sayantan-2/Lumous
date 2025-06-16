import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGalleryStore } from '../store/galleryStore';
import { GridView } from './views/GridView';
import { MasonryView } from './views/MasonryView';
import { ListView } from './views/ListView';
import { LoadingSpinner } from './LoadingSpinner';
import { naturalSort, lexicographicalSort } from '../utils/sorting';

export function Gallery() {
  const { 
    images, 
    viewMode, 
    searchQuery, 
    sortBy, 
    sortOrder, 
    sortType,
    isLoading 
  } = useGalleryStore();
  const filteredAndSortedImages = useMemo(() => {
    let filtered = images;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(image => 
        image.name.toLowerCase().includes(query) ||
        image.camera_make?.toLowerCase().includes(query) ||
        image.camera_model?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          // Use the selected sorting type for name comparison
          comparison = sortType === 'natural' 
            ? naturalSort(a.name, b.name)
            : lexicographicalSort(a.name, b.name);
          break;
        case 'date':
          const dateA = new Date(a.modified || a.created || 0).getTime();
          const dateB = new Date(b.modified || b.created || 0).getTime();
          comparison = dateA - dateB;
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [images, searchQuery, sortBy, sortOrder, sortType]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (filteredAndSortedImages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📷</div>
          <h3 className="text-lg font-medium text-foreground mb-2">No Images Found</h3>
          <p className="text-muted-foreground">
            {searchQuery.trim() 
              ? `No images match "${searchQuery}"`
              : "This folder doesn't contain any supported image files."
            }
          </p>
        </div>
      </div>
    );
  }

  const renderView = () => {
    switch (viewMode) {
      case 'grid':
        return <GridView images={filteredAndSortedImages} />;
      case 'masonry':
        return <MasonryView images={filteredAndSortedImages} />;
      case 'list':
        return <ListView images={filteredAndSortedImages} />;
      default:
        return <GridView images={filteredAndSortedImages} />;
    }
  };  return (
    <div className="h-full overflow-auto">
      <AnimatePresence mode="wait">
        <motion.div
          key={viewMode}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {renderView()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
