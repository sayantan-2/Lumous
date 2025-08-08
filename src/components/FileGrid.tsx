/* eslint-disable */
import { useMemo, useState, useEffect, useRef } from "react";
import { FixedSizeGrid as Grid } from "react-window";
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

interface ThumbnailItemProps {
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
  data: {
    files: FileMeta[];
    columnsPerRow: number;
    thumbnailSize: number;
    onImageClick: (index: number) => void;
  };
}

function ThumbnailItem({ columnIndex, rowIndex, style, data }: ThumbnailItemProps) {
  const { files, columnsPerRow, thumbnailSize, onImageClick } = data;
  const index = rowIndex * columnsPerRow + columnIndex;
  const file = files[index];

  if (!file) {
    return <div className="file-grid-cell" style={style} />;
  }

  const fileName = file.path.split(/[/\\]/).pop() || file.path;

  return (
    <div style={style} className="file-grid-cell p-2">
      <div
        className={cn(
          "relative group cursor-pointer rounded-lg overflow-hidden",
          "hover:shadow-lg transition-all duration-200",
          "bg-muted"
        )}
        style={{ aspectRatio: "1" }}
        onClick={() => onImageClick(index)}
      >
        {/* Display the actual image */}
        <div className="w-full h-full relative">
          <img
            src={convertFileSrc(file.path)}
            alt={fileName}
            className="w-full h-full object-cover"
            onError={(e) => {
              console.error('Failed to load image:', file.path);
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        </div>

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <div className="text-white text-sm font-medium">
            View
          </div>
        </div>
      </div>
    </div>
  );
}

export function FileGrid({ files, isLoading, thumbnailSize, loadingMessage }: FileGridProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Observe container size (more accurate than window - sidebar heuristic)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      setContainerSize({ width: el.clientWidth, height: el.clientHeight });
    };
    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const { columnsPerRow, rowCount, gridWidth, gridHeight, columnWidth, rowHeight } = useMemo(() => {
    const availableWidth = containerSize.width;
    const availableHeight = containerSize.height || (window.innerHeight - 80); // fallback
    if (!availableWidth) {
      return { columnsPerRow: 1, rowCount: files.length, gridWidth: availableWidth, gridHeight: availableHeight, columnWidth: thumbnailSize + 16, rowHeight: thumbnailSize + 16 };
    }
    const gapOuter = 16; // target gap (equals cell padding total) to keep at right edge
    // Reserve gapOuter first, then compute how many base cells fit
    const baseOuter = thumbnailSize + gapOuter; // desired nominal outer cell size (thumb + gap)
    const cols = Math.max(1, Math.floor((availableWidth - gapOuter) / baseOuter));
    const rawUsed = cols * baseOuter; // without right gutter
    const leftover = Math.max(0, availableWidth - rawUsed - gapOuter); // distributable space to avoid large gutter
    const stretchPerCol = leftover / cols; // distribute so only gapOuter remains as gutter
    const finalOuter = baseOuter + stretchPerCol; // stretched outer (can be fractional)
    const gridWidth = finalOuter * cols + gapOuter; // should equal availableWidth (floating point safe)
    const rows = Math.ceil(files.length / cols);
    return {
      columnsPerRow: cols,
      rowCount: rows,
      gridWidth,
      gridHeight: availableHeight,
      columnWidth: finalOuter,
      rowHeight: finalOuter
    };
  }, [containerSize, thumbnailSize, files.length]);

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
  };

  const handleCloseViewer = () => {
    setSelectedImageIndex(null);
  };  if (isLoading) {
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
      {gridWidth > 0 && gridHeight > 0 && (
        <Grid
          columnCount={columnsPerRow}
          columnWidth={columnWidth}
          height={gridHeight}
          rowCount={rowCount}
          rowHeight={rowHeight}
          width={gridWidth}
          itemData={{
            files,
            columnsPerRow,
            thumbnailSize, // original intended base; actual rendered may stretch slightly
            onImageClick: handleImageClick,
          }}
        >
          {ThumbnailItem}
        </Grid>
      )}
      
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
