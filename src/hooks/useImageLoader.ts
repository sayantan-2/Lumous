import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export function useImageLoader(imagePath: string) {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!imagePath) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const loadImage = async () => {
      try {
        console.log('Loading image:', imagePath);
        const base64Data = await invoke<string>('read_image_as_base64', {
          filePath: imagePath
        });
        
        if (!cancelled) {
          setImageSrc(base64Data);
          setIsLoading(false);
          console.log('Image loaded successfully:', imagePath);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load image:', imagePath, err);
          setError(err as string);
          setIsLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      cancelled = true;
    };
  }, [imagePath]);

  return { imageSrc, isLoading, error };
}
