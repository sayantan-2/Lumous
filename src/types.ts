// Core types for the Local Gallery application

export interface FileMeta {
  id: string;
  path: string;
  name: string;
  size: number;
  modified: string; // ISO timestamp
  created: string;  // ISO timestamp
  file_type: string;
  dimensions?: Dimensions;
  thumbnail_path?: string;
  tags: string[];
  albums: string[];
  rating?: number;
  metadata?: ImageMetadata;
}

export interface Dimensions {
  width: number;
  height: number;
}

export interface ImageMetadata {
  camera_make?: string;
  camera_model?: string;
  lens_model?: string;
  focal_length?: number;
  aperture?: number;
  shutter_speed?: string;
  iso?: number;
  date_taken?: string;
  gps_coordinates?: GpsCoordinates;
  color_space?: string;
  resolution?: Resolution;
}

export interface GpsCoordinates {
  latitude: number;
  longitude: number;
}

export interface Resolution {
  x: number;
  y: number;
  unit: string;
}

export interface Album {
  id: string;
  name: string;
  description?: string;
  cover_image?: string;
  created: string;
  modified: string;
  file_count: number;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
  created: string;
}

export interface AppSettings {
  theme: "light" | "dark" | "system";
  thumbnailSize: number;
  defaultFolder: string | null;
  cacheLocation: string | null;
}

export interface IndexResult {
  total_files: number;
  indexed_files: number;
  skipped_files: number;
  errors: string[];
}

export interface EditOperation {
  rotate?: number;
  flip_horizontal?: boolean;
  flip_vertical?: boolean;
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  exposure?: number;
  contrast?: number;
}

export interface AppSettings {
  theme: "light" | "dark" | "system";
  thumbnailSize: number;
  defaultFolder: string | null;
  cacheLocation: string | null;
}

export interface IndexProgress {
  total: number;
  processed: number;
  current_file: string;
}

export interface SearchFilter {
  query?: string;
  tags?: string[];
  rating?: number;
  date_range?: {
    start: number;
    end: number;
  };
  format?: string[];
}

// Tauri command types
export interface IndexFolderParams {
  root: string;
  recursive: boolean;
}

export interface IndexFolderResult {
  total: number;
  added: number;
  updated: number;
}

export interface GetFilesParams {
  offset: number;
  limit: number;
  filter?: SearchFilter;
}

export interface GetThumbnailParams {
  fileId: number;
  size: number;
}

export interface GetThumbnailResult {
  path: string;
}

export interface CreateAlbumParams {
  name: string;
}

export interface CreateAlbumResult {
  albumId: number;
}

export interface AddToAlbumParams {
  albumId: number;
  fileIds: number[];
}

export interface SearchParams {
  query: string;
  limit?: number;
}

export interface EditImageParams {
  fileId: number;
  ops: EditOperation;
}

export interface EditImageResult {
  success: boolean;
}

export interface ExportMetadataParams {
  format: "json" | "csv";
}

export interface ExportMetadataResult {
  blobPath: string;
}

export interface OpenInExplorerParams {
  path: string;
}

export interface WatchFolderParams {
  root: string;
}

export interface UpdateSettingsParams {
  settings: AppSettings;
}
