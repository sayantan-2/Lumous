import { useState, useEffect } from "react";
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import {
  X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  RotateCw, Copy, Info, MessageSquare, PanelRightOpen, PanelRightClose
} from "lucide-react";
import { Button } from "./ui/Button";
import { AppToast } from "./ui/Toast";
// Ensure this path matches where you defined the interface
import type { FileMeta } from "../types";
import { cn } from "../lib/utils";

interface ImageViewerProps {
  files: FileMeta[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

interface SidecarData {
  caption: string | null;
  metadata: Record<string, any> | null;
}

// --- Helpers ---

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  // Returns e.g., "1.4 MB"
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatDate = (dateString: string) => {
  if (!dateString) return null;
  try {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  } catch (e) {
    return null;
  }
};

export function ImageViewer({ files, currentIndex, isOpen, onClose, onIndexChange }: ImageViewerProps) {
  // --- State ---
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showControls, setShowControls] = useState(true);

  // UI Layout State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [metadataTab, setMetadataTab] = useState<"caption" | "metadata">("caption");

  // Data State
  const [sidecarData, setSidecarData] = useState<SidecarData>({ caption: null, metadata: null });
  const [copiedOpen, setCopiedOpen] = useState(false);

  const currentFile = files[currentIndex];

  // Constants
  const SIDEBAR_WIDTH_REM = 22;
  const BOTTOM_BAR_HEIGHT_PX = 64;

  // --- Keyboard & Reset Logic ---
  useEffect(() => {
    if (!isOpen) return;

    const handleKeydown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape': onClose(); break;
        case 'ArrowLeft':
          if (currentIndex > 0) { onIndexChange(currentIndex - 1); resetTransforms(); }
          break;
        case 'ArrowRight':
          if (currentIndex < files.length - 1) { onIndexChange(currentIndex + 1); resetTransforms(); }
          break;
        case '+': case '=': setZoom(prev => Math.min(prev * 1.2, 5)); break;
        case '-': setZoom(prev => Math.max(prev * 0.8, 0.1)); break;
        case '0': resetTransforms(); break;
        case 'i': setIsSidebarOpen(prev => !prev); break;
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

  // --- Data Fetching ---
  useEffect(() => {
    resetTransforms();
    setShowControls(true);
    setMetadataTab("caption");

    if (currentFile?.path) {
      invoke<SidecarData>("get_sidecar_data", { imagePath: currentFile.path })
        .then((data) => {
          setSidecarData(data);
          if (!data.caption && data.metadata) {
            setMetadataTab("metadata");
          }
        })
        .catch(() => setSidecarData({ caption: null, metadata: null }));
    } else {
      setSidecarData({ caption: null, metadata: null });
    }
  }, [currentIndex]);

  // --- Mouse Handlers ---
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

  const handleMouseUp = () => setIsDragging(false);

  const handleDoubleClick = () => zoom === 1 ? setZoom(2) : resetTransforms();

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.1, Math.min(5, prev * delta)));
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowControls(!showControls);
  };

  // --- Render Helpers ---
  if (!isOpen || !currentFile) return null;

  const fileName = currentFile.name || currentFile.path.split(/[/\\]/).pop();
  const hasSidecarContent = !!(sidecarData.caption || sidecarData.metadata);
  const isLayoutShifted = hasSidecarContent && isSidebarOpen && showControls;

  // Format the display data
  const displaySize = formatFileSize(currentFile.size);
  // Prefer 'created', fallback to 'modified'
  const displayDate = formatDate(currentFile.created || currentFile.modified);

