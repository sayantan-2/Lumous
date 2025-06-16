import { useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { convertFileSrc } from '@tauri-apps/api/core';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download,
  Share,
  Info,
  Heart,
  Maximize,
  Minimize
} from 'lucide-react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useGalleryStore } from '../store/galleryStore';

export function ImageViewer() {
  const { 
    images, 
    currentImageIndex, 
    isFullscreen,
    setCurrentImageIndex, 
    setFullscreen 
  } = useGalleryStore();

  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [showInfo, setShowInfo] = useState(false);

  const currentImage = images[currentImageIndex];

  const goToPrevious = useCallback(() => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
      setZoom(1);
      setRotation(0);
    }
  }, [currentImageIndex, setCurrentImageIndex]);

  const goToNext = useCallback(() => {
    if (currentImageIndex < images.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
      setZoom(1);
      setRotation(0);
    }
  }, [currentImageIndex, images.length, setCurrentImageIndex]);

  const handleClose = useCallback(() => {
    setFullscreen(false);
    setZoom(1);
    setRotation(0);
  }, [setFullscreen]);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.25, 0.25));
  }, []);

  const handleRotate = useCallback(() => {
    setRotation(prev => prev + 90);
  }, []);

  const handleResetView = useCallback(() => {
    setZoom(1);
    setRotation(0);
  }, []);

  // Keyboard shortcuts
  useHotkeys('escape', handleClose);
  useHotkeys('left', goToPrevious);
  useHotkeys('right', goToNext);
  useHotkeys('space', goToNext);
  useHotkeys('plus,equal', handleZoomIn);
  useHotkeys('minus', handleZoomOut);
  useHotkeys('r', handleRotate);
  useHotkeys('0', handleResetView);
  useHotkeys('i', () => setShowInfo(!showInfo));

  // Hide controls after inactivity
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    const resetTimeout = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setShowControls(false), 3000);
    };

    const handleMouseMove = () => resetTimeout();
    const handleKeyDown = () => resetTimeout();

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('keydown', handleKeyDown);
    resetTimeout();

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timeout);
    };
  }, []);

  if (!currentImage) return null;

  const imageSrc = convertFileSrc(currentImage.path);

  return (
    <AnimatePresence>
      {isFullscreen && (
        <motion.div
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Main Image */}
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            <motion.img
              key={currentImage.id}
              src={imageSrc}
              alt={currentImage.name}
              className="max-w-full max-h-full object-contain select-none"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transition: 'transform 0.3s ease'
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
              draggable={false}
            />
          </div>

          {/* Controls Overlay */}
          <AnimatePresence>
            {showControls && (
              <>
                {/* Top Controls */}
                <motion.div
                  className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent p-4"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <div className="flex items-center justify-between text-white">
                    <div className="flex-1">
                      <h2 className="text-lg font-medium truncate">{currentImage.name}</h2>
                      <p className="text-sm text-white/80">
                        {currentImageIndex + 1} of {images.length}
                        {currentImage.width && currentImage.height && (
                          <span className="ml-2">• {currentImage.width} × {currentImage.height}</span>
                        )}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowInfo(!showInfo)}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        title="Show Info"
                      >
                        <Info className="w-5 h-5" />
                      </button>
                      <button
                        onClick={handleClose}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        title="Close (Esc)"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </motion.div>

                {/* Navigation Controls */}
                {currentImageIndex > 0 && (
                  <motion.button
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 p-3 bg-black/60 text-white hover:bg-black/80 rounded-full transition-colors"
                    onClick={goToPrevious}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    title="Previous (←)"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </motion.button>
                )}

                {currentImageIndex < images.length - 1 && (
                  <motion.button
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 p-3 bg-black/60 text-white hover:bg-black/80 rounded-full transition-colors"
                    onClick={goToNext}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    title="Next (→)"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </motion.button>
                )}

                {/* Bottom Controls */}
                <motion.div
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                >
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={handleZoomOut}
                      className="p-2 bg-black/60 text-white hover:bg-black/80 rounded-lg transition-colors"
                      title="Zoom Out (-)"
                    >
                      <ZoomOut className="w-5 h-5" />
                    </button>
                    
                    <span className="px-3 py-2 bg-black/60 text-white rounded-lg text-sm min-w-16 text-center">
                      {Math.round(zoom * 100)}%
                    </span>
                    
                    <button
                      onClick={handleZoomIn}
                      className="p-2 bg-black/60 text-white hover:bg-black/80 rounded-lg transition-colors"
                      title="Zoom In (+)"
                    >
                      <ZoomIn className="w-5 h-5" />
                    </button>
                    
                    <button
                      onClick={handleRotate}
                      className="p-2 bg-black/60 text-white hover:bg-black/80 rounded-lg transition-colors"
                      title="Rotate (R)"
                    >
                      <RotateCw className="w-5 h-5" />
                    </button>
                    
                    <div className="w-px h-6 bg-white/20 mx-2" />
                    
                    <button
                      className="p-2 bg-black/60 text-white hover:bg-black/80 rounded-lg transition-colors"
                      title="Add to Favorites"
                    >
                      <Heart className="w-5 h-5" />
                    </button>
                    
                    <button
                      className="p-2 bg-black/60 text-white hover:bg-black/80 rounded-lg transition-colors"
                      title="Share"
                    >
                      <Share className="w-5 h-5" />
                    </button>
                    
                    <button
                      className="p-2 bg-black/60 text-white hover:bg-black/80 rounded-lg transition-colors"
                      title="Download"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Info Panel */}
          <AnimatePresence>
            {showInfo && (
              <motion.div
                className="absolute top-20 right-4 w-80 bg-background/95 backdrop-blur-sm border border-border rounded-lg p-4 text-foreground"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <h3 className="font-medium mb-3">Image Information</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name:</span>
                    <span className="ml-2">{currentImage.name}</span>
                  </div>
                  {currentImage.size && (
                    <div>
                      <span className="text-muted-foreground">Size:</span>
                      <span className="ml-2">{(currentImage.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                  )}
                  {currentImage.width && currentImage.height && (
                    <div>
                      <span className="text-muted-foreground">Dimensions:</span>
                      <span className="ml-2">{currentImage.width} × {currentImage.height}</span>
                    </div>
                  )}
                  {currentImage.camera_make && (
                    <div>
                      <span className="text-muted-foreground">Camera:</span>
                      <span className="ml-2">{currentImage.camera_make} {currentImage.camera_model}</span>
                    </div>
                  )}
                  {currentImage.iso && (
                    <div>
                      <span className="text-muted-foreground">ISO:</span>
                      <span className="ml-2">{currentImage.iso}</span>
                    </div>
                  )}
                  {currentImage.aperture && (
                    <div>
                      <span className="text-muted-foreground">Aperture:</span>
                      <span className="ml-2">f/{currentImage.aperture}</span>
                    </div>
                  )}
                  {currentImage.shutter_speed && (
                    <div>
                      <span className="text-muted-foreground">Shutter:</span>
                      <span className="ml-2">{currentImage.shutter_speed}</span>
                    </div>
                  )}
                  {currentImage.focal_length && (
                    <div>
                      <span className="text-muted-foreground">Focal Length:</span>
                      <span className="ml-2">{currentImage.focal_length}mm</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
