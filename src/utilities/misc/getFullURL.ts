import { getUrl } from 'aws-amplify/storage';

export function getFullURL(path: string): string {
  // If the path starts with 'media/', it's an S3 path
  if (path.startsWith('media/')) {
    // Return a promise-based URL getter for S3
    return ''; // This will be handled by the new async function below
  }
  
  // For local assets (like /assets/egg.jpg)
  if (path.startsWith('/assets/') || path.startsWith('assets/')) {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    
    // In production, use the actual domain
    if (process.env.NODE_ENV === 'production') {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://main.d3o849eq3fpd4i.amplifyapp.com';
      return `${baseUrl}/${cleanPath}`;
    }
    
    // In development, use localhost
    const port = process.env.PORT || 3001;
    return `http://localhost:${port}/${cleanPath}`;
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