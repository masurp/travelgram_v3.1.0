"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useUser } from "@/contexts/UserContext"
import { useDarkMode } from "@/contexts/DarkModeContext"
import { ChevronLeft, Upload, Moon, Sun, Bell, Shield, LogOut } from "lucide-react"
import { fileToBase64, validateImageFile } from "@/lib/fileUtils"

interface SettingsProps {
  onBack: () => void
}

export default function Settings({ onBack }: SettingsProps) {
  const { username, fullName, bio, profilePhoto, logout, updateProfile } = useUser()
  const { isDarkMode, toggleDarkMode } = useDarkMode()

  const [newFullName, setNewFullName] = useState(fullName || username)
  const [newBio, setNewBio] = useState(bio)
  const [newProfilePhoto, setNewProfilePhoto] = useState<string | null>(profilePhoto)
  const [photoError, setPhotoError] = useState("")
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [isPrivateAccount, setIsPrivateAccount] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Log when the component mounts and when props change
  useEffect(() => {
    console.log("Settings - Initial profilePhoto:", profilePhoto ? profilePhoto.substring(0, 50) + "..." : null)
    setNewProfilePhoto(profilePhoto)
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
      console.log("Settings - New profile photo set:", base64.substring(0, 50) + "...")
      setNewProfilePhoto(base64)
      setPhotoError("")
    } catch (error) {
      console.error("Error converting file to base64:", error)
      setPhotoError("Error processing image. Please try another.")
    }
  }

  const handleSaveChanges = () => {
    setIsSaving(true)

    console.log("Settings - Saving with photo:", newProfilePhoto ? newProfilePhoto.substring(0, 50) + "..." : null)

    // Update the profile
    updateProfile({
      fullName: newFullName,
      bio: newBio,
      profilePhoto: newProfilePhoto,
    })

    // Force a reload of the page to ensure all components reflect the changes
    setTimeout(() => {
      setIsSaving(false)
      // Optionally, you could force a reload here if needed
      // window.location.reload();
    }, 500)
  }

  const handleLogout = () => {
    logout()
  }

  const toggleNotifications = () => {
    setNotificationsEnabled(!notificationsEnabled)
  }

  const togglePrivateAccount = () => {
    setIsPrivateAccount(!isPrivateAccount)
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center mb-8">
        <Button variant="ghost" onClick={onBack} className="mr-2">
          <ChevronLeft className="h-5 w-5 mr-1" />
          Back
        </Button>
        <h1 className="text-2xl font-bold dark:text-white">Settings</h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 dark:text-white">Account Settings</h2>

        <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
          <div className="relative">
            <Avatar
              className="h-24 w-24 cursor-pointer"
              onClick={() => document.getElementById("profile-upload")?.click()}
            >
              {newProfilePhoto ? (
                <AvatarImage
                  src={newProfilePhoto}
                  alt={username}
                  onError={(e) => {
                    console.error("Error loading profile photo in Settings:", e)
                    e.currentTarget.src = "" // Clear the src to trigger fallback
                  }}
                />
              ) : (
                <AvatarFallback className="bg-blue-100 text-blue-600 text-xl dark:bg-gray-700 dark:text-gray-200">
                  {username.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            <div
              className="absolute bottom-0 right-0 bg-blue-500 text-white p-1 rounded-full cursor-pointer"
              onClick={() => document.getElementById("profile-upload")?.click()}
            >
              <Upload className="h-4 w-4" />
            </div>
            <input type="file" id="profile-upload" className="hidden" accept="image/*" onChange={handleFileChange} />
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Username
              </label>
              <Input id="username" value={username} disabled className="bg-gray-100 dark:bg-gray-700 dark:text-white" />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Username cannot be changed</p>
            </div>

            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full Name
              </label>
              <Input
                id="fullName"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                placeholder="Your name"
                className="dark:bg-gray-700 dark:text-white dark:border-gray-600"
              />
            </div>
          </div>
        </div>

        <div className="mb-6">
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Bio
          </label>
          <Textarea
            id="bio"
            value={newBio}
            onChange={(e) => setNewBio(e.target.value)}
            placeholder="Tell us about yourself..."
            rows={3}
            className="dark:bg-gray-700 dark:text-white dark:border-gray-600"
          />
        </div>

        {photoError && <p className="text-red-500 text-sm mb-4">{photoError}</p>}

        <Button onClick={handleSaveChanges} disabled={isSaving} className="dark:bg-blue-600 dark:hover:bg-blue-700">
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 dark:text-white">Preferences</h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {isDarkMode ? <Moon className="h-5 w-5 mr-3 text-white" /> : <Sun className="h-5 w-5 mr-3" />}
              <span className="dark:text-white">Dark Mode</span>
            </div>
            <Button
              variant={isDarkMode ? "default" : "outline"}
              onClick={toggleDarkMode}
              className="dark:border-gray-600"
            >
              {isDarkMode ? "On" : "Off"}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Bell className="h-5 w-5 mr-3 dark:text-white" />
              <span className="dark:text-white">Notifications</span>
            </div>
            <Button
              variant={notificationsEnabled ? "default" : "outline"}
              onClick={toggleNotifications}
              className="dark:border-gray-600"
            >
              {notificationsEnabled ? "On" : "Off"}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Shield className="h-5 w-5 mr-3 dark:text-white" />
              <span className="dark:text-white">Private Account</span>
            </div>
            <Button
              variant={isPrivateAccount ? "default" : "outline"}
              onClick={togglePrivateAccount}
              className="dark:border-gray-600"
            >
              {isPrivateAccount ? "On" : "Off"}
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 dark:text-white">Account Actions</h2>

        <Button variant="destructive" onClick={handleLogout} className="w-full">
          <LogOut className="h-5 w-5 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  )
}
