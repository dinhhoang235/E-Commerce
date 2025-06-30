"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, X, Camera } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { uploadAvatar, removeAvatar } from "@/lib/services/auth"
import { useAuth } from "@/components/auth-provider"

interface AvatarUploadProps {
  value: string
  onChange: (value: string) => void
  userName: string
}

export function AvatarUpload({ value, onChange, userName }: AvatarUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const { setUserData } = useAuth()

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPG, PNG, GIF)",
        variant: "destructive",
      })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)

    try {
      // Upload to backend
      const updatedUser = await uploadAvatar(file)
      
      // Update the user context with the updated user data
      setUserData(updatedUser)
      
      // Update the form state with the new avatar URL
      onChange(updatedUser.avatar || "")

      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated successfully.",
      })
    } catch (error: any) {
      console.error('Avatar upload failed:', error)
      
      let errorMessage = "Failed to upload image. Please try again."
      if (error?.response?.data) {
        const errorData = error.response.data
        if (errorData.avatarFile) {
          errorMessage = Array.isArray(errorData.avatarFile) ? errorData.avatarFile[0] : errorData.avatarFile
        } else if (errorData.detail) {
          errorMessage = errorData.detail
        }
      }
      
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
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
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleRemoveAvatar = async () => {
    setIsUploading(true)
    
    try {
      // Remove avatar from backend
      const updatedUser = await removeAvatar()
      
      // Update the user context
      setUserData(updatedUser)
      
      // Clean up any blob URLs
      if (value && value.startsWith('blob:')) {
        URL.revokeObjectURL(value)
      }
      
      // Update the form state
      onChange("")
      
      toast({
        title: "Avatar removed",
        description: "Your profile picture has been removed.",
      })
    } catch (error: any) {
      console.error('Avatar removal failed:', error)
      
      let errorMessage = "Failed to remove avatar. Please try again."
      if (error?.response?.data?.detail) {
        errorMessage = error.response.data.detail
      }
      
      toast({
        title: "Removal failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="flex items-center space-x-6">
      <Avatar className="h-24 w-24">
        <AvatarImage src={value || "/placeholder.svg"} alt={userName} />
        <AvatarFallback className="text-lg bg-blue-100 text-blue-600">{getInitials(userName)}</AvatarFallback>
      </Avatar>

      <div className="flex-1">
        <Card
          className={`border-2 border-dashed transition-colors ${
            isDragging ? "border-blue-500 bg-blue-50" : "border-slate-300"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <CardContent className="p-6 text-center">
            <div className="space-y-4">
              <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                {isUploading ? (
                  <div className="w-6 h-6 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 text-slate-500" />
                )}
              </div>

              <div>
                <p className="text-sm font-medium text-slate-900">
                  {isUploading ? "Uploading..." : "Upload a new avatar"}
                </p>
                <p className="text-xs text-slate-500">Drag and drop or click to browse</p>
                <p className="text-xs text-slate-400 mt-1">JPG, PNG or GIF (max 5MB)</p>
              </div>

              <div className="flex justify-center space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Choose File
                </Button>

                {value && (
                  <Button type="button" variant="outline" size="sm" onClick={handleRemoveAvatar} disabled={isUploading}>
                    <X className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileInputChange} className="hidden" />
      </div>
    </div>
  )
}
