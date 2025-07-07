import { useState, useCallback } from 'react'

interface ImageCacheEntry {
  url: string
  timestamp: number
}

export function useImageCache() {
  const [cacheMap, setCacheMap] = useState<Map<string, ImageCacheEntry>>(new Map())
  const [updateTrigger, setUpdateTrigger] = useState(0)

  const getCachedImageUrl = useCallback((originalUrl: string | null | undefined, forceRefresh: boolean = false): string => {
    if (!originalUrl) return '/placeholder.svg'
    
    const now = Date.now()
    const cached = cacheMap.get(originalUrl)
    
    if (forceRefresh || !cached || (now - cached.timestamp > 5000)) { // 5 second cache
      const separator = originalUrl.includes('?') ? '&' : '?'
      const newUrl = `${originalUrl}${separator}t=${now}`
      
      const newEntry: ImageCacheEntry = {
        url: newUrl,
        timestamp: now
      }
      
      setCacheMap(prev => new Map(prev).set(originalUrl, newEntry))
      return newUrl
    }
    
    return cached.url
  }, [cacheMap])

  const invalidateCache = useCallback((url?: string) => {
    if (url) {
      setCacheMap(prev => {
        const newMap = new Map(prev)
        newMap.delete(url)
        return newMap
      })
    } else {
      setCacheMap(new Map())
    }
    setUpdateTrigger(prev => prev + 1)
  }, [])

  const refreshAllImages = useCallback(() => {
    setUpdateTrigger(prev => prev + 1)
    setCacheMap(new Map())
  }, [])

  return {
    getCachedImageUrl,
    invalidateCache,
    refreshAllImages,
    updateTrigger
  }
}
