/**
 * Utility functions for handling images in the application
 */

/**
 * Formats an image URL to ensure it's properly accessible
 * @param imageUrl - The original image URL from the API
 * @returns Formatted image URL or fallback
 */
export function formatImageUrl(imageUrl: string | null | undefined): string {
  if (!imageUrl) {
    return "/placeholder.svg"
  }

  // If it's already a placeholder, return as is
  if (imageUrl.includes('placeholder')) {
    return imageUrl
  }

  // If it's already a full URL (starts with http), return as is
  if (imageUrl.startsWith('http')) {
    return imageUrl
  }

  // If it starts with /media, prepend the backend URL
  if (imageUrl.startsWith('/media')) {
    return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${imageUrl}`
  }

  // If it's a relative path without leading slash, assume it's from the backend media folder
  if (imageUrl.startsWith('media/')) {
    return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/${imageUrl}`
  }

  // If it doesn't start with / or http, assume it's a relative backend path
  if (!imageUrl.startsWith('/') && !imageUrl.startsWith('http')) {
    return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/media/${imageUrl}`
  }

  // For other cases, return the fallback
  return "/placeholder.svg"
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
