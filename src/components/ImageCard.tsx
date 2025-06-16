import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Heart, Share, Camera, Calendar, HardDrive } from 'lucide-react';
import { useGalleryStore, ImageMetadata } from '../store/galleryStore';
import { useImageLoader } from '../hooks/useImageLoader';

interface ImageCardProps {
  image: ImageMetadata;
  isLoaded: boolean;
  onLoad: () => void;
  showMetadata?: boolean;
}

export function ImageCard({ image, isLoaded, onLoad, showMetadata = false }: ImageCardProps) {
  const { selectedImages, toggleImageSelection } = useGalleryStore();
  const [showTooltip, setShowTooltip] = useState(false);
  const { imageSrc, isLoading: imageLoading, error: imageError } = useImageLoader(image.path);

  const isSelected = selectedImages.has(image.id);

  const handleImageLoad = useCallback(() => {
    console.log('Image loaded successfully:', image.path);
    onLoad();
  }, [onLoad, image.path]);

  const handleImageError = useCallback((e: any) => {
    console.error('Image display error:', image.path, e);
  }, [image.path]);

  const handleSelectionToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    toggleImageSelection(image.id);
  }, [image.id, toggleImageSelection]);

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

  return (
    <motion.div
      className={`relative bg-card rounded-lg overflow-hidden border border-border group ${
        isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
      }`}
      whileHover={{ boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        {!isLoaded && !imageError && (
          <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
            <div className="w-8 h-8 bg-muted-foreground/20 rounded" />
          </div>
        )}
        
        {imageError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <div className="text-center">
              <div className="text-2xl mb-2">🖼️</div>
              <p className="text-xs text-muted-foreground">Failed to load</p>
            </div>
          </div>
        ) : (
          <img
            src={imageSrc}
            alt={image.name}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={handleImageLoad}
            onError={handleImageError}
            loading="lazy"
          />
        )}

        {/* Selection Checkbox */}
        <div className="absolute top-2 left-2">
          <motion.button
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
              isSelected 
                ? 'bg-primary border-primary text-primary-foreground' 
                : 'bg-background/80 border-white/50 backdrop-blur-sm hover:bg-background'
            }`}
            onClick={handleSelectionToggle}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {isSelected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-3 h-3 bg-primary-foreground rounded-full"
              />
            )}
          </motion.button>
        </div>        {/* Hover Actions */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="flex gap-1">
            <button 
              aria-label="Add to favorites"
              className="w-8 h-8 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-background transition-colors"
            >
              <Heart className="w-4 h-4" />
            </button>
            <button 
              aria-label="Share image"
              className="w-8 h-8 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-background transition-colors"
            >
              <Share className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Image Info Overlay */}
        {showMetadata && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
            <div className="text-white text-xs space-y-1">
              <div className="font-medium truncate">{image.name}</div>
              <div className="flex items-center gap-3 text-white/80">
                {image.width && image.height && (
                  <span>{image.width} × {image.height}</span>
                )}
                <span>{formatFileSize(image.size)}</span>
                {image.camera_make && (
                  <span className="flex items-center gap-1">
                    <Camera className="w-3 h-3" />
                    {image.camera_make}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Card Footer (for non-metadata mode) */}
      {!showMetadata && (
        <div className="p-3">
          <div className="text-sm font-medium truncate mb-1">{image.name}</div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatFileSize(image.size)}</span>
            {image.width && image.height && (
              <span>{image.width} × {image.height}</span>
            )}
          </div>
        </div>
      )}

      {/* Detailed Tooltip */}
      {showTooltip && (
        <motion.div
          className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-3 bg-background border border-border rounded-lg shadow-lg text-xs min-w-48"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
        >
          <div className="font-medium mb-2">{image.name}</div>
          <div className="space-y-1 text-muted-foreground">
            <div className="flex items-center gap-2">
              <HardDrive className="w-3 h-3" />
              <span>{formatFileSize(image.size)}</span>
            </div>
            {image.created && (
              <div className="flex items-center gap-2">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(image.created)}</span>
              </div>
            )}
            {image.camera_make && (
              <div className="flex items-center gap-2">
                <Camera className="w-3 h-3" />
                <span>{image.camera_make} {image.camera_model}</span>
              </div>
            )}
            {image.iso && (
              <div>ISO {image.iso}</div>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
