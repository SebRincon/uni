import { useState, useEffect } from 'react';
import { getStorageUrl, getFullURL } from '@/utilities/misc/getFullURL';

export function useStorageUrl(path: string | null | undefined, defaultImage: string = '/assets/egg.jpg'): string {
  const [url, setUrl] = useState<string>(() => {
    // If no path, return default immediately
    if (!path) return getFullURL(defaultImage);
    
    // If it's a local asset, return immediately
    if (path.startsWith('/assets/') || path.startsWith('assets/')) {
      return getFullURL(path);
    }
    
    // For S3 paths, return default while loading
    return getFullURL(defaultImage);
  });

  useEffect(() => {
    if (!path) {
      setUrl(getFullURL(defaultImage));
      return;
    }

    // If it's an S3 path, fetch the signed URL
    if (path.startsWith('media/')) {
      getStorageUrl(path)
        .then(signedUrl => setUrl(signedUrl))
        .catch(error => {
          console.error('Failed to load image:', error);
          setUrl(getFullURL(defaultImage));
        });
    } else if (path.startsWith('/assets/') || path.startsWith('assets/')) {
      // Local assets
      setUrl(getFullURL(path));
    } else {
      // Unknown path format, use as-is
      setUrl(path);
    }
  }, [path, defaultImage]);

  return url;
}

// Hook for header images with different default
export function useHeaderUrl(path: string | null | undefined): string {
  return useStorageUrl(path, '/assets/header.jpg');
}