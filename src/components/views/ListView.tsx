import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { convertFileSrc } from '@tauri-apps/api/core';
import { Calendar, Camera, HardDrive, FileImage } from 'lucide-react';
import { useGalleryStore, ImageMetadata } from '../../store/galleryStore';

interface ListViewProps {
  images: ImageMetadata[];
}

export function ListView({ images }: ListViewProps) {
  const { selectedImages, toggleImageSelection, setCurrentImageIndex, setFullscreen } = useGalleryStore();
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  const handleImageClick = useCallback((index: number) => {
    setCurrentImageIndex(index);
    setFullscreen(true);
  }, [setCurrentImageIndex, setFullscreen]);

  const handleImageLoad = useCallback((imageId: string) => {
    setLoadedImages(prev => new Set([...prev, imageId]));
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString();
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.02
      }
    }
  };

  const item = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0 }
  };  return (
    <div className="h-full">
      <motion.div
        className="p-4 space-y-2 min-h-screen"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 py-2 px-4 text-sm font-medium text-muted-foreground border-b border-border">          <div className="col-span-1">
            <input
              type="checkbox"
              className="rounded"
              aria-label="Select all images"
              onChange={() => {
                // Toggle all selection logic here
              }}
            />
          </div>
          <div className="col-span-1"></div>
          <div className="col-span-4">Name</div>
          <div className="col-span-2">Size</div>
          <div className="col-span-2">Dimensions</div>
          <div className="col-span-2">Date</div>
        </div>

        {/* Image List */}
        {images.map((image, index) => {
          const isSelected = selectedImages.has(image.id);
          const imageSrc = convertFileSrc(image.path);

          return (
            <motion.div
              key={image.id}
              variants={item}
              className={`grid grid-cols-12 gap-4 py-3 px-4 rounded-lg border cursor-pointer transition-all hover:bg-accent/50 ${
                isSelected ? 'bg-accent border-primary' : 'bg-card border-border'
              }`}
              onClick={() => handleImageClick(index)}
            >
              {/* Selection Checkbox */}              <div className="col-span-1 flex items-center">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleImageSelection(image.id)}
                  className="rounded"
                  aria-label={`Select ${image.name}`}
                />
              </div>

              {/* Thumbnail */}
              <div className="col-span-1 flex items-center">
                <div className="w-12 h-12 rounded bg-muted overflow-hidden">
                  {loadedImages.has(image.id) ? (
                    <img
                      src={imageSrc}
                      alt={image.name}
                      className="w-full h-full object-cover"
                      onLoad={() => handleImageLoad(image.id)}
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileImage className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>

              {/* Name */}
              <div className="col-span-4 flex items-center">
                <div>
                  <div className="font-medium truncate">{image.name}</div>
                  {image.camera_make && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Camera className="w-3 h-3" />
                      {image.camera_make} {image.camera_model}
                    </div>
                  )}
                </div>
              </div>

              {/* Size */}
              <div className="col-span-2 flex items-center text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <HardDrive className="w-4 h-4" />
                  {formatFileSize(image.size)}
                </div>
              </div>

              {/* Dimensions */}
              <div className="col-span-2 flex items-center text-sm text-muted-foreground">
                {image.width && image.height ? (
                  <span>{image.width} × {image.height}</span>
                ) : (
                  <span>Unknown</span>
                )}
              </div>

              {/* Date */}
              <div className="col-span-2 flex items-center text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(image.modified || image.created)}
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
