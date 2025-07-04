"use client"

import Image from "next/image"
import { useState } from "react"

interface SafeImageProps {
  src: string
  alt: string
  width: number
  height: number
  className?: string
  unoptimized?: boolean
}

export function SafeImage({ src, alt, width, height, className = "", unoptimized = false }: SafeImageProps) {
  const [imageError, setImageError] = useState(false)
  const [imageSrc, setImageSrc] = useState(src)

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
    />
  )
}
