import { useCallback, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useGalleryStore, ImageMetadata } from '../../store/galleryStore';
import { ImageCard } from '../ImageCard';

interface MasonryViewProps {
  images: ImageMetadata[];
}

export function MasonryView({ images }: MasonryViewProps) {
  const { setCurrentImageIndex, setFullscreen } = useGalleryStore();
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  const handleImageClick = useCallback((index: number) => {
    setCurrentImageIndex(index);
    setFullscreen(true);
  }, [setCurrentImageIndex, setFullscreen]);

  const handleImageLoad = useCallback((imageId: string) => {
    setLoadedImages(prev => new Set([...prev, imageId]));
  }, []);

  // Group images into columns for masonry layout
  const columnCount = 4;
  const columns = useMemo(() => {
    const cols: ImageMetadata[][] = Array.from({ length: columnCount }, () => []);
    
    images.forEach((image, index) => {
      const colIndex = index % columnCount;
      cols[colIndex].push(image);
    });
    
    return cols;
  }, [images]);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.03
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };  return (
    <div className="h-full">
      <motion.div
        className="flex gap-4 p-4 min-h-screen"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {columns.map((column, columnIndex) => (
          <div key={columnIndex} className="flex-1 space-y-4">
            {column.map((image) => {
              const globalIndex = images.findIndex(img => img.id === image.id);
              const aspectRatio = image.height / image.width;
              
              return (
                <motion.div
                  key={image.id}
                  variants={item}
                  className="group cursor-pointer"
                  onClick={() => handleImageClick(globalIndex)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    height: `${Math.max(200, Math.min(400, 250 * aspectRatio))}px`
                  }}
                >
                  <div className="h-full">
                    <ImageCard
                      image={image}
                      isLoaded={loadedImages.has(image.id)}
                      onLoad={() => handleImageLoad(image.id)}
                      showMetadata={false}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
