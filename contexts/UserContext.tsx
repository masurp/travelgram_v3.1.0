"use client"

import { createContext, useState, useContext, type ReactNode, useEffect, useMemo, useCallback } from "react"
import type { Post } from "@/lib/types"
import { trackEvent } from "@/lib/tracking"

type Condition = "condition1" | "condition2" | "condition3" | "condition4"

interface UserContextType {
  username: string
  condition: Condition | null
  profilePhoto: string | null
  bio: string
  fullName: string
  savedPosts: string[] // Array of post IDs
  followedUsers: string[] // Array of usernames
  likedPosts: string[] // Array of post IDs that the user has liked
  userCreatedPosts: Post[] // Array of posts created by the user
  participantId: string | null
  setUsername: (username: string) => void
  setCondition: (condition: Condition) => void
  setProfilePhoto: (photo: string | null) => void
  setBio: (bio: string) => void
  setFullName: (name: string) => void
  setParticipantId: (id: string) => void
  savePost: (postId: string) => void
  unsavePost: (postId: string) => void
  likePost: (postId: string) => void
  unlikePost: (postId: string) => void
  addUserCreatedPost: (post: Post) => void
  removeUserCreatedPost: (postId: string) => void
  followUser: (username: string) => void
  unfollowUser: (username: string) => void
  updateProfile: (updates: { bio?: string; fullName?: string; profilePhoto?: string | null }) => void
  migrateProfilePhotoToBlob: () => Promise<string | null>
  logout: () => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

// Check if a string is a base64 image
const isBase64Image = (str: string | null): boolean => {
  if (!str) return false
  return str.startsWith("data:image/")
}

// Try to load user data from localStorage
const loadUserData = () => {
  if (typeof window === "undefined") return null

  try {
    const userData = localStorage.getItem("userData")
    const parsedData = userData ? JSON.parse(userData) : null
    console.log(
      "UserContext - Loaded data from localStorage:",
      parsedData
        ? {
            ...parsedData,
            profilePhoto: parsedData.profilePhoto ? parsedData.profilePhoto.substring(0, 50) + "..." : null,
          }
        : null,
    )
    return parsedData
  } catch (error) {
    console.error("Error loading user data from localStorage:", error)
    return null
  }
}

// Save user data to localStorage
const saveUserData = (data: {
  username: string
  condition: Condition | null
  profilePhoto: string | null
  bio: string
  fullName: string
  savedPosts: string[]
  followedUsers: string[]
  likedPosts: string[]
  userCreatedPosts: Post[]
  participantId: string | null
}) => {
  if (typeof window === "undefined") return

  try {
    console.log("UserContext - Saving data to localStorage:", {
      ...data,
      profilePhoto: data.profilePhoto ? data.profilePhoto.substring(0, 50) + "..." : null,
    })
    localStorage.setItem("userData", JSON.stringify(data))
  } catch (error) {
    console.error("Error saving user data to localStorage:", error)
  }
}

// Optimize the UserProvider component
export function UserProvider({ children, initialCondition }: { children: ReactNode; initialCondition?: string }) {
  const [username, setUsernameState] = useState("")
  const [condition, setConditionState] = useState<Condition | null>((initialCondition as Condition) || null)
  const [profilePhoto, setProfilePhotoState] = useState<string | null>(null)
  const [bio, setBioState] = useState("")
  const [fullName, setFullNameState] = useState("")
  const [savedPosts, setSavedPosts] = useState<string[]>([])
  const [followedUsers, setFollowedUsers] = useState<string[]>([])
  const [likedPosts, setLikedPosts] = useState<string[]>([])
  const [userCreatedPosts, setUserCreatedPosts] = useState<Post[]>([])
  const [participantId, setParticipantIdState] = useState<string | null>(null)

  // Load saved user data on initial render
  useEffect(() => {
    const savedData = loadUserData()
    if (savedData) {
      setUsernameState(savedData.username || "")
      setConditionState(((initialCondition || savedData.condition) as Condition) || null)
      setProfilePhotoState(savedData.profilePhoto || null)
      setBioState(savedData.bio || "")
      setFullNameState(savedData.fullName || "")
      setSavedPosts(savedData.savedPosts || [])
      setFollowedUsers(savedData.followedUsers || [])
      setLikedPosts(savedData.likedPosts || [])
      setUserCreatedPosts(savedData.userCreatedPosts || [])
      setParticipantIdState(savedData.participantId || null)
    }
  }, [initialCondition])

  // Check if profile photo is base64 and migrate if needed
  useEffect(() => {
    const checkAndMigrateProfilePhoto = async () => {
      if (username && profilePhoto && isBase64Image(profilePhoto)) {
        console.log("UserContext - Detected base64 profile photo, attempting migration")
        try {
          const migratedPhoto = await migrateProfilePhotoToBlob()
          if (migratedPhoto) {
            console.log("UserContext - Successfully migrated profile photo to Blob")
          }
        } catch (error) {
          console.error("UserContext - Failed to migrate profile photo:", error)
        }
      }
    }

    checkAndMigrateProfilePhoto()
  }, [username, profilePhoto])

  // Function to migrate base64 profile photo to Blob
  const migrateProfilePhotoToBlob = useCallback(async (): Promise<string | null> => {
    if (!username || !profilePhoto || !isBase64Image(profilePhoto)) {
      return null
    }

    try {
      // Convert base64 to blob
      const res = await fetch(profilePhoto)
      const blob = await res.blob()

      // Create form data
      const formData = new FormData()
      formData.append("file", blob, "profile.jpg")
      formData.append("username", username)

      // Upload to Vercel Blob
      const response = await fetch("/api/upload/profile-image", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to upload profile image to Blob")
      }

      const result = await response.json()
      const blobUrl = result.url

      // Update profile photo with blob URL
      setProfilePhoto(blobUrl)

      return blobUrl
    } catch (error) {
      console.error("Error migrating profile photo to Blob:", error)
      return null
    }
  }, [username, profilePhoto])

  // Use useCallback for all functions to prevent unnecessary re-renders
  const setUsername = useCallback(
    (newUsername: string) => {
      setUsernameState(newUsername)
      saveUserData({
        username: newUsername,
        condition,
        profilePhoto,
        bio,
        fullName,
        savedPosts,
        followedUsers,
        likedPosts,
        userCreatedPosts,
        participantId,
      })
    },
    [condition, profilePhoto, bio, fullName, savedPosts, followedUsers, likedPosts, userCreatedPosts, participantId],
  )

  const setCondition = useCallback(
    (newCondition: Condition) => {
      setConditionState(newCondition)
      saveUserData({
        username,
        condition: newCondition,
        profilePhoto,
        bio,
        fullName,
        savedPosts,
        followedUsers,
        likedPosts,
        userCreatedPosts,
        participantId,
      })
    },
    [username, profilePhoto, bio, fullName, savedPosts, followedUsers, likedPosts, userCreatedPosts, participantId],
  )

  const setProfilePhoto = useCallback(
    (newPhoto: string | null) => {
      setProfilePhotoState(newPhoto)
      saveUserData({
        username,
        condition,
        profilePhoto: newPhoto,
        bio,
        fullName,
        savedPosts,
        followedUsers,
        likedPosts,
        userCreatedPosts,
        participantId,
      })
    },
    [username, condition, bio, fullName, savedPosts, followedUsers, likedPosts, userCreatedPosts, participantId],
  )

  const setBio = useCallback(
    (newBio: string) => {
      setBioState(newBio)
      saveUserData({
        username,
        condition,
        profilePhoto,
        bio: newBio,
        fullName,
        savedPosts,
        followedUsers,
        likedPosts,
        userCreatedPosts,
        participantId,
      })
    },
    [
      username,
      condition,
      profilePhoto,
      fullName,
      savedPosts,
      followedUsers,
      likedPosts,
      userCreatedPosts,
      participantId,
    ],
  )

  const setFullName = useCallback(
    (newName: string) => {
      setFullNameState(newName)
      saveUserData({
        username,
        condition,
        profilePhoto,
        bio,
        fullName: newName,
        savedPosts,
        followedUsers,
        likedPosts,
        userCreatedPosts,
        participantId,
      })
    },
    [username, condition, profilePhoto, bio, savedPosts, followedUsers, likedPosts, userCreatedPosts, participantId],
  )

  const followUser = useCallback(
    (userToFollow: string) => {
      // Don't allow following yourself
      if (userToFollow === username) return

      // Don't add duplicates
      if (!followedUsers.includes(userToFollow)) {
        const newFollowedUsers = [...followedUsers, userToFollow]
        setFollowedUsers(newFollowedUsers)
        saveUserData({
          username,
          condition,
          profilePhoto,
          bio,
          fullName,
          savedPosts,
          followedUsers: newFollowedUsers,
          likedPosts,
          userCreatedPosts,
          participantId,
        })

        // Track the follow event
        if (condition) {
          trackEvent({
            action: "follow_user",
            username,
            postOwner: userToFollow,
            condition,
            participantId,
          })
        }
      }
    },
    [
      username,
      condition,
      profilePhoto,
      bio,
      fullName,
      savedPosts,
      followedUsers,
      likedPosts,
      userCreatedPosts,
      participantId,
    ],
  )

  const unfollowUser = useCallback(
    (userToUnfollow: string) => {
      const newFollowedUsers = followedUsers.filter((user) => user !== userToUnfollow)
      setFollowedUsers(newFollowedUsers)
      saveUserData({
        username,
        condition,
        profilePhoto,
        bio,
        fullName,
        savedPosts,
        followedUsers: newFollowedUsers,
        likedPosts,
        userCreatedPosts,
        participantId,
      })

      // Track the unfollow event
      if (condition) {
        trackEvent({
          action: "unfollow_user",
          username,
          postOwner: userToUnfollow,
          condition,
          participantId,
        })
      }
    },
    [
      username,
      condition,
      profilePhoto,
      bio,
      fullName,
      savedPosts,
      followedUsers,
      likedPosts,
      userCreatedPosts,
      participantId,
    ],
  )

  const savePost = useCallback(
    (postId: string) => {
      if (!savedPosts.includes(postId)) {
        const newSavedPosts = [...savedPosts, postId]
        setSavedPosts(newSavedPosts)
        saveUserData({
          username,
          condition,
          profilePhoto,
          bio,
          fullName,
          savedPosts: newSavedPosts,
          followedUsers,
          likedPosts,
          userCreatedPosts,
          participantId,
        })
      }
    },
    [
      username,
      condition,
      profilePhoto,
      bio,
      fullName,
      savedPosts,
      followedUsers,
      likedPosts,
      userCreatedPosts,
      participantId,
    ],
  )

  const unsavePost = useCallback(
    (postId: string) => {
      const newSavedPosts = savedPosts.filter((id) => id !== postId)
      setSavedPosts(newSavedPosts)
      saveUserData({
        username,
        condition,
        profilePhoto,
        bio,
        fullName,
        savedPosts: newSavedPosts,
        followedUsers,
        likedPosts,
        userCreatedPosts,
        participantId,
      })
    },
    [
      username,
      condition,
      profilePhoto,
      bio,
      fullName,
      savedPosts,
      followedUsers,
      likedPosts,
      userCreatedPosts,
      participantId,
    ],
  )

  const likePost = useCallback(
    (postId: string) => {
      if (!likedPosts.includes(postId)) {
        const newLikedPosts = [...likedPosts, postId]
        setLikedPosts(newLikedPosts)
        saveUserData({
          username,
          condition,
          profilePhoto,
          bio,
          fullName,
          savedPosts,
          followedUsers,
          likedPosts: newLikedPosts,
          userCreatedPosts,
          participantId,
        })
      }
    },
    [
      username,
      condition,
      profilePhoto,
      bio,
      fullName,
      savedPosts,
      followedUsers,
      likedPosts,
      userCreatedPosts,
      participantId,
    ],
  )

  const unlikePost = useCallback(
    (postId: string) => {
      const newLikedPosts = likedPosts.filter((id) => id !== postId)
      setLikedPosts(newLikedPosts)
      saveUserData({
        username,
        condition,
        profilePhoto,
        bio,
        fullName,
        savedPosts,
        followedUsers,
        likedPosts: newLikedPosts,
        userCreatedPosts,
        participantId,
      })
    },
    [
      username,
      condition,
      profilePhoto,
      bio,
      fullName,
      savedPosts,
      followedUsers,
      likedPosts,
      userCreatedPosts,
      participantId,
    ],
  )

  const addUserCreatedPost = useCallback(
    (post: Post) => {
      const newUserCreatedPosts = [...userCreatedPosts, post]
      setUserCreatedPosts(newUserCreatedPosts)
      saveUserData({
        username,
        condition,
        profilePhoto,
        bio,
        fullName,
        savedPosts,
        followedUsers,
        likedPosts,
        userCreatedPosts: newUserCreatedPosts,
        participantId,
      })

      // Track the create post event
      if (condition) {
        trackEvent({
          action: "create_post",
          username,
          postId: post.id,
          postOwner: username,
          text: post.caption,
          contentUrl: post.contentUrl,
          condition,
          participantId,
        })
      }
    },
    [
      username,
      condition,
      profilePhoto,
      bio,
      fullName,
      savedPosts,
      followedUsers,
      likedPosts,
      userCreatedPosts,
      participantId,
    ],
  )

  const removeUserCreatedPost = useCallback(
    (postId: string) => {
      const newUserCreatedPosts = userCreatedPosts.filter((post) => post.id !== postId)
      setUserCreatedPosts(newUserCreatedPosts)
      saveUserData({
        username,
        condition,
        profilePhoto,
        bio,
        fullName,
        savedPosts,
        followedUsers,
        likedPosts,
        userCreatedPosts: newUserCreatedPosts,
        participantId,
      })
    },
    [
      username,
      condition,
      profilePhoto,
      bio,
      fullName,
      savedPosts,
      followedUsers,
      likedPosts,
      userCreatedPosts,
      participantId,
    ],
  )

  const updateProfile = useCallback(
    (updates: { bio?: string; fullName?: string; profilePhoto?: string | null }) => {
      const newBio = updates.bio !== undefined ? updates.bio : bio
      const newFullName = updates.fullName !== undefined ? updates.fullName : fullName
      const newProfilePhoto = updates.profilePhoto !== undefined ? updates.profilePhoto : profilePhoto

      // Update state directly
      setBioState(newBio)
      setFullNameState(newFullName)
      setProfilePhotoState(newProfilePhoto)

      // Force a save to localStorage
      const userData = {
        username,
        condition,
        profilePhoto: newProfilePhoto,
        bio: newBio,
        fullName: newFullName,
        savedPosts,
        followedUsers,
        likedPosts,
        userCreatedPosts,
        participantId,
      }

      // Save to localStorage
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("userData", JSON.stringify(userData))
        } catch (error) {
          console.error("Error saving user data to localStorage:", error)
        }
      }

      // Track profile update if the profile photo was changed
      if (condition && updates.profilePhoto !== undefined && updates.profilePhoto !== profilePhoto) {
        trackEvent({
          action: "update_profile",
          username,
          condition,
          participantId,
        })
      }
    },
    [
      username,
      condition,
      profilePhoto,
      bio,
      fullName,
      savedPosts,
      followedUsers,
      likedPosts,
      userCreatedPosts,
      participantId,
    ],
  )

  const logout = useCallback(() => {
    // Clear all user data from state
    setUsernameState("")
    setConditionState(null)
    setProfilePhotoState(null)
    setBioState("")
    setFullNameState("")
    setSavedPosts([])
    setFollowedUsers([])
    setLikedPosts([])
    setUserCreatedPosts([])
    setParticipantIdState(null)
    // Remove data from localStorage
    if (typeof window !== "undefined") {
      localStorage.removeItem("userData")
    }
  }, [])

  const setParticipantId = useCallback(
    (newId: string) => {
      setParticipantIdState(newId)
      saveUserData({
        username,
        condition,
        profilePhoto,
        bio,
        fullName,
        savedPosts,
        followedUsers,
        likedPosts,
        userCreatedPosts,
        participantId: newId,
      })
    },
    [username, condition, profilePhoto, bio, fullName, savedPosts, followedUsers, likedPosts, userCreatedPosts],
  )

  // Use useMemo for the context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      username,
      condition,
      profilePhoto,
      bio,
      fullName,
      savedPosts,
      followedUsers,
      likedPosts,
      userCreatedPosts,
      participantId,
      setUsername,
      setCondition,
      setProfilePhoto,
      setBio,
      setFullName,
      setParticipantId,
      savePost,
      unsavePost,
      likePost,
      unlikePost,
      addUserCreatedPost,
      removeUserCreatedPost,
      followUser,
      unfollowUser,
      updateProfile,
      migrateProfilePhotoToBlob,
      logout,
    }),
    [
      username,
      condition,
      profilePhoto,
      bio,
      fullName,
      savedPosts,
      followedUsers,
      likedPosts,
      userCreatedPosts,
      participantId,
      setUsername,
      setCondition,
      setProfilePhoto,
      setBio,
      setFullName,
      setParticipantId,
      savePost,
      unsavePost,
      likePost,
      unlikePost,
      addUserCreatedPost,
      removeUserCreatedPost,
      followUser,
      unfollowUser,
      updateProfile,
      migrateProfilePhotoToBlob,
      logout,
    ],
  )

  return <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}
