/* eslint-disable */
import { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } from "react";
/* eslint-disable */
import { convertFileSrc } from '@tauri-apps/api/core';
import type { FileMeta } from "../types";
import { cn } from "../lib/utils";
import { ImageViewer } from "./ImageViewer";
import { FixedSizeGrid as Grid, GridChildComponentProps } from "react-window";

interface FileGridProps {
  files: FileMeta[];
  isLoading: boolean;
  thumbnailSize: number;
  loadingMessage?: string;
  isSidebarSlim: boolean; // kept (future styling) but no longer used for width calc
}

// NOTE: Virtualization enabled via react-window FixedSizeGrid for performance with large libraries.
// We keep layout math simple (square cells) for predictable virtualization.

export function FileGrid({ files, isLoading, thumbnailSize, loadingMessage }: FileGridProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  // Measure the scroll container (fills flex space) to size the virtual grid correctly
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  // Full-width container; we keep ref for future resize-based responsive logic if needed.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      const width = Math.max(el.clientWidth, Math.floor(rect.width));
      const height = Math.max(el.clientHeight, Math.floor(rect.height));
      setContainerSize((prev) => (prev.width !== width || prev.height !== height ? { width, height } : prev));
    };
    // Immediate measure, then a double-RAF to catch late flex sizing after refresh
    measure();
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(measure);
      // store nested id on element for cleanup scope
      (el as any)._lg_raf2 = raf2;
    });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const onWinResize = () => measure();
    window.addEventListener('resize', onWinResize);
    window.addEventListener('load', onWinResize, { once: true });
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onWinResize);
      if (raf1) cancelAnimationFrame(raf1);
      if ((el as any)._lg_raf2) cancelAnimationFrame((el as any)._lg_raf2);
    };
  }, [isLoading]);

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
  };

  const handleCloseViewer = () => {
    setSelectedImageIndex(null);
  };

  // Virtualized grid math
  const gap = 12; // Tailwind gap-3
  const padding = 12; // Tailwind p-3
  const columnWidth = thumbnailSize; // content square
  const rowHeight = thumbnailSize; // content square
  const viewportWidth = Math.max(0, containerSize.width - padding * 2);
  const cols = useMemo(() => {
    if (viewportWidth <= 0) return 1;
    // effective column slot includes cell size + gap; last column doesn't need trailing gap
    const slot = columnWidth + gap;
    const count = Math.max(1, Math.floor((viewportWidth + gap) / slot));
    return count;
  }, [viewportWidth, columnWidth]);
  const rowCount = useMemo(() => Math.ceil(files.length / cols), [files.length, cols]);

  const sizeClass = useMemo(() => {
    if (thumbnailSize <= 160) return "thumb-150";
    if (thumbnailSize <= 190) return "thumb-180";
    if (thumbnailSize <= 210) return "thumb-200";
    if (thumbnailSize <= 230) return "thumb-220";
    return "thumb-240";
  }, [thumbnailSize]);

  const cellRenderer = useCallback(({ columnIndex, rowIndex, style }: GridChildComponentProps) => {
    const index = rowIndex * cols + columnIndex;
    if (index >= files.length) {
      return <div style={style} />;
    }
    const file = files[index];
    const fileName = file.path.split(/[\\/]/).pop() || file.path;
    const displayPath = file.thumbnail_path || file.path;
    return (
      <div style={style} className="p-1">
        <div
          className="group cursor-pointer select-none"
          onClick={() => handleImageClick(index)}
        >
          <div className={cn("relative rounded-lg overflow-hidden bg-muted hover:shadow-lg transition-shadow", sizeClass)}>
            <img
              src={convertFileSrc(displayPath)}
              alt={fileName}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
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
      </div>
    );
  }, [files, cols, columnWidth, rowHeight]);

  // Early returns (after hooks to keep order stable across renders)
  if (isLoading) {
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
    <div className="flex-1 min-h-0 min-w-0 flex">
      <div
        ref={containerRef}
        className={cn(
          "flex-1 min-h-0 min-w-0 overflow-auto",
          "[scrollbar-gutter:stable]",
          "p-3"
        )}
      >
        {containerSize.width > 0 && containerSize.height > 0 ? (
          <Grid
            key={`${containerSize.width}x${containerSize.height}`}
            columnCount={cols}
            rowCount={rowCount}
            columnWidth={columnWidth + gap}
            rowHeight={rowHeight + gap}
            height={Math.max(120, containerSize.height - padding * 2)}
            width={Math.max(160, containerSize.width - padding * 2)}
            overscanRowCount={4}
            overscanColumnCount={2}
          >
            {cellRenderer}
          </Grid>
        ) : (
          <div className="w-full h-full" />
        )}
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
