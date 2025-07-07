"use client"

import Image from "next/image"
import { useState, useEffect } from "react"

interface SafeImageProps {
  src: string
  alt: string
  width: number
  height: number
  className?: string
  unoptimized?: boolean
  key?: string
}

export function SafeImage({ src, alt, width, height, className = "", unoptimized = false, key }: SafeImageProps) {
  const [imageError, setImageError] = useState(false)
  const [imageSrc, setImageSrc] = useState(src)

  // Reset error state when src changes
  useEffect(() => {
    setImageError(false)
    setImageSrc(src)
  }, [src, key])

  // For external URLs (localhost backend) or if there was an error, use regular img tag
  const shouldUseImgTag = imageError || 
                         src.startsWith('http://localhost') || 
                         src.startsWith('https://localhost') ||
                         src.includes('localhost:8000')

  if (shouldUseImgTag) {
    return (
      <img
        src={imageSrc}
        alt={alt}
        width={width}
        height={height}
        className={className}
        style={{ objectFit: 'contain' }}
        onError={() => setImageSrc("/placeholder.svg")}
        key={key}
      />
    )
  }

  // For local images (like placeholder.svg), use Next.js Image
  return (
    <Image
      src={imageSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      unoptimized={unoptimized}
      onError={() => {
        setImageError(true)
        setImageSrc(src) // Keep original src for img fallback
      }}
      key={key}
    />
  )
}
