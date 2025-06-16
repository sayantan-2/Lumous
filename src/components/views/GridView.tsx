import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { convertFileSrc } from '@tauri-apps/api/core';
import { useGalleryStore, ImageMetadata } from '../../store/galleryStore';
import { ImageCard } from '../ImageCard';

interface GridViewProps {
  images: ImageMetadata[];
}

export function GridView({ images }: GridViewProps) {
  const { gridSize, setCurrentImageIndex, setFullscreen } = useGalleryStore();
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  const handleImageClick = useCallback((index: number) => {
    setCurrentImageIndex(index);
    setFullscreen(true);
  }, [setCurrentImageIndex, setFullscreen]);

  const handleImageLoad = useCallback((imageId: string) => {
    setLoadedImages(prev => new Set([...prev, imageId]));
  }, []);

  const getGridClassName = () => {
    switch (gridSize) {
      case 'small':
        return 'gallery-grid gallery-grid-small';
      case 'large':
        return 'gallery-grid gallery-grid-large';
      default:
        return 'gallery-grid';
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const item = {
    hidden: { opacity: 0, scale: 0.8 },
    show: { opacity: 1, scale: 1 }
  };
  return (
    <div className="h-full">
      <motion.div
        className={getGridClassName()}
        variants={container}
        initial="hidden"
        animate="show"
      >
        {images.map((image, index) => (
          <motion.div
            key={image.id}
            variants={item}
            layout
            className="group cursor-pointer"
            onClick={() => handleImageClick(index)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <ImageCard
              image={image}
              isLoaded={loadedImages.has(image.id)}
              onLoad={() => handleImageLoad(image.id)}
              showMetadata={gridSize === 'large'}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