  return (
    <div
      className="fixed inset-0 z-50 bg-neutral-950/95 backdrop-blur-sm flex items-center justify-center select-none overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 2. NAVIGATION ARROWS */}
      <div className={cn("contents", !showControls && "pointer-events-none opacity-0 transition-opacity duration-300")}>
        <Button
          variant="ghost"
          className="absolute left-4 top-1/2 -translate-y-1/2 z-30 text-white/50 hover:text-white hover:bg-black/40 h-16 w-16 rounded-full p-0 disabled:opacity-0 transition-all"
          onClick={(e) => { e.stopPropagation(); if (currentIndex > 0) { onIndexChange(currentIndex - 1); resetTransforms(); } }}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="w-10 h-10" />
        </Button>

        <Button
          variant="ghost"
          className={cn(
            "absolute top-1/2 -translate-y-1/2 z-30 text-white/50 hover:text-white hover:bg-black/40 h-16 w-16 rounded-full p-0 disabled:opacity-0 transition-all duration-300 ease-in-out",
            isLayoutShifted ? "right-[23rem]" : "right-4"
          )}
          onClick={(e) => { e.stopPropagation(); if (currentIndex < files.length - 1) { onIndexChange(currentIndex + 1); resetTransforms(); } }}
          disabled={currentIndex === files.length - 1}
        >
          <ChevronRight className="w-10 h-10" />
        </Button>
      </div>

      {/* 3. MAIN IMAGE AREA */}
      <div
        className="relative w-full h-full flex items-center justify-center transition-all duration-300 ease-in-out"
        style={{
          paddingRight: isLayoutShifted ? `${SIDEBAR_WIDTH_REM}rem` : '0',
          paddingBottom: showControls ? `${BOTTOM_BAR_HEIGHT_PX}px` : '0'
        }}
      >
        <div className="relative flex items-center justify-center w-full h-full p-4">
          <img
            src={convertFileSrc(currentFile.path)}
            alt={fileName}
            className={cn(
              "max-w-full max-h-full object-contain transition-transform duration-75 will-change-transform shadow-2xl",
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
            draggable={false}
          />
        </div>
      </div>

      {/* 4. SIDEBAR */}
      {hasSidecarContent && (
        <aside
          className={cn(
            "absolute top-0 right-0 bg-neutral-900/95 backdrop-blur-xl border-l border-white/5 shadow-2xl z-30 flex flex-col transition-transform duration-300 ease-in-out",
            isLayoutShifted ? "translate-x-0" : "translate-x-full"
          )}
          style={{
            width: `${SIDEBAR_WIDTH_REM}rem`,
            bottom: showControls ? `${BOTTOM_BAR_HEIGHT_PX}px` : '0',
            height: 'auto',
            top: 0
          }}
        >
          {/* Sidebar Tabs */}
          {sidecarData.caption && sidecarData.metadata && (
            <div className="p-4 border-b border-white/5 shrink-0">
              <div className="bg-black/40 p-1 rounded-lg flex gap-1">
                <button
                  onClick={() => setMetadataTab("caption")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all",
                    metadataTab === "caption" ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/60"
                  )}
                >
                  <MessageSquare className="w-3 h-3" /> Caption
                </button>
                <button
                  onClick={() => setMetadataTab("metadata")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all",
                    metadataTab === "metadata" ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/60"
                  )}
                >
                  <Info className="w-3 h-3" /> Info
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {/* CAPTION */}
            {(metadataTab === "caption" || !sidecarData.metadata) && sidecarData.caption && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs uppercase tracking-widest text-white/40 font-bold">Caption</h3>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-white/40 hover:text-white" onClick={() => navigator.clipboard.writeText(sidecarData.caption || "").then(() => setCopiedOpen(true))}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                <div className="text-sm text-white/80 leading-relaxed font-mono whitespace-pre-wrap bg-white/5 p-3 rounded-lg border border-white/5">
                  {sidecarData.caption}
                </div>
              </div>
            )}
            {/* METADATA */}
            {(metadataTab === "metadata" || !sidecarData.caption) && sidecarData.metadata && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
                {/* Prompts */}
                {(sidecarData.metadata as any)?.prompts && (
                  <div className="space-y-4">
                    {(sidecarData.metadata as any).prompts.positive && (
                      <div className="group relative">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] uppercase tracking-wider text-emerald-400/60 font-bold border border-emerald-500/20 px-1.5 py-0.5 rounded">Positive</span>
                          <Button variant="ghost" size="icon" className="h-5 w-5 text-white/30 hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => navigator.clipboard.writeText((sidecarData.metadata as any).prompts.positive).then(() => setCopiedOpen(true))}>
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        <p className="text-xs text-white/70 font-mono bg-emerald-950/20 border border-emerald-500/10 p-3 rounded-lg break-words leading-relaxed selection:bg-emerald-500/30">{(sidecarData.metadata as any).prompts.positive}</p>
                      </div>
                    )}
                    {(sidecarData.metadata as any).prompts.negative && (
                      <div className="group relative">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] uppercase tracking-wider text-rose-400/60 font-bold border border-rose-500/20 px-1.5 py-0.5 rounded">Negative</span>
                          <Button variant="ghost" size="icon" className="h-5 w-5 text-white/30 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => navigator.clipboard.writeText((sidecarData.metadata as any).prompts.negative).then(() => setCopiedOpen(true))}>
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        <p className="text-xs text-white/60 font-mono bg-rose-950/10 border border-rose-500/10 p-3 rounded-lg break-words leading-relaxed selection:bg-rose-500/30">{(sidecarData.metadata as any).prompts.negative}</p>
                      </div>
                    )}
                  </div>
                )}
                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <div className="grid grid-cols-2 gap-3">
                  <MetaItem label="Model" value={(sidecarData.metadata as any)?.model} fullWidth />
                  <MetaItem label="LoRA" value={(sidecarData.metadata as any)?.lora?.name} sub={(sidecarData.metadata as any)?.lora?.weight ? `Weight: ${(sidecarData.metadata as any).lora.weight}` : null} fullWidth />
                  <MetaItem label="Seed" value={(sidecarData.metadata as any)?.settings?.seed} />
                  <MetaItem label="Steps" value={(sidecarData.metadata as any)?.settings?.steps} />
                  <MetaItem label="CFG Scale" value={(sidecarData.metadata as any)?.settings?.cfg_scale} />
                  <MetaItem label="Sampler" value={(sidecarData.metadata as any)?.settings?.sampler} />
                </div>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* 5. BOTTOM CONTROL BAR */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 z-40 bg-neutral-950/90 backdrop-blur-md border-t border-white/10 transition-transform duration-300 ease-in-out px-4 flex items-center justify-between",
        !showControls ? "translate-y-full" : "translate-y-0"
      )}
        style={{ height: `${BOTTOM_BAR_HEIGHT_PX}px` }}
      >
        {/* LEFT GROUP: Close | Filename | Details */}
        <div className="flex items-center gap-4 h-full">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-9 w-9 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors shrink-0"
            title="Close Viewer (Esc)"
          >
            <X className="w-5 h-5" />
          </Button>

          <div className="w-px h-8 bg-white/10 shrink-0" />

          <div className="flex flex-col justify-center min-w-0">
            <span className="text-white/90 text-sm font-medium truncate max-w-[250px] leading-tight" title={fileName}>
              {fileName}
            </span>

            <div className="flex items-center gap-2.5 text-[11px] text-white/50 font-mono mt-0.5 leading-tight">
              <span>{currentIndex + 1} / {files.length}</span>

              {displaySize && (
                <>
                  <span className="w-px h-2.5 bg-white/10"></span>
                  <span>{displaySize}</span>
                </>
              )}

              {currentFile.dimensions && (
                <>
                  <span className="w-px h-2.5 bg-white/10"></span>
                  <span>{currentFile.dimensions.width} × {currentFile.dimensions.height}</span>
                </>
              )}

              {displayDate && (
                <>
                  <span className="w-px h-2.5 bg-white/10"></span>
                  <span>{displayDate}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* CENTER GROUP: Zoom Controls */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-auto">
          <Button variant="ghost" size="icon" onClick={() => setZoom(prev => Math.max(prev * 0.8, 0.1))} className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10 rounded-full">
            <ZoomOut className="w-4 h-4" />
          </Button>

          <div className="w-24 group flex items-center">
            <input
              type="range" min="10" max="500" value={zoom * 100}
              onChange={(e) => setZoom(Number(e.target.value) / 100)}
              className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:hover:bg-white/90"
            />
          </div>

          <Button variant="ghost" size="icon" onClick={() => setZoom(prev => Math.min(prev * 1.2, 5))} className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10 rounded-full">
            <ZoomIn className="w-4 h-4" />
          </Button>

          <div className="w-px h-4 bg-white/10 mx-1" />

          <span className="text-white/50 text-xs font-mono w-10 text-center select-none">{Math.round(zoom * 100)}%</span>
          <div className="w-px h-4 bg-white/10 mx-1" />

          <Button variant="ghost" size="icon" onClick={() => setRotation(prev => (prev + 90) % 360)} className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10 rounded-full" title="Rotate">
            <RotateCw className="w-4 h-4" />
          </Button>
        </div>

        {/* RIGHT GROUP: Info Toggle */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {hasSidecarContent && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={cn(
                "h-8 w-8 rounded-full transition-colors",
                isSidebarOpen ? "text-emerald-400 bg-white/10" : "text-white/70 hover:text-white hover:bg-white/10"
              )}
              title="Toggle Info Panel (i)"
            >
              {isSidebarOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            </Button>
          )}
        </div>
      </div>

      <AppToast title="Copied" description="Text copied to clipboard" variant="success" duration={1500} open={copiedOpen} onOpenChange={setCopiedOpen} />
    </div>
  );
}

function MetaItem({ label, value, sub, fullWidth }: { label: string, value: any, sub?: string | null, fullWidth?: boolean }) {
  if (!value) return null;
  return (
    <div className={cn("bg-white/5 rounded-md p-2.5 border border-white/5", fullWidth && "col-span-2")}>
      <p className="text-[10px] uppercase tracking-wider text-white/30 font-bold mb-1">{label}</p>
      <p className="text-xs text-white/90 font-mono truncate" title={String(value)}>{value}</p>
      {sub && <p className="text-[10px] text-white/50 font-mono mt-0.5">{sub}</p>}
    </div>
  );
}