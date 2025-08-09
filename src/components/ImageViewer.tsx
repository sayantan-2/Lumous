import { useState, useEffect } from "react";
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, Copy } from "lucide-react";
import { Button } from "./ui/Button";
import { AppToast } from "./ui/Toast";
import type { FileMeta } from "../types";
import { cn } from "../lib/utils";

interface ImageViewerProps {
  files: FileMeta[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

export function ImageViewer({ files, currentIndex, isOpen, onClose, onIndexChange }: ImageViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showControls, setShowControls] = useState(true);
  const [caption, setCaption] = useState<string | null>(null);
  const [copiedOpen, setCopiedOpen] = useState(false);
  const currentFile = files[currentIndex];

  useEffect(() => {
    if (!isOpen) return;

    const handleKeydown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (currentIndex > 0) {
            onIndexChange(currentIndex - 1);
            resetTransforms();
          }
          break;
        case 'ArrowRight':
          if (currentIndex < files.length - 1) {
            onIndexChange(currentIndex + 1);
            resetTransforms();
          }
          break;
        case '+':
        case '=':
          setZoom(prev => Math.min(prev * 1.2, 5));
          break;
        case '-':
          setZoom(prev => Math.max(prev * 0.8, 0.1));
          break;
        case '0':
          resetTransforms();
          break;
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [isOpen, currentIndex, files.length, onClose, onIndexChange]);

  const resetTransforms = () => {
    setZoom(1);
    setRotation(0);
    setPanX(0);
    setPanY(0);
  };

  // Reset transforms when image changes
  useEffect(() => {
    resetTransforms();
    setShowControls(true);
    // Load sidecar caption for the current image
    if (currentFile?.path) {
      invoke<string | null>("get_sidecar_caption", { imagePath: currentFile.path })
        .then((text) => setCaption(text ?? null))
        .catch(() => setCaption(null));
    } else {
      setCaption(null);
    }
  }, [currentIndex]);

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPanX(e.clientX - dragStart.x);
      setPanY(e.clientY - dragStart.y);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDoubleClick = () => {
    if (zoom === 1) {
      setZoom(2);
    } else {
      resetTransforms();
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.1, Math.min(5, prev * delta)));
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowControls(!showControls);
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      onIndexChange(currentIndex - 1);
      resetTransforms();
    }
  };

  const handleNext = () => {
    if (currentIndex < files.length - 1) {
      onIndexChange(currentIndex + 1);
      resetTransforms();
    }
  };

  if (!isOpen || !currentFile) return null;

  const fileName = currentFile.path.split(/[/\\]/).pop() || currentFile.path;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Header */}
      <div className={cn(
        "absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent p-4 transition-opacity duration-300",
        !showControls && "opacity-0 pointer-events-none"
      )}>
        <div className="flex items-center justify-between text-white">
          <div className="flex-1">
            <h2 className="text-lg font-medium truncate">{fileName}</h2>
            <p className="text-sm text-white/70">
              {currentIndex + 1} of {files.length}
              {currentFile.dimensions && (
                <span className="ml-4">
                  {currentFile.dimensions.width} × {currentFile.dimensions.height}
                </span>
              )}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Navigation (global, at extreme edges) */}
      <Button
        variant="ghost"
        size="lg"
        className={cn(
          "absolute left-4 top-1/2 -translate-y-1/2 z-10 transition-opacity duration-300",
          "text-white hover:bg-white/20",
          currentIndex === 0 && "opacity-50 cursor-not-allowed",
          !showControls && "opacity-0 pointer-events-none"
        )}
        onClick={handlePrevious}
        disabled={currentIndex === 0}
      >
        <ChevronLeft className="w-8 h-8" />
      </Button>

      <Button
        variant="ghost"
        size="lg"
        className={cn(
          "absolute right-4 top-1/2 -translate-y-1/2 z-10 transition-opacity duration-300",
          "text-white hover:bg-white/20",
          currentIndex === files.length - 1 && "opacity-50 cursor-not-allowed",
          !showControls && "opacity-0 pointer-events-none"
        )}
        onClick={handleNext}
        disabled={currentIndex === files.length - 1}
      >
        <ChevronRight className="w-8 h-8" />
      </Button>

      {/* Controls */}
      <div className={cn(
        "absolute bottom-4 left-1/2 -translate-x-1/2 z-10 transition-opacity duration-300",
        !showControls && "opacity-0 pointer-events-none"
      )}>
        <div className="flex items-center space-x-2 bg-black/50 rounded-lg p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom(prev => Math.max(prev * 0.8, 0.1))}
            className="text-white hover:bg-white/20"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-white text-sm px-2">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom(prev => Math.min(prev * 1.2, 5))}
            className="text-white hover:bg-white/20"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <div className="w-px h-6 bg-white/30 mx-2" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRotation(prev => (prev + 90) % 360)}
            className="text-white hover:bg-white/20"
          >
            <RotateCw className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetTransforms}
            className="text-white hover:bg-white/20 text-xs"
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Content: image + caption panel (reserve space for right arrow with padding) */}
  <div className="flex-1 flex items-stretch justify-center gap-0 p-8 pr-16 overflow-hidden">
        <div className={cn("relative inline-flex items-center justify-center overflow-visible shrink-0")}>
          <img
          src={convertFileSrc(currentFile.path)}
          alt={fileName}
          className={cn(
            caption
              ? "max-w-[65vw] max-h-[calc(100vh-12rem)]"
              : "max-w-[calc(100vw-4rem)] max-h-[calc(100vh-12rem)]",
            "object-contain transition-transform duration-200",
            zoom > 1 ? "cursor-grab" : "cursor-pointer",
            isDragging && "cursor-grabbing"
          )}
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg) translate(${panX / zoom}px, ${panY / zoom}px)`,
          }}
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
          onWheel={handleWheel}
          onClick={handleImageClick}
          onError={(e) => {
            console.error('Failed to load image:', currentFile.path);
          }}
          draggable={false}
          />
          {caption && (
            <aside className="absolute top-0 left-full ml-2 w-[clamp(16rem,26vw,20rem)] max-h-[calc(100vh-12rem)] rounded-md border border-white/10 bg-black/30 backdrop-blur-sm text-white/90 p-3 overflow-auto shadow-lg shadow-black/40">
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-xs uppercase tracking-wide text-white/60">Caption</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-white/80 hover:bg-white/20"
                  onClick={() => {
                    navigator.clipboard?.writeText(caption).then(() => setCopiedOpen(true)).catch(() => setCopiedOpen(true));
                  }}
                  title="Copy caption"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <div className="text-sm leading-relaxed whitespace-pre-wrap break-words [text-wrap:pretty]">
                {caption}
              </div>
            </aside>
          )}
        </div>
      </div>
  {/* Local toast for copy confirmation */}
  <AppToast title="Copied!" description="Caption copied to clipboard" variant="success" duration={1800} open={copiedOpen} onOpenChange={setCopiedOpen} />
    </div>
  );
}
