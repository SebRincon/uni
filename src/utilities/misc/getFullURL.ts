import { getUrl } from 'aws-amplify/storage';

export function getFullURL(path: string): string {
  // If the path starts with S3 prefixes, it's an S3 path
  if (path.startsWith('media/')) {
    // Handled by the async getStorageUrl function below
    return '';
  }

  // Local assets: return a root-relative URL so the browser uses the current origin/port
  if (path.startsWith('/assets/') || path.startsWith('assets/')) {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `/${cleanPath}`;
  }

  // Default case - return the path as-is
  return path;
}

// New async function to get S3 URLs
export async function getStorageUrl(path: string): Promise<string> {
  try {
    if (!path || !path.startsWith('media/')) {
      return getFullURL(path);
    }
    
    const result = await getUrl({ 
      path,
      options: {
        validateObjectExistence: false // Don't validate to speed up the request
      }
    });
    return result.url.toString();
  } catch (error) {
    console.error('Error getting storage URL:', error);
    // Return default image on error
    return getFullURL('/assets/egg.jpg');
  }
}