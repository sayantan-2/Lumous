import { 
  Search, 
  Grid3X3, 
  List, 
  LayoutGrid,
  Square,
  ArrowUpDown,
  ChevronDown,
  Type,
  Hash
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useGalleryStore } from '../store/galleryStore';

export function Toolbar() {
  const { 
    viewMode, 
    gridSize, 
    searchQuery,
    sortBy,
    sortOrder,
    sortType,
    selectedImages,
    setViewMode, 
    setGridSize,
    setSearchQuery,
    setSortBy,
    setSortOrder,
    setSortType
  } = useGalleryStore();

  const [showSortSettings, setShowSortSettings] = useState(false);
  const sortSettingsRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sortSettingsRef.current && !sortSettingsRef.current.contains(event.target as Node)) {
        setShowSortSettings(false);
      }
    }

    if (showSortSettings) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSortSettings]);

  return (
    <div className="h-16 bg-card border-b border-border flex items-center px-4 gap-4">
      {/* Search */}
      <div className="flex-1 max-w-md relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search images..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {/* Selection Info */}
      {selectedImages.size > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{selectedImages.size} selected</span>
        </div>
      )}

      {/* View Controls */}
      <div className="flex items-center gap-2">
        {/* View Mode */}
        <div className="flex items-center bg-background border border-border rounded-lg">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-l-lg transition-colors ${
              viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
            }`}
            title="Grid View"
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('masonry')}
            className={`p-2 transition-colors ${
              viewMode === 'masonry' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
            }`}
            title="Masonry View"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-r-lg transition-colors ${
              viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
            }`}
            title="List View"
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        {/* Grid Size (only show for grid view) */}
        {viewMode === 'grid' && (
          <div className="flex items-center bg-background border border-border rounded-lg">
            <button
              onClick={() => setGridSize('small')}
              className={`p-2 rounded-l-lg transition-colors ${
                gridSize === 'small' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
              }`}
              title="Small Grid"
            >
              <Square className="w-3 h-3" />
            </button>
            <button
              onClick={() => setGridSize('medium')}
              className={`p-2 transition-colors ${
                gridSize === 'medium' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
              }`}
              title="Medium Grid"
            >
              <Square className="w-4 h-4" />
            </button>
            <button
              onClick={() => setGridSize('large')}
              className={`p-2 rounded-r-lg transition-colors ${
                gridSize === 'large' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
              }`}
              title="Large Grid"
            >
              <Square className="w-5 h-5" />
            </button>
          </div>
        )}        {/* Sort */}
        <div className="flex items-center gap-1 relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'date' | 'size')}
            className="px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            title="Sort by"
          >
            <option value="name">Name</option>
            <option value="date">Date</option>
            <option value="size">Size</option>
          </select>
          
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
          >
            <ArrowUpDown className={`w-4 h-4 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
          </button>          {/* Sort Type Dropdown */}
          <div className="relative" ref={sortSettingsRef}>
            <button
              onClick={() => setShowSortSettings(!showSortSettings)}
              className="p-2 hover:bg-accent rounded-lg transition-colors flex items-center"
              title="Sort Settings"
            >
              {sortType === 'natural' ? <Hash className="w-4 h-4" /> : <Type className="w-4 h-4" />}
              <ChevronDown className="w-3 h-3 ml-1" />
            </button>
            
            {showSortSettings && (
              <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg p-2 min-w-[200px] z-50">
                <div className="text-xs font-medium text-muted-foreground mb-2">Sort Type</div>
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setSortType('natural');
                      setShowSortSettings(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                      sortType === 'natural' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4" />
                      <div>
                        <div className="font-medium">Natural</div>
                        <div className="text-xs opacity-75">img1, img2, img10</div>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setSortType('lexicographical');
                      setShowSortSettings(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                      sortType === 'lexicographical' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Type className="w-4 h-4" />
                      <div>
                        <div className="font-medium">Alphabetical</div>
                        <div className="text-xs opacity-75">img1, img10, img2</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>        </div>
      </div>
    </div>
  );
}
