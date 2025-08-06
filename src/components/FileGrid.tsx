import { useMemo, useState } from "react";
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
    return <div style={style} />;
  }

  const fileName = file.path.split(/[/\\]/).pop() || file.path;

  return (
    <div style={style} className="p-2">
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
  
  const { columnsPerRow, rowCount } = useMemo(() => {
    const containerWidth = window.innerWidth - 256 - 32; // sidebar width + padding
    const itemWidth = thumbnailSize + 16; // thumbnail + padding
    const cols = Math.max(1, Math.floor(containerWidth / itemWidth));
    const rows = Math.ceil(files.length / cols);
    
    return {
      columnsPerRow: cols,
      rowCount: rows,
    };
  }, [files.length, thumbnailSize]);

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
    <div className="h-full w-full">
      <Grid
        columnCount={columnsPerRow}
        columnWidth={thumbnailSize + 16}
        height={window.innerHeight - 100} // Adjust for header
        rowCount={rowCount}
        rowHeight={thumbnailSize + 16}
        width={window.innerWidth - 256} // Adjust for sidebar
        itemData={{
          files,
          columnsPerRow,
          thumbnailSize,
          onImageClick: handleImageClick,
        }}
      >
        {ThumbnailItem}
      </Grid>
      
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
