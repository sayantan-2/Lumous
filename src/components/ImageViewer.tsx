import { useState, useEffect } from "react";
import { convertFileSrc } from '@tauri-apps/api/core';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { Button } from "./ui/Button";
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
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent p-4">
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

      {/* Navigation */}
      <Button
        variant="ghost"
        size="lg"
        className={cn(
          "absolute left-4 top-1/2 -translate-y-1/2 z-10",
          "text-white hover:bg-white/20",
          currentIndex === 0 && "opacity-50 cursor-not-allowed"
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
          "absolute right-4 top-1/2 -translate-y-1/2 z-10",
          "text-white hover:bg-white/20",
          currentIndex === files.length - 1 && "opacity-50 cursor-not-allowed"
        )}
        onClick={handleNext}
        disabled={currentIndex === files.length - 1}
      >
        <ChevronRight className="w-8 h-8" />
      </Button>

      {/* Controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
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

      {/* Image */}
      <div className="flex-1 flex items-center justify-center p-16">
        <img
          src={convertFileSrc(currentFile.path)}
          alt={fileName}
          className="max-w-full max-h-full object-contain transition-transform duration-200"
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
          }}
          onError={(e) => {
            console.error('Failed to load image:', currentFile.path);
          }}
        />
      </div>
    </div>
  );
}
