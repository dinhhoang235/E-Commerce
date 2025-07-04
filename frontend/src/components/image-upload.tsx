"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, X, ImageIcon } from "lucide-react"
import { SafeImage } from "./safe-image"

interface ImageUploadProps {
  value?: string
  onChange: (value: string) => void
  label?: string
  className?: string
}

export function ImageUpload({ value, onChange, label = "Product Image", className }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      // Create a blob URL for the uploaded file
      const imageUrl = URL.createObjectURL(file)
      onChange(imageUrl)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleRemoveImage = () => {
    onChange("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <Label>{label}</Label>

      {value ? (
        <Card className="relative">
          <CardContent className="p-4">
            <div className="relative aspect-square w-full max-w-xs mx-auto">
              <SafeImage
                src={value || "/placeholder.svg"}
                alt="Product preview"
                width={300}
                height={300}
                className="object-contain rounded-lg w-full h-full"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8"
                onClick={handleRemoveImage}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-4 text-center">
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                Change Image
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card
          className={`border-2 border-dashed transition-colors cursor-pointer ${
            isDragging ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-slate-400"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center">
                <ImageIcon className="h-8 w-8 text-slate-400" />
              </div>
              <div>
                <p className="text-lg font-medium">Upload Product Image</p>
                <p className="text-sm text-slate-600">Drag and drop an image here, or click to select</p>
              </div>
              <Button type="button" variant="outline" className="mx-auto bg-transparent">
                <Upload className="mr-2 h-4 w-4" />
                Choose File
              </Button>
              <p className="text-xs text-slate-500">Supports: JPG, PNG, GIF up to 10MB</p>
            </div>
          </CardContent>
        </Card>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileInputChange} className="hidden" />
    </div>
  )
}
