"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { X, ChevronLeft, ChevronRight, Heart, Bookmark, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Post } from "@/lib/types"
import { useUser } from "@/contexts/UserContext"
import { formatTimestamp } from "@/lib/dateUtils"
import LikeAnimation from "./like-animation"

// Import the tracking function at the top of the file
import { trackEvent } from "@/lib/tracking"

interface MobileGalleryProps {
  posts: Post[]
  initialIndex: number
  onClose: () => void
  onLike: (postId: string, liked: boolean) => void
  likedPosts: Set<string>
  onProfileClick?: (username: string) => void
}

export default function MobileGallery({
  posts,
  initialIndex,
  onClose,
  onLike,
  likedPosts,
  onProfileClick,
}: MobileGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [imageError, setImageError] = useState(false)
  const [showFullInfo, setShowFullInfo] = useState(false)
  const [showLikeAnimation, setShowLikeAnimation] = useState(false)
  const [heartPulse, setHeartPulse] = useState(false)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(posts[initialIndex]?.currentPhotoIndex || 0)
  const galleryRef = useRef<HTMLDivElement>(null)
  const infoRef = useRef<HTMLDivElement>(null)
  const { savedPosts, savePost, unsavePost, username, profilePhoto, participantId } = useUser()

  const currentPost = posts[currentIndex]
  const isLiked = currentPost ? likedPosts.has(currentPost.id) : false
  const isSaved = currentPost ? savedPosts.includes(currentPost.id) : false
  const isOwnPost = currentPost ? currentPost.username === username : false

  // Check if this post has multiple photos
  const hasMultiplePhotos = currentPost && currentPost.contentUrls && currentPost.contentUrls.length > 1

  // Get the current content URL
  const currentContentUrl = hasMultiplePhotos ? currentPost.contentUrls![currentPhotoIndex] : currentPost?.contentUrl

  // Get the correct avatar URL - use current profile photo for own posts
  const avatarUrl = isOwnPost && profilePhoto ? profilePhoto : currentPost?.userAvatar

  // Add this inside the component
  const { condition } = useUser()

  // Reset image error when post changes
  useEffect(() => {
    setImageError(false)
    // Reset expanded info state when changing posts
    setShowFullInfo(false)
    // Reset current photo index when changing posts
    if (currentPost) {
      setCurrentPhotoIndex(currentPost.currentPhotoIndex || 0)
    }
  }, [currentPost])

  // Add tracking to the MobileGallery component

  // Track post view when component mounts
  useEffect(() => {
    const currentPost = posts[currentIndex]
    if (currentPost && currentPost.id && condition) {
      console.log(`Tracking mobile gallery view for post ${currentPost.id} by ${currentPost.username}`)
      trackEvent({
        action: "view_post",
        username,
        postId: currentPost.id,
        postOwner: currentPost.username,
        condition,
        participantId,
      })
    }
  }, [currentIndex, posts, username, condition])

  // Handle swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    // Don't capture swipes if we're in the scrollable info area
    if (infoRef.current && infoRef.current.contains(e.target as Node)) {
      return
    }
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    // Don't capture swipes if we're in the scrollable info area
    if (infoRef.current && infoRef.current.contains(e.target as Node)) {
      return
    }
    setTouchEnd(e.targetTouches[0].clientX)
  }

  // Update the handleTouchEnd function to handle both post navigation and photo navigation
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    // If we have multiple photos in the current post, handle photo navigation first
    if (hasMultiplePhotos) {
      if (isLeftSwipe && currentPhotoIndex < currentPost.contentUrls!.length - 1) {
        // Navigate to next photo in the post
        setCurrentPhotoIndex(currentPhotoIndex + 1)
        setImageError(false)
        // Reset touch positions
        setTouchStart(null)
        setTouchEnd(null)
        return
      }

      if (isRightSwipe && currentPhotoIndex > 0) {
        // Navigate to previous photo in the post
        setCurrentPhotoIndex(currentPhotoIndex - 1)
        setImageError(false)
        // Reset touch positions
        setTouchStart(null)
        setTouchEnd(null)
        return
      }
    }

    // If we don't have multiple photos or we're at the edge of the photos, handle post navigation
    if (isLeftSwipe && currentIndex < posts.length - 1) {
      const newIndex = currentIndex + 1
      setCurrentIndex(newIndex)
      setCurrentPhotoIndex(posts[newIndex]?.currentPhotoIndex || 0)

      // Track post view when swiping to a new post
      const newPost = posts[newIndex]
      if (newPost && newPost.id && condition) {
        trackEvent({
          action: "view_post",
          username, // This is correct - keep this
          postId: newPost.id,
          postOwner: newPost.username,
          condition,
          participantId,
        })
      }
    }

    if (isRightSwipe && currentIndex > 0) {
      const newIndex = currentIndex - 1
      setCurrentIndex(newIndex)
      setCurrentPhotoIndex(posts[newIndex]?.currentPhotoIndex || 0)

      // Track post view when swiping to a new post
      const newPost = posts[newIndex]
      if (newPost && newPost.id && condition) {
        trackEvent({
          action: "view_post",
          username, // This is correct - keep this
          postId: newPost.id,
          postOwner: newPost.username,
          condition,
          participantId,
        })
      }
    }

    // Reset touch positions
    setTouchStart(null)
    setTouchEnd(null)
  }

  // Navigate to previous photo in the post
  const goToPreviousPhoto = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering other click handlers
    if (hasMultiplePhotos && currentPhotoIndex > 0) {
      setCurrentPhotoIndex(currentPhotoIndex - 1)
      setImageError(false) // Reset error state when changing photos
    }
  }

  // Navigate to next photo in the post
  const goToNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering other click handlers
    if (hasMultiplePhotos && currentPhotoIndex < currentPost.contentUrls!.length - 1) {
      setCurrentPhotoIndex(currentPhotoIndex + 1)
      setImageError(false) // Reset error state when changing photos
    }
  }

  // Also update the goToPrevious and goToNext functions for post navigation
  const goToPrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1
      setCurrentIndex(newIndex)
      setCurrentPhotoIndex(posts[newIndex]?.currentPhotoIndex || 0)

      // Track post view
      const newPost = posts[newIndex]
      if (newPost && newPost.id && condition) {
        trackEvent({
          action: "view_post",
          username,
          postId: newPost.id,
          postOwner: newPost.username,
          condition,
          participantId,
        })
      }
    }
  }

  const goToNext = () => {
    if (currentIndex < posts.length - 1) {
      const newIndex = currentIndex + 1
      setCurrentIndex(newIndex)
      setCurrentPhotoIndex(posts[newIndex]?.currentPhotoIndex || 0)

      // Track post view
      const newPost = posts[newIndex]
      if (newPost && newPost.id && condition) {
        trackEvent({
          action: "view_post",
          username,
          postId: newPost.id,
          postOwner: newPost.username,
          condition,
          participantId,
        })
      }
    }
  }

  // Update the handleLike function to track with post owner
  const handleLike = () => {
    if (currentPost) {
      const newLikedState = !isLiked
      onLike(currentPost.id, newLikedState)

      if (newLikedState) {
        // Show animation when liking
        setShowLikeAnimation(true)
        // Also add a pulse  {
        // Show animation when liking
        setShowLikeAnimation(true)
        // Also add a pulse effect to the heart button
        setHeartPulse(true)
        setTimeout(() => setHeartPulse(false), 300)
      }

      // Track the like/unlike event directly here
      if (condition) {
        trackEvent({
          action: newLikedState ? "like_post" : "unlike_post",
          username,
          postId: currentPost.id,
          postOwner: currentPost.username,
          condition,
          participantId,
        })
      }
    }
  }

  const handleAnimationComplete = () => {
    setShowLikeAnimation(false)
  }

  // Update the handleSave function to track the event directly
  const handleSave = () => {
    if (!currentPost) return

    // Track the save/unsave event directly here
    if (condition) {
      trackEvent({
        action: isSaved ? "unsave_post" : "save_post",
        username,
        postId: currentPost.id,
        postOwner: currentPost.username,
        condition,
        participantId,
      })
    }

    if (isSaved) {
      unsavePost(currentPost.id)
    } else {
      savePost(currentPost.id)
    }
  }

  const handleImageError = () => {
    setImageError(true)
  }

  // Close on background click
  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === galleryRef.current) {
      onClose()
    }
  }

  // Toggle expanded info view
  const toggleInfoView = () => {
    setShowFullInfo(!showFullInfo)
  }

  if (!currentPost) return null

  return (
    <div
      ref={galleryRef}
      className="fixed inset-0 z-[1001] bg-black bg-opacity-90 flex flex-col touch-none"
      onClick={handleBackgroundClick}
    >
      {/* Header */}
      <div className="p-3 flex justify-between items-center text-white">
        <div className="font-medium text-sm">{currentPost.username}</div>
        <Button variant="ghost" size="icon" className="text-white" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Image area with touch handlers */}
      <div
        className="flex-1 flex items-center justify-center relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Navigation arrows between posts */}
        {currentIndex > 0 && (
          <button
            onClick={goToPrevious}
            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-50 rounded-full p-2 z-10"
            aria-label="Previous post"
          >
            <ChevronLeft className="h-6 w-6 text-black" />
          </button>
        )}

        {currentIndex < posts.length - 1 && (
          <button
            onClick={goToNext}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-50 rounded-full p-2 z-10"
            aria-label="Next post"
          >
            <ChevronRight className="h-6 w-6 text-black" />
          </button>
        )}

        {/* Image */}
        <div className="w-full h-full flex items-center justify-center">
          {imageError ? (
            <div className="text-white text-center">Image not available</div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              <Image
                src={currentContentUrl || "/placeholder.svg"}
                alt={currentPost.caption || "Post image"}
                layout="fill"
                objectFit="contain"
                onError={handleImageError}
                onDoubleClick={() => {
                  if (!isLiked) {
                    setShowLikeAnimation(true)
                    setHeartPulse(true)
                    setTimeout(() => setHeartPulse(false), 300)
                    onLike(currentPost.id, true)
                  }
                }}
              />

              {/* Photo counter for multiple photos */}
              {hasMultiplePhotos && (
                <div className="absolute top-4 right-4 bg-black bg-opacity-60 text-white text-sm px-2 py-1 rounded-md z-30">
                  {currentPhotoIndex + 1}/{currentPost.contentUrls!.length}
                </div>
              )}

              {/* Navigation arrows for multiple photos at the bottom */}
              {hasMultiplePhotos && (
                <div className="absolute bottom-20 left-0 right-0 flex justify-center items-center space-x-4 z-20">
                  {currentPhotoIndex > 0 && (
                    <button
                      onClick={goToPreviousPhoto}
                      className="bg-black bg-opacity-70 hover:bg-opacity-90 rounded-full p-2 transition-all"
                      aria-label="Previous photo"
                    >
                      <ChevronLeft className="h-4 w-4 text-white" />
                    </button>
                  )}

                  {/* Photo indicators (dots) */}
                  <div className="flex justify-center gap-1.5">
                    {currentPost.contentUrls!.map((_, index) => (
                      <div
                        key={`indicator-${index}`}
                        className={`h-1.5 w-1.5 rounded-full ${
                          index === currentPhotoIndex ? "bg-white" : "bg-white bg-opacity-50"
                        }`}
                      />
                    ))}
                  </div>

                  {currentPhotoIndex < currentPost.contentUrls!.length - 1 && (
                    <button
                      onClick={goToNextPhoto}
                      className="bg-black bg-opacity-70 hover:bg-opacity-90 rounded-full p-2 transition-all"
                      aria-label="Next photo"
                    >
                      <ChevronRight className="h-4 w-4 text-white" />
                    </button>
                  )}
                </div>
              )}

              {/* Like animation overlay */}
              <LikeAnimation isActive={showLikeAnimation} onAnimationComplete={handleAnimationComplete} />
            </div>
          )}
        </div>
      </div>

      {/* Footer with actions - now with scrollable content */}
      <div className="relative bg-black bg-opacity-50">
        {/* Actions bar - always visible */}
        <div className="sticky top-0 bg-black bg-opacity-70 p-2 z-10">
          <div className="flex justify-between mb-1">
            <div className="flex gap-4 items-center">
              <Button
                variant="ghost"
                size="icon"
                className={`text-white p-0 h-8 w-8 ${heartPulse ? "animate-pulse-scale" : ""}`}
                onClick={handleLike}
              >
                <Heart className={`h-5 w-5 ${isLiked ? "fill-red-500 text-red-500" : "text-white"}`} />
              </Button>
              <span className="text-white text-xs">{currentPost.likes}</span>
            </div>
            <Button variant="ghost" size="icon" className="text-white p-0 h-8 w-8" onClick={handleSave}>
              <Bookmark className={`h-5 w-5 ${isSaved ? "fill-white text-white" : "text-white"}`} />
            </Button>
          </div>
        </div>

        {/* Scrollable content area */}
        <div
          ref={infoRef}
          className={`overflow-y-auto px-3 pb-20 ${showFullInfo ? "max-h-[40vh]" : "max-h-[20vh]"}`}
          style={{ overscrollBehavior: "contain" }}
        >
          {/* Caption */}
          {currentPost.caption && (
            <div className="text-white mb-3 text-xs">
              <span
                className="font-bold mr-1 cursor-pointer"
                onClick={() => {
                  onClose()
                  onProfileClick && onProfileClick(currentPost.username)
                }}
              >
                {currentPost.username}
              </span>
              {currentPost.caption}
            </div>
          )}

          {/* Location */}
          {currentPost.location && <div className="text-white text-xs mb-3 opacity-80">{currentPost.location}</div>}

          {/* Timestamp */}
          {currentPost.timestamp && (
            <div className="text-white text-xs mb-3 opacity-60">{formatTimestamp(currentPost.timestamp)}</div>
          )}

          {/* Comments - only shown if we have them */}
          {currentPost.comments && currentPost.comments.length > 0 && (
            <div className="mt-3 space-y-3">
              <h3 className="text-white text-xs font-semibold">Comments</h3>
              {[...currentPost.comments]
                .sort((a, b) => {
                  // If order property exists, sort by it (lower values are older)
                  if (a.order !== undefined && b.order !== undefined) {
                    return a.order - b.order
                  }
                  // Fallback to timestamp sorting (oldest to newest)
                  return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                })
                .map((comment) => (
                  <div key={comment.id} className="text-white text-xs">
                    <span
                      className="font-bold mr-1 cursor-pointer"
                      onClick={() => {
                        onClose()
                        onProfileClick && onProfileClick(comment.username)
                      }}
                    >
                      {comment.username}
                    </span>
                    {comment.text}
                    <p className="text-2xs opacity-60 mt-1">{formatTimestamp(comment.timestamp)}</p>
                  </div>
                ))}
            </div>
          )}

          {/* Extra padding at the bottom for better scrolling */}
          <div className="h-12"></div>
        </div>

        {/* Expand/collapse button - now larger and more prominent */}
        <button
          className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-80 text-white py-3 text-sm z-20 flex items-center justify-center"
          onClick={toggleInfoView}
        >
          {showFullInfo ? "Show less" : "Show more"}
          <ChevronDown className={`h-4 w-4 ml-1.5 transition-transform ${showFullInfo ? "rotate-180" : ""}`} />
        </button>
      </div>
    </div>
  )
}
