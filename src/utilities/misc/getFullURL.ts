export function getFullURL(path: string): string {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // In production, use the actual domain
  if (process.env.NODE_ENV === 'production') {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://twitter.com';
    return `${baseUrl}/${cleanPath}`;
  }
  
  // In development, use localhost
  const port = process.env.PORT || 3000;
  return `http://localhost:${port}/${cleanPath}`;
}