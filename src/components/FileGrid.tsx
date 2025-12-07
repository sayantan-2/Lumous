/* eslint-disable */
import { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } from "react";
/* eslint-disable */
import { convertFileSrc } from '@tauri-apps/api/core';
import type { FileMeta } from "../types";
import { cn, getAssetUrl } from "../lib/utils";
import { ImageViewer } from "./ImageViewer";
import { FixedSizeGrid as Grid, GridChildComponentProps } from "react-window";

interface FileGridProps {
  files: FileMeta[];
  isLoading: boolean;
  thumbnailSize: number;
  loadingMessage?: string;
  isSidebarSlim: boolean; // kept (future styling) but no longer used for width calc
  imagesPerRow?: number | null;
}

// NOTE: Virtualization enabled via react-window FixedSizeGrid for performance with large libraries.
// We keep layout math simple (square cells) for predictable virtualization.

export function FileGrid({ files, isLoading, thumbnailSize, loadingMessage, imagesPerRow }: FileGridProps) {
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
  // Base desired square size; overridden when imagesPerRow is set
  const baseSize = thumbnailSize;
  const viewportWidth = Math.max(0, containerSize.width - padding * 2);
  const cols = useMemo(() => {
    if (viewportWidth <= 0) return 1;
    if (imagesPerRow && imagesPerRow > 0) return Math.max(1, Math.min(12, imagesPerRow));
    const slot = baseSize + gap; // preferred slot size
    return Math.max(1, Math.floor((viewportWidth + gap) / slot));
  }, [viewportWidth, baseSize, imagesPerRow]);

  // Compute the actual content width for each cell based on chosen column count
  const contentSize = useMemo(() => {
    if (viewportWidth <= 0) return baseSize;
    if (cols <= 0) return baseSize;
    const size = Math.floor((viewportWidth - gap * (cols - 1)) / cols);
    return Math.max(80, Math.min(640, size));
  }, [viewportWidth, cols]);
  const columnWidth = contentSize; // content square
  const rowHeight = contentSize;   // content square
  const rowCount = useMemo(() => Math.ceil(files.length / cols), [files.length, cols]);

  // No fixed size class; the cell fills the computed size

  const cellRenderer = useCallback(({ columnIndex, rowIndex, style }: GridChildComponentProps) => {
    const index = rowIndex * cols + columnIndex;
    if (index >= files.length) {
      return <div style={style} />;
    }
    const file = files[index];
    const fileName = file.path.split(/[\\/]/).pop() || file.path;
    const displayPath = file.thumbnail_path || file.path;
    return (
      <div style={style}>
        <div
          className="group cursor-pointer select-none"
          onClick={() => handleImageClick(index)}
        >
          <div
            className={cn("relative rounded-lg overflow-hidden bg-muted hover:shadow-lg transition-shadow")}
            style={{ width: contentSize, height: contentSize }}
          >
            <img
              // src={convertFileSrc(displayPath)}
              src={getAssetUrl(displayPath, file.modified)}
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
  }, [files, cols, contentSize]);

  // Early returns (after hooks to keep order stable across renders)
  if (isLoading) {
    const isIndexing = loadingMessage && loadingMessage.includes("indexing");
    return (
      <div className="flex-1 min-h-0 min-w-0 flex items-center justify-center">
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
      <div className="flex-1 min-h-0 min-w-0 flex items-center justify-center">
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
