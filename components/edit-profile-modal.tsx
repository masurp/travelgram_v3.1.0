"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { X, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { fileToBase64, validateImageFile } from "@/lib/fileUtils"
import EmojiPicker from "./emoji-picker"
import { useUser } from "@/contexts/UserContext"

interface EditProfileModalProps {
  profilePhoto: string | null
  fullName: string
  username: string
  bio: string
  onClose: () => void
  onSave: (updates: { bio: string; fullName: string; profilePhoto: string | null }) => void
}

export default function EditProfileModal({
  profilePhoto,
  fullName,
  username,
  bio,
  onClose,
  onSave,
}: EditProfileModalProps) {
  const [newProfilePhoto, setNewProfilePhoto] = useState<string | null>(profilePhoto)
  const [newFullName, setNewFullName] = useState(fullName || username)
  const [newBio, setNewBio] = useState(bio)
  const [photoError, setPhotoError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bioRef = useRef<HTMLTextAreaElement>(null)
  const { updateProfile } = useUser()

  // Log when the component mounts and when props change
  useEffect(() => {
    console.log("EditProfileModal - Initial profilePhoto:", profilePhoto)
  }, [profilePhoto])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validation = validateImageFile(file)
    if (!validation.valid) {
      setPhotoError(validation.message || "Invalid image")
      return
    }

    try {
      const base64 = await fileToBase64(file)
      console.log("EditProfileModal - New profile photo set:", base64.substring(0, 50) + "...")
      setNewProfilePhoto(base64)
      setPhotoError("")
    } catch (error) {
      console.error("Error converting file to base64:", error)
      setPhotoError("Error processing image. Please try another.")
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    console.log(
      "EditProfileModal - Saving profile with photo:",
      newProfilePhoto ? newProfilePhoto.substring(0, 50) + "..." : null,
    )

    // Update directly in UserContext first
    updateProfile({
      bio: newBio.trim(),
      fullName: newFullName.trim(),
      profilePhoto: newProfilePhoto,
    })

    // Then call the onSave prop
    onSave({
      bio: newBio.trim(),
      fullName: newFullName.trim(),
      profilePhoto: newProfilePhoto,
    })

    onClose()
  }

  const handleEmojiSelect = (emoji: string) => {
    if (bioRef.current) {
      const start = bioRef.current.selectionStart || 0
      const end = bioRef.current.selectionEnd || 0
      const newBioText = newBio.substring(0, start) + emoji + newBio.substring(end)
      setNewBio(newBioText)

      // Focus back on the textarea and set cursor position after the inserted emoji
      setTimeout(() => {
        if (bioRef.current) {
          bioRef.current.focus()
          const newCursorPos = start + emoji.length
          bioRef.current.setSelectionRange(newCursorPos, newCursorPos)
        }
      }, 10)
    } else {
      setNewBio(newBio + emoji)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden w-full max-w-md">
        {/* Header */}
        <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold dark:text-white">Edit Profile</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="dark:text-white">
            <X className="h-6 w-6" />
          </Button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Profile Photo */}
          <div className="flex flex-col items-center">
            <div className="relative mb-2">
              <Avatar className="h-24 w-24 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                {newProfilePhoto ? (
                  <AvatarImage src={newProfilePhoto} alt="Profile" />
                ) : (
                  <AvatarFallback className="bg-blue-100 text-blue-600 text-xl">
                    {username.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <div
                className="absolute bottom-0 right-0 bg-blue-500 text-white p-1 rounded-full cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
              </div>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="dark:text-white"
            >
              Change profile photo
            </Button>
            {photoError && <p className="text-red-500 text-xs mt-1">{photoError}</p>}
          </div>

          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name
            </label>
            <Input
              id="fullName"
              value={newFullName}
              onChange={(e) => setNewFullName(e.target.value)}
              placeholder="Your name"
              className="dark:bg-gray-700 dark:text-white dark:border-gray-600"
            />
          </div>

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Username
            </label>
            <Input
              id="username"
              value={username}
              disabled
              className="bg-gray-100 dark:bg-gray-700 dark:text-gray-400"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Username cannot be changed</p>
          </div>

          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Bio
            </label>
            <div className="relative">
              <Textarea
                id="bio"
                ref={bioRef}
                value={newBio}
                onChange={(e) => setNewBio(e.target.value)}
                placeholder="Tell us about yourself..."
                rows={3}
                className="pr-10 dark:bg-gray-700 dark:text-white dark:border-gray-600"
              />
              <div className="absolute right-2 bottom-2">
                <EmojiPicker onEmojiSelect={handleEmojiSelect} position="top" />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 space-x-2">
            <Button type="button" variant="outline" onClick={onClose} className="dark:border-gray-600 dark:text-white">
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
