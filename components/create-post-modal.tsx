"use client"

import type React from "react"

import { useState, useRef } from "react"
import Image from "next/image"
import { X, Camera, LinkIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useUser } from "@/contexts/UserContext"
import type { Post } from "@/lib/types"
import { validateImageFile } from "@/lib/fileUtils"
import EmojiPicker from "./emoji-picker"

interface CreatePostModalProps {
  onClose: () => void
  onCreatePost: (post: Omit<Post, "id" | "likes" | "comments">) => void
}

export default function CreatePostModal({ onClose, onCreatePost }: CreatePostModalProps) {
  const [step, setStep] = useState<"select" | "details">("select")
  const [imageUrl, setImageUrl] = useState<string>("")
  const [caption, setCaption] = useState<string>("")
  const [location, setLocation] = useState<string>("")
  const [customUrl, setCustomUrl] = useState<string>("")
  const [imageError, setImageError] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const [urlError, setUrlError] = useState("")
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const captionRef = useRef<HTMLTextAreaElement>(null)
  const { username, profilePhoto } = useUser()

  const handleImageSelect = (url: string) => {
    setImageUrl(url)
    setStep("details")
  }

  const handleCustomUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customUrl.trim()) {
      setUrlError("Please enter a valid URL")
      return
    }

    // Basic URL validation
    try {
      new URL(customUrl)
      setUrlError("")
      handleImageSelect(customUrl.trim())
    } catch (e) {
      setUrlError("Please enter a valid URL")
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validation = validateImageFile(file)
    if (!validation.valid) {
      setUploadError(validation.message || "Invalid image")
      return
    }

    try {
      setUploading(true)

      // Create form data
      const formData = new FormData()
      formData.append("file", file)
      formData.append("username", username)

      // Upload to Vercel Blob
      const response = await fetch("/api/upload/post-image", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to upload image")
      }

      const result = await response.json()

      // Use the image URL from Blob storage
      handleImageSelect(result.url)
      setUploadError("")
    } catch (error) {
      console.error("Error uploading post image:", error)
      setUploadError("Error uploading image. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!imageUrl) return

    const newPost: Omit<Post, "id" | "likes" | "comments"> = {
      username,
      userAvatar: profilePhoto || "/placeholder.svg?height=50&width=50",
      contentUrl: imageUrl,
      contentType: "image",
      caption: caption.trim(),
      timestamp: "1 min ago", // Use "1 min ago" instead of actual date
    }

    if (location.trim()) {
      newPost.location = location.trim()
    }

    onCreatePost(newPost)
    onClose()
  }

  const handleImageError = () => {
    setImageError(true)
  }

  const handleEmojiSelect = (emoji: string) => {
    if (captionRef.current) {
      const start = captionRef.current.selectionStart || 0
      const end = captionRef.current.selectionEnd || 0
      const newCaption = caption.substring(0, start) + emoji + caption.substring(end)
      setCaption(newCaption)

      // Focus back on the textarea and set cursor position after the inserted emoji
      setTimeout(() => {
        if (captionRef.current) {
          captionRef.current.focus()
          const newCursorPos = start + emoji.length
          captionRef.current.setSelectionRange(newCursorPos, newCursorPos)
        }
      }, 10)
    } else {
      setCaption(caption + emoji)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg overflow-hidden w-full max-w-lg">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold">Create New Post</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-6 w-6" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === "select" ? (
            <div className="space-y-8">
              {/* Upload from device */}
              <div className="flex flex-col items-center space-y-4">
                <div
                  className="w-full max-w-md aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors p-4"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="h-12 w-12 text-gray-400 mb-2" />
                  <p className="text-gray-600 text-center font-medium">Upload a photo from your device</p>
                  <p className="text-gray-500 text-center text-sm mt-2">Click to browse your files</p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </div>
                {uploadError && <p className="text-red-500 text-sm">{uploadError}</p>}
                {uploading && <p className="text-blue-500 text-sm">Uploading image...</p>}
              </div>

              {/* Divider */}
              <div className="flex items-center">
                <div className="flex-grow border-t border-gray-300"></div>
                <span className="mx-4 text-gray-500">OR</span>
                <div className="flex-grow border-t border-gray-300"></div>
              </div>

              {/* Enter image URL */}
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-700 flex items-center justify-center">
                    <LinkIcon className="h-5 w-5 mr-2" />
                    Enter an image URL
                  </h3>
                </div>
                <form onSubmit={handleCustomUrlSubmit} className="flex flex-col space-y-3">
                  <Input
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    className="flex-grow"
                  />
                  {urlError && <p className="text-red-500 text-sm">{urlError}</p>}
                  <Button type="submit" className="w-full">
                    Use This Image
                  </Button>
                </form>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="aspect-square relative border rounded overflow-hidden mb-4">
                {imageError ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500">
                    Image not available
                  </div>
                ) : (
                  <Image
                    src={imageUrl || "/placeholder.svg"}
                    alt="Selected image"
                    fill
                    className="object-cover"
                    onError={handleImageError}
                  />
                )}
              </div>

              <div>
                <label htmlFor="caption" className="block text-sm font-medium text-gray-700 mb-1">
                  Caption
                </label>
                <div className="relative">
                  <Textarea
                    id="caption"
                    ref={captionRef}
                    placeholder="Write a caption..."
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    rows={3}
                    className="pr-10"
                  />
                  <div className="absolute right-2 bottom-2">
                    <EmojiPicker onEmojiSelect={handleEmojiSelect} position="top" />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                  Location (optional)
                </label>
                <Input
                  id="location"
                  placeholder="Add location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={() => setStep("select")}>
                  Back
                </Button>
                <Button type="submit">Share</Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
