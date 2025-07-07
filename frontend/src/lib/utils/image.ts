/**
 * Utility functions for handling images in the application
 */

/**
 * Formats an image URL to ensure it's properly accessible
 * @param imageUrl - The original image URL from the API
 * @param bustCache - Whether to add cache-busting parameter
 * @returns Formatted image URL or fallback
 */
export function formatImageUrl(imageUrl: string | null | undefined, bustCache: boolean = false): string {
  if (!imageUrl) {
    return "/placeholder.svg"
  }

  // If it's already a placeholder, return as is
  if (imageUrl.includes('placeholder')) {
    return imageUrl
  }

  let formattedUrl = imageUrl

  // If it's already a full URL (starts with http), return as is
  if (imageUrl.startsWith('http')) {
    formattedUrl = imageUrl
  }
  // If it starts with /media, prepend the backend URL
  else if (imageUrl.startsWith('/media')) {
    formattedUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${imageUrl}`
  }
  // If it's a relative path without leading slash, assume it's from the backend media folder
  else if (imageUrl.startsWith('media/')) {
    formattedUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/${imageUrl}`
  }
  // If it doesn't start with / or http, assume it's a relative backend path
  else if (!imageUrl.startsWith('/') && !imageUrl.startsWith('http')) {
    formattedUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/media/${imageUrl}`
  }
  // For other cases, return the fallback
  else {
    return "/placeholder.svg"
  }

  // Add cache-busting parameter if requested
  if (bustCache) {
    const separator = formattedUrl.includes('?') ? '&' : '?'
    formattedUrl += `${separator}t=${Date.now()}`
  }

  return formattedUrl
}

/**
 * Checks if an image URL is external (requires special handling)
 * @param imageUrl - The image URL to check
 * @returns true if the image is external
 */
export function isExternalImage(imageUrl: string | null | undefined): boolean {
  if (!imageUrl) return false
  
  // Check if it's a localhost backend URL
  if (imageUrl.includes('localhost:8000') || 
      imageUrl.startsWith('http://localhost') || 
      imageUrl.startsWith('https://localhost') ||
      imageUrl.startsWith('/media') || 
      imageUrl.startsWith('media/')) {
    return true
  }
  
  // Check if it's any external HTTP URL
  return imageUrl.startsWith('http')
}
