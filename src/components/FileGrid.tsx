/* eslint-disable */
import { useState, useEffect, useRef } from "react";
/* eslint-disable */
import { convertFileSrc } from '@tauri-apps/api/core';
import type { FileMeta } from "../types";
import { cn } from "../lib/utils";
import { ImageViewer } from "./ImageViewer";

interface FileGridProps {
  files: FileMeta[];
  isLoading: boolean;
  thumbnailSize: number;
  loadingMessage?: string;
  isSidebarSlim: boolean; // kept (future styling) but no longer used for width calc
}

// NOTE: Virtualization removed in favor of pure CSS grid for perfect edge alignment.
// If performance becomes an issue with very large libraries, we can reintroduce virtualization
// using a custom outer/inner element pairing once layout math is fully locked in.

export function FileGrid({ files, isLoading, thumbnailSize, loadingMessage }: FileGridProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  // Full-width container; we keep ref for future resize-based responsive logic if needed.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setContainerSize({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
  };

  const handleCloseViewer = () => {
    setSelectedImageIndex(null);
  }; if (isLoading) {
    const isIndexing = loadingMessage && loadingMessage.includes("indexing");

    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <div className="animate-pulse mb-4">
            <div className="w-16 h-16 bg-muted rounded-lg mx-auto"></div>
          </div>
          <h2 className="text-xl font-semibold mb-2">
            {loadingMessage || "Loading images..."}
          </h2>
          {isIndexing && (
            <div className="w-full bg-muted rounded-full h-2 mb-4">
              <div className="bg-primary h-2 rounded-full animate-pulse w-3/5"></div>
            </div>
          )}
          <p className="text-muted-foreground">
            {isIndexing
              ? "Discovering and indexing photos in this folder..."
              : "Please wait while we process your photos"
            }
          </p>
        </div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No images found</h2>
          <p className="text-muted-foreground">
            This folder doesn't contain any supported image files
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full w-full overflow-hidden min-h-0">
      <div
        className={cn(
          "h-full w-full overflow-auto",
          "[scrollbar-gutter:stable]", // avoid horizontal shifts
          "pr-3" // intentional right gap
        )}
      >
        <div
          className={cn(
            "grid gap-3 p-3",
            "grid-cols-[repeat(auto-fill,minmax(var(--thumb-size),1fr))]"
          )}
          style={{
            // Use CSS var for min size; ensures consistent column baseline
            ['--thumb-size' as any]: `${thumbnailSize}px`
          }}
        >
          {files.map((file, index) => {
            const fileName = file.path.split(/[/\\\\]/).pop() || file.path;
            const displayPath = file.thumbnail_path || file.path;
            return (
              <div key={file.id || file.path} className="group cursor-pointer select-none" onClick={() => handleImageClick(index)}>
                <div className="relative rounded-lg overflow-hidden bg-muted aspect-square hover:shadow-lg transition-shadow">
                  <img
                    src={convertFileSrc(displayPath)}
                    alt={fileName}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      console.error('Failed to load image:', displayPath);
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-xs font-medium">View</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {selectedImageIndex !== null && (
        <ImageViewer
          files={files}
          currentIndex={selectedImageIndex}
          isOpen={selectedImageIndex !== null}
          onClose={handleCloseViewer}
          onIndexChange={setSelectedImageIndex}
        />
      )}
    </div>
  );
}
