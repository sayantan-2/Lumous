// App settings and configuration
export interface AppSettings {
  theme: "light" | "dark" | "system";
  thumbnailSize: number;
  defaultFolder: string | null;
  cacheLocation: string | null;
}

// File metadata from Rust backend
export interface FileMeta {
  id: string;
  path: string;
  name: string;
  size: number;
  modified: string; // ISO timestamp
  created: string; // ISO timestamp
  file_type: string;
  dimensions?: {
    width: number;
    height: number;
  };
  thumbnail_path?: string;
  tags: string[];
  albums: string[];
  rating?: number;
  metadata?: ImageMetadata;
}

// Image metadata extracted from EXIF
export interface ImageMetadata {
  camera_make?: string;
  camera_model?: string;
  lens_model?: string;
  focal_length?: number;
  aperture?: number;
  shutter_speed?: string;
  iso?: number;
  date_taken?: string;
  gps_coordinates?: {
    latitude: number;
    longitude: number;
  };
  color_space?: string;
  resolution?: {
    x: number;
    y: number;
    unit: string;
  };
}

// Album management
export interface Album {
  id: string;
  name: string;
  description?: string;
  cover_image?: string;
  created: string;
  modified: string;
  file_count: number;
}

// Search and filtering
export interface SearchQuery {
  query?: string;
  file_types?: string[];
  date_range?: {
    start: string;
    end: string;
  };
  size_range?: {
    min: number;
    max: number;
  };
  tags?: string[];
  albums?: string[];
  rating?: number;
}

// Progress tracking for long operations
export interface ProgressUpdate {
  current: number;
  total: number;
  message: string;
}

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: string;
}
