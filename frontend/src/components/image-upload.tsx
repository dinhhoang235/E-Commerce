"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, X, ImageIcon, Undo2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { SafeImage } from "./safe-image"

interface ImageUploadProps {
  value?: string | File
  onChange: (value: string | null | File ) => void  // null = xóa ảnh
  label?: string
  className?: string
}

export function ImageUpload({
  value,
  onChange,
  label = "Product Image",
  className,
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [isMarkedForDelete, setIsMarkedForDelete] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (value instanceof File) {
      // If value is a File object, create a preview URL
      const blobUrl = URL.createObjectURL(value)
      setPreview(blobUrl)
      setIsMarkedForDelete(false)
      
      // Cleanup the blob URL when component unmounts or value changes
      return () => URL.revokeObjectURL(blobUrl)
    } else if (typeof value === 'string') {
      // If value is a string URL
      setPreview(value)
      setIsMarkedForDelete(false)
    } else {
      // If value is null or undefined
      setPreview(null)
      setIsMarkedForDelete(false)
    }
  }, [value])

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPG, PNG, GIF)",
        variant: "destructive",
      })
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 10MB",
        variant: "destructive",
      })
      return
    }

    const blobUrl = URL.createObjectURL(file)
    setPreview(blobUrl)
    setIsMarkedForDelete(false)
    onChange(file) // Truyền File object lên parent (form)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleRemoveImage = () => {
    setIsMarkedForDelete(true)
    setPreview(null)
    onChange(null) // null = đánh dấu xóa
  }

  const handleUndoRemove = () => {
    setIsMarkedForDelete(false)
    if (value instanceof File) {
      const blobUrl = URL.createObjectURL(value)
      setPreview(blobUrl)
    } else if (typeof value === 'string') {
      setPreview(value)
    } else {
      setPreview(null)
    }
    onChange(value || null) // Khôi phục giá trị cũ
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <Label>{label}</Label>

      {preview || isMarkedForDelete ? (
        <Card className="relative">
          <CardContent className="p-4">
            <div className="relative aspect-square w-full max-w-xs mx-auto">
              {preview ? (
                <SafeImage
                  src={preview}
                  alt="Product preview"
                  width={300}
                  height={300}
                  className="object-contain rounded-lg w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground bg-slate-50 rounded-lg border">
                  Image will be removed
                </div>
              )}
              <div className="absolute top-2 right-2 flex gap-2">
                {isMarkedForDelete ? (
                  <Button type="button" variant="outline" size="icon" onClick={handleUndoRemove}>
                    <Undo2 className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="button" variant="destructive" size="icon" onClick={handleRemoveImage}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            {!isMarkedForDelete && (
              <div className="mt-4 text-center">
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  Change Image
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card
          className={`border-2 border-dashed transition-colors cursor-pointer ${
            isDragging ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-slate-400"
          }`}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={(e) => {
            e.preventDefault()
            setIsDragging(false)
          }}
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
