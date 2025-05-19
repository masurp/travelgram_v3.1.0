"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Upload, X, Loader2 } from "lucide-react"
import { fileToBase64, validateImageFile } from "@/lib/fileUtils"
import { useUser } from "@/contexts/UserContext"

interface EditProfileModalProps {
  profilePhoto: string | null
  fullName: string
  username: string
  bio: string
  onClose: () => void
  onSave: (data: { profilePhoto: string | null; fullName: string; bio: string }) => void
}

export default function EditProfileModal({
  profilePhoto: initialProfilePhoto,
  fullName: initialFullName,
  username,
  bio: initialBio,
  onClose,
  onSave,
}: EditProfileModalProps) {
  const [newProfilePhoto, setNewProfilePhoto] = useState<string | null>(initialProfilePhoto)
  const [fullName, setFullName] = useState(initialFullName)
  const [bio, setBio] = useState(initialBio)
  const [photoError, setPhotoError] = useState("")
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { participantId, condition } = useUser()

  // Always upload to blob
  const uploadToBlob = true

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validation = validateImageFile(file)
    if (!validation.valid) {
      setPhotoError(validation.message || "Invalid image")
      return
    }

    try {
      setUploading(true)
      setPhotoError("")

      // Create a temporary preview using base64 for immediate feedback
      const base64Preview = await fileToBase64(file)
      setNewProfilePhoto(base64Preview)

      // Upload to Vercel Blob
      const formData = new FormData()
      formData.append("file", file)
      formData.append("username", username)

      const response = await fetch("/api/upload/profile-image", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to upload image")
      }

      const result = await response.json()
      console.log("Profile photo updated in Blob:", result.url)
      setNewProfilePhoto(result.url)
    } catch (error) {
      console.error("Error processing profile image:", error)
      setPhotoError("Error processing image. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  const handleRemovePhoto = () => {
    setNewProfilePhoto(null)
  }

  const handleSave = () => {
    onSave({
      profilePhoto: newProfilePhoto,
      fullName,
      bio,
    })
  }

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const modal = document.getElementById("edit-profile-modal")
      if (modal && !modal.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [onClose])

  // Handle escape key to close
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }

    document.addEventListener("keydown", handleEscKey)
    return () => {
      document.removeEventListener("keydown", handleEscKey)
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        id="edit-profile-modal"
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold dark:text-white">Edit Profile</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="space-y-6">
            {/* Profile Photo */}
            <div className="flex flex-col items-center">
              <div className="relative mb-2">
                <Avatar className="h-24 w-24 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  {newProfilePhoto ? (
                    <AvatarImage src={newProfilePhoto || "/placeholder.svg"} alt={username} />
                  ) : (
                    <AvatarFallback className="bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-200">
                      {username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div
                  className="absolute bottom-0 right-0 bg-blue-500 text-white p-1 rounded-full cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                </div>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? "Uploading..." : "Change photo"}
                </Button>
                {newProfilePhoto && (
                  <Button type="button" variant="ghost" size="sm" onClick={handleRemovePhoto} disabled={uploading}>
                    Remove
                  </Button>
                )}
              </div>
              {photoError && <p className="text-red-500 text-xs mt-1">{photoError}</p>}
            </div>

            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Full Name
              </label>
              <Input
                type="text"
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Username - read only */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Username
              </label>
              <Input
                type="text"
                id="username"
                value={username}
                disabled
                className="mt-1 bg-gray-100 dark:bg-gray-700"
              />
            </div>

            {/* Bio */}
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Bio
              </label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="mt-1"
                rows={3}
                placeholder="Tell us about yourself..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={onClose} disabled={uploading}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={uploading}>
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
