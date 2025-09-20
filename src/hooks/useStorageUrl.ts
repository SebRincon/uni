import { useState, useEffect } from 'react';
import { getStorageUrl, getFullURL } from '@/utilities/misc/getFullURL';

function normalizeS3Key(input: string): string | null {
  if (!input) return null;
  // Absolute URLs should be used as-is
  if (input.startsWith('http://') || input.startsWith('https://')) return input;

  // Local assets
  if (input.startsWith('/assets/') || input.startsWith('assets/')) return input;

  // If the string contains a media/ segment anywhere, extract from there
  const idx = input.indexOf('media/');
  if (idx !== -1) {
    return input.slice(idx); // e.g. media/<identityId>/...
  }

  // Otherwise return as-is so the caller can try to load it directly
  return input;
}

export function useStorageUrl(path: string | null | undefined, defaultImage: string = '/assets/egg.jpg'): string {
  const [url, setUrl] = useState<string>(() => {
    // If no path, return default immediately
    if (!path) return getFullURL(defaultImage);

    const normalized = normalizeS3Key(path);

    // Absolute URLs or local assets can be returned immediately
    if (normalized && (normalized.startsWith('http://') || normalized.startsWith('https://'))) {
      return normalized;
    }
    if (normalized && (normalized.startsWith('/assets/') || normalized.startsWith('assets/'))) {
      return getFullURL(normalized);
    }

    // For S3 keys or unknown formats, show default while we try to resolve
    return getFullURL(defaultImage);
  });

  useEffect(() => {
    if (!path) {
      setUrl(getFullURL(defaultImage));
      return;
    }

    const normalized = normalizeS3Key(path);

    if (!normalized) {
      setUrl(getFullURL(defaultImage));
      return;
    }

    // Absolute URL
    if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
      setUrl(normalized);
      return;
    }

    // Local assets
    if (normalized.startsWith('/assets/') || normalized.startsWith('assets/')) {
      setUrl(getFullURL(normalized));
      return;
    }

    // S3 key (media/...)
    if (normalized.startsWith('media/')) {
      getStorageUrl(normalized)
        .then(signedUrl => setUrl(signedUrl))
        .catch(error => {
          console.error('Failed to load image:', error);
          setUrl(getFullURL(defaultImage));
        });
      return;
    }

    // Unknown path format, use as-is
    setUrl(normalized);
  }, [path, defaultImage]);

  return url;
}

// Hook for header images with different default
export function useHeaderUrl(path: string | null | undefined): string {
  return useStorageUrl(path, '/assets/header.jpg');
}
