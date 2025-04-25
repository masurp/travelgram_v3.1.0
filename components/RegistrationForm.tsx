"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { useUser } from "@/contexts/UserContext"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Camera, Upload } from "lucide-react"
import { fileToBase64, validateImageFile } from "@/lib/fileUtils"
// Add tracking import at the top of the file
import { trackEvent } from "@/lib/tracking"

// Map URL condition parameters to internal condition codes
const conditionMap: Record<string, string> = {
  "1": "condition1",
  "2": "condition2",
  "3": "condition3",
  "4": "condition4",
  "5": "condition5",
}

export default function RegistrationForm() {
  const [inputUsername, setInputUsername] = useState("")
  const [inputFullName, setInputFullName] = useState("")
  const [inputBio, setInputBio] = useState("")
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [photoError, setPhotoError] = useState("")
  const [urlCondition, setUrlCondition] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const {
    setUsername,
    setCondition,
    setProfilePhoto: setContextProfilePhoto,
    setBio,
    setFullName,
    setParticipantId, // Add this line
    username,
    condition,
    participantId,
  } = useUser()

  // Extract condition from URL when component mounts
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search)
      const condParam = urlParams.get("cond")
      setUrlCondition(condParam)

      // Extract participant ID
      const idParam = urlParams.get("id")
      if (idParam) {
        setParticipantId(idParam)
      }

      // Log the detected condition parameter (only visible in console)
      console.log("Detected condition parameter:", condParam)
      console.log("Detected participant ID:", idParam)
    }
  }, [])

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
      setProfilePhoto(base64)
      setPhotoError("")
    } catch (error) {
      console.error("Error converting file to base64:", error)
      setPhotoError("Error processing image. Please try another.")
    }
  }

  // Fix the handleSubmit function to properly track the events
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!inputUsername.trim()) {
      setError("Please enter a username.")
      return
    }

    // Use the condition from context if available, otherwise use the selected condition
    const finalCondition = condition || conditionMap[urlCondition]

    if (!finalCondition) {
      setError("Invalid link. Please use the correct link to access this application.")
      return
    }

    // Set user data with the condition from URL
    const userUsername = inputUsername.trim()
    setUsername(userUsername)
    const userFullName = inputFullName.trim() || userUsername
    setFullName(userFullName)
    setCondition(finalCondition)
    setContextProfilePhoto(profilePhoto)

    const userBio = inputBio.trim() || ""
    setBio(userBio)

    // Track the username as a separate event
    trackEvent({
      action: "register_username",
      username: userUsername,
      text: userUsername,
      condition: finalCondition,
      participantId,
      timestamp: new Date().toISOString(),
    })

    // Track the full name as a separate event
    trackEvent({
      action: "register_fullname",
      username: userUsername,
      text: userFullName,
      condition: finalCondition,
      participantId,
      timestamp: new Date().toISOString(),
    })

    // Track the bio as a separate event
    trackEvent({
      action: "register_bio",
      username: userUsername,
      text: userBio,
      condition: finalCondition,
      participantId,
      timestamp: new Date().toISOString(),
    })
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="logo-font text-4xl font-bold tracking-wider">
            Travelgram
            <span className="inline-block ml-2 text-2xl">✈️</span>
          </h1>
          <p className="mt-2 text-gray-600">Share your travel adventures</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Photo */}
          <div className="flex flex-col items-center">
            <div className="relative mb-2">
              <Avatar className="h-24 w-24 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                {profilePhoto ? (
                  <AvatarImage src={profilePhoto} alt="Profile" />
                ) : (
                  <AvatarFallback className="bg-blue-100 text-blue-600 text-xl">
                    <Camera className="h-8 w-8" />
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
            <Button type="button" variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
              Add profile photo
            </Button>
            {photoError && <p className="text-red-500 text-xs mt-1">{photoError}</p>}
          </div>

          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
              Full Name (optional)
            </label>
            <Input
              type="text"
              id="fullName"
              value={inputFullName}
              onChange={(e) => setInputFullName(e.target.value)}
              className="mt-1"
              placeholder="Your name"
            />
          </div>

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Choose a username
            </label>
            <Input
              type="text"
              id="username"
              value={inputUsername}
              onChange={(e) => setInputUsername(e.target.value)}
              required
              className="mt-1"
            />
          </div>

          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
              Bio (optional)
            </label>
            <Textarea
              id="bio"
              value={inputBio}
              onChange={(e) => setInputBio(e.target.value)}
              placeholder="Add your bio here..."
              className="mt-1"
              rows={3}
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <Button type="submit" className="w-full">
            Start Browsing
          </Button>
        </form>
      </div>
    </div>
  )
}
