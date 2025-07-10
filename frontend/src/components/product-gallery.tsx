"use client"

import { useState } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"

interface ProductGalleryProps {
  product: any
}

export function ProductGallery({ product }: ProductGalleryProps) {
  const [selectedImage, setSelectedImage] = useState(0)

  // Generate multiple images based on the product
  const images = [
    product.image,
    `/placeholder.svg?height=600&width=600&text=${encodeURIComponent(product.name + " - Side")}`,
    `/placeholder.svg?height=600&width=600&text=${encodeURIComponent(product.name + " - Back")}`,
    `/placeholder.svg?height=600&width=600&text=${encodeURIComponent(product.name + " - Detail")}`,
  ]

  const nextImage = () => {
    setSelectedImage((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setSelectedImage((prev) => (prev - 1 + images.length) % images.length)
  }

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="relative aspect-square bg-slate-100 rounded-lg overflow-hidden">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon" className="absolute top-4 right-4 z-10 bg-white/80 backdrop-blur-sm">
              <ZoomIn className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <div className="aspect-square relative">
              <Image
                src={images[selectedImage] || "/placeholder.svg"}
                alt={product.name}
                fill
                unoptimized={images[selectedImage]?.startsWith('http')}
                className="object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>

        <Image 
          src={images[selectedImage] || "/placeholder.svg"} 
          alt={product.name} 
          fill 
          unoptimized={images[selectedImage]?.startsWith('http')}
          className="object-contain" 
        />

        {/* Navigation Arrows */}
        <Button
          variant="outline"
          size="icon"
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/80 backdrop-blur-sm"
          onClick={prevImage}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/80 backdrop-blur-sm"
          onClick={nextImage}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Thumbnails */}
      <div className="grid grid-cols-4 gap-4">
        {images.map((image, index) => (
          <button
            key={index}
            className={cn(
              "aspect-square rounded-md overflow-hidden border-2",
              selectedImage === index ? "border-blue-600" : "border-transparent",
            )}
            onClick={() => setSelectedImage(index)}
          >
            <div className="relative h-full w-full">
              <Image
                src={image || "/placeholder.svg"}
                alt={`${product.name} - Image ${index + 1}`}
                fill
                unoptimized={image?.startsWith('http')}
                className="object-cover"
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
