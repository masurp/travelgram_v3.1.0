"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Heart, Send, Bookmark, X, ChevronLeft, ChevronRight, Share, Flag, UserPlus, UserCheck } from "lucide-react"
import type { Post, Comment } from "@/lib/types"
import { formatTimestamp } from "@/lib/dateUtils"
import { parseISO } from "date-fns"
import { useUser } from "@/contexts/UserContext"
import EmojiPicker from "./emoji-picker"
import ReportOverlay from "./report-overlay"
import LikeAnimation from "./like-animation"
import PostMenu from "./post-menu"
// Import the tracking function at the top of the file
import { trackEvent } from "@/lib/tracking"

interface PostModalProps {
  post: Post
  onClose: () => void
  onAddComment: (postId: string, comment: Comment) => void
  onProfileClick: (username: string) => void
  onLike: (postId: string, liked: boolean) => void
  isLiked: boolean
  isSaved: boolean
  onSave: () => void
  // Navigation props
  allPosts?: Post[]
  currentIndex?: number
  onNavigate?: (direction: "next" | "prev") => void
  // Edit and delete props
  onEditPost?: (postId: string, updates: { caption: string; location?: string }) => void
  onDeletePost?: (postId: string) => void
  // Report prop
  onReportPost?: (postId: string) => void
  // Follow props
  isFollowing?: boolean
  onFollowToggle?: () => void
  isOwnPost?: boolean
}

export default function PostModal({
  post,
  onClose,
  onAddComment,
  onProfileClick,
  onLike,
  isLiked,
  isSaved,
  onSave,
  allPosts = [],
  currentIndex = -1,
  onNavigate,
  onEditPost,
  onDeletePost,
  onReportPost,
  isFollowing = false,
  onFollowToggle,
  isOwnPost = false,
}: PostModalProps) {
  const [newComment, setNewComment] = React.useState("")
  const [comments, setComments] = React.useState<Comment[]>(() => {
    return Array.isArray(post.comments) ? post.comments : []
  })
  const [imageError, setImageError] = useState(false)
  const [avatarError, setAvatarError] = useState(false)
  const [showReportOverlay, setShowReportOverlay] = useState(false)
  const [showLikeAnimation, setShowLikeAnimation] = useState(false)
  const [heartPulse, setHeartPulse] = useState(false)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(post.currentPhotoIndex || 0)
  const { username, profilePhoto } = useUser()
  const commentInputRef = useRef<HTMLInputElement>(null)
  const [currentLikes, setCurrentLikes] = useState(post.likes)
  // Add this inside the component, near the top
  const { condition, participantId } = useUser()
  const [showFullComments, setShowFullComments] = useState(false)

  // Check if this post has multiple photos
  const hasMultiplePhotos = post.contentUrls && post.contentUrls.length > 1

  // Get the current content URL
  const currentContentUrl = hasMultiplePhotos ? post.contentUrls![currentPhotoIndex] : post.contentUrl

  // Get the correct avatar URL - use current profile photo for own posts
  const avatarUrl = isOwnPost && profilePhoto ? profilePhoto : post.userAvatar

  const handleImageError = () => {
    setImageError(true)
  }

  const handleAvatarError = () => {
    setAvatarError(true)
  }

  // Update the handleLike function to track with post owner
  const handleLike = () => {
    const newLikedState = !isLiked
    onLike(post.id, newLikedState)

    // Update the local likes count
    setCurrentLikes((prev) => (newLikedState ? prev + 1 : prev - 1))

    if (newLikedState) {
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
        postId: post.id,
        postOwner: post.username,
        condition,
        participantId,
      })
    }
  }

  const handleAnimationComplete = () => {
    setShowLikeAnimation(false)
  }

  const handleEmojiSelect = (emoji: string) => {
    setNewComment((prev) => prev + emoji)
    // Focus the input after adding an emoji
    if (commentInputRef.current) {
      commentInputRef.current.focus()
    }
  }

  const handleShare = () => {
    // Share functionality - for now just copy the post info to clipboard
    const shareText = `Check out this post by ${post.username}: ${post.caption || ""}`
    navigator.clipboard
      .writeText(shareText)
      .then(() => {
        alert("Post info copied to clipboard!")
      })
      .catch((err) => {
        console.error("Could not copy text: ", err)
      })
  }

  // Update the handleReport function to track the report
  const handleReport = () => {
    setShowReportOverlay(true)

    // Track the report event
    if (condition) {
      trackEvent({
        action: "report_post",
        username,
        postId: post.id,
        postOwner: post.username,
        condition,
        participantId,
      })
    }
  }

  // Update the handleReportComplete function in PostModal
  const handleReportComplete = () => {
    setShowReportOverlay(false)

    if (onReportPost) {
      onReportPost(post.id)
      onClose()
    }
  }

  const handleFollow = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onFollowToggle) {
      onFollowToggle()
    }
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
    if (hasMultiplePhotos && currentPhotoIndex < post.contentUrls!.length - 1) {
      setCurrentPhotoIndex(currentPhotoIndex + 1)
      setImageError(false) // Reset error state when changing photos
    }
  }

  // Navigation functions between posts
  const canNavigate = allPosts.length > 1 && currentIndex >= 0 && onNavigate
  const hasPrev = canNavigate && currentIndex > 0
  const hasNext = canNavigate && currentIndex < allPosts.length - 1

  const handlePrev = useCallback(() => {
    if (hasPrev && onNavigate) {
      onNavigate("prev")
    }
  }, [hasPrev, onNavigate])

  const handleNext = useCallback(() => {
    if (hasNext && onNavigate) {
      onNavigate("next")
    }
  }, [hasNext, onNavigate])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        // If we have multiple photos and not at the first photo, navigate to previous photo
        if (hasMultiplePhotos && currentPhotoIndex > 0) {
          goToPreviousPhoto(e as unknown as React.MouseEvent)
        }
        // Otherwise navigate to previous post
        else if (hasPrev) {
          handlePrev()
        }
      } else if (e.key === "ArrowRight") {
        // If we have multiple photos and not at the last photo, navigate to next photo
        if (hasMultiplePhotos && currentPhotoIndex < post.contentUrls!.length - 1) {
          goToNextPhoto(e as unknown as React.MouseEvent)
        }
        // Otherwise navigate to next post
        else if (hasNext) {
          handleNext()
        }
      } else if (e.key === "Escape") {
        onClose()
      }
    }

    // Track post view when modal opens
    if (post.id && condition) {
      console.log(`Tracking post modal view for post ${post.id} by ${post.username}`)
      trackEvent({
        action: "view_post",
        username,
        postId: post.id,
        postOwner: post.username,
        condition,
        participantId,
      })
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [
    handlePrev,
    handleNext,
    onClose,
    post.id,
    post.username,
    username,
    condition,
    hasMultiplePhotos,
    currentPhotoIndex,
    post.contentUrls,
  ])

  useEffect(() => {
    setImageError(false)
    setAvatarError(false)
  }, [post.contentUrl, post.userAvatar])

  useEffect(() => {
    // Update comments when they change from props
    if (post.comments) {
      setComments(post.comments)
    }
  }, [post.comments])

  useEffect(() => {
    setCurrentLikes(post.likes)
  }, [post.likes])

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newComment.trim()) {
      const comment: Comment = {
        id: `c${Date.now()}`,
        username: username,
        text: newComment.trim(),
        timestamp: "1 min ago", // Use "1 min ago" instead of actual date
        // Set a very high order value to ensure it appears at the bottom
        order: 999999,
      }

      // Add the comment to the local state for immediate UI update
      // Add to the end of the array so it appears at the bottom
      setComments((prevComments) => [...prevComments, comment])

      // Call the parent handler to update the central data store
      onAddComment(post.id, comment)

      // Clear the input
      setNewComment("")

      // Track comment
      if (condition) {
        trackEvent({
          action: "comment_post",
          username,
          postId: post.id,
          postOwner: post.username,
          text: comment.text,
          condition,
          participantId,
        })
      }
    }
  }

  // Sort comments in ascending order (oldest to newest)
  const sortedComments = [...comments].sort((a, b) => {
    // If order property exists, sort by it (lower values are older)
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order
    }
    // Fallback to timestamp sorting (oldest to newest)
    return parseISO(a.timestamp).getTime() - parseISO(b.timestamp).getTime()
  })

  // Update the handleSave function to track the event directly
  const handleSave = () => {
    // Track the save/unsave event directly here
    if (condition) {
      trackEvent({
        action: isSaved ? "unsave_post" : "save_post",
        username,
        postId: post.id,
        postOwner: post.username,
        condition,
        participantId,
      })
    }

    onSave()
  }

  const toggleCommentsView = () => {
    setShowFullComments(!showFullComments)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden w-full max-w-6xl h-[90vh] flex relative">
        {showReportOverlay && (
          <div className="absolute inset-0 z-50">
            <ReportOverlay onComplete={handleReportComplete} />
          </div>
        )}

        {/* Left side - Image/Video */}
        <div className="w-2/3 relative bg-black flex items-center justify-center">
          {/* Navigation arrows between posts - original style */}
          {hasPrev && (
            <button
              onClick={handlePrev}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-70 rounded-full p-3 hover:bg-opacity-90 transition-all z-10"
              aria-label="Previous post"
            >
              <ChevronLeft className="h-6 w-6 text-black" />
            </button>
          )}

          {hasNext && (
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-70 rounded-full p-3 hover:bg-opacity-90 transition-all z-10"
              aria-label="Next post"
            >
              <ChevronRight className="h-6 w-6 text-black" />
            </button>
          )}

          {/* Image */}
          <div className="w-full h-full flex items-center justify-center">
            {post.contentType === "image" ? (
              imageError ? (
                <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                  Image not available
                </div>
              ) : (
                <div className="relative w-full h-full">
                  <Image
                    src={currentContentUrl || "/placeholder.svg"}
                    alt={post.caption}
                    layout="fill"
                    objectFit="contain"
                    onError={handleImageError}
                    onDoubleClick={() => {
                      if (!isLiked) {
                        setShowLikeAnimation(true)
                        setHeartPulse(true)
                        setTimeout(() => setHeartPulse(false), 300)
                        onLike(post.id, true)
                      }
                    }}
                  />

                  {/* Photo counter for multiple photos */}
                  {hasMultiplePhotos && (
                    <div className="absolute top-4 right-4 bg-black bg-opacity-60 text-white text-sm px-2 py-1 rounded-md z-30">
                      {currentPhotoIndex + 1}/{post.contentUrls!.length}
                    </div>
                  )}

                  {/* Navigation arrows for multiple photos - positioned at the bottom of the image */}
                  {hasMultiplePhotos && (
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center space-x-4 z-20">
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
                        {post.contentUrls!.map((_, index) => (
                          <div
                            key={`indicator-${index}`}
                            className={`h-1.5 w-1.5 rounded-full ${
                              index === currentPhotoIndex ? "bg-white" : "bg-white bg-opacity-50"
                            }`}
                          />
                        ))}
                      </div>

                      {currentPhotoIndex < post.contentUrls!.length - 1 && (
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
              )
            ) : (
              <video src={currentContentUrl} controls className="max-w-full max-h-full" />
            )}
          </div>
        </div>

        {/* Right side - Post details */}
        <div className="w-1/3 flex flex-col dark:bg-gray-800">
          {/* Header */}
          <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar
                className="h-8 w-8 cursor-pointer"
                onClick={() => {
                  onProfileClick(post.username)
                  onClose()
                }}
              >
                {avatarError ? (
                  <AvatarFallback>{post.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                ) : (
                  <AvatarImage src={avatarUrl} alt={post.username} onError={handleAvatarError} />
                )}
              </Avatar>
              <div className="flex items-center gap-2">
                <div>
                  <span
                    className="font-semibold cursor-pointer dark:text-white"
                    onClick={() => {
                      onProfileClick(post.username)
                      onClose()
                    }}
                  >
                    {post.username}
                  </span>
                  {post.location && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 block">{post.location}</span>
                  )}
                </div>

                {/* Follow button - only show if not the current user's post */}
                {!isOwnPost && onFollowToggle && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs py-0 px-2 ml-1 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={handleFollow}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck className="h-3 w-3 mr-1 text-gray-600 dark:text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">Following</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-3 w-3 mr-1 text-blue-500" />
                        <span className="text-blue-500">Follow</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center">
              <div className="flex gap-2 mr-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 dark:text-white" onClick={handleShare}>
                  <Share className="h-5 w-5" />
                </Button>

                {!isOwnPost && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 dark:text-white" onClick={handleReport}>
                    <Flag className="h-5 w-5" />
                  </Button>
                )}
              </div>

              {/* Add PostMenu for the user's own posts */}
              {isOwnPost && onEditPost && onDeletePost && (
                <PostMenu
                  post={post}
                  isOwnPost={true}
                  onEditPost={onEditPost}
                  onDeletePost={(postId) => {
                    console.log(`PostModal - onDeletePost called for post ID: ${postId}`)
                    onDeletePost(postId)
                    onClose()
                  }}
                />
              )}

              <Button variant="ghost" size="icon" onClick={onClose} className="dark:text-white">
                <X className="h-6 w-6" />
              </Button>
            </div>
          </div>

          {/* Caption and Comments */}
          <div
            className={`flex-grow overflow-y-auto p-4 dark:bg-gray-800 ${showFullComments ? "max-h-none" : "max-h-[500px]"}`}
          >
            <p className="mb-4 dark:text-white">
              <span
                className="font-semibold mr-2 cursor-pointer"
                onClick={() => {
                  onProfileClick(post.username)
                  onClose()
                }}
              >
                {post.username}
              </span>
              {post.caption}
            </p>

            {sortedComments.length > 3 && (
              <button
                className="text-sm text-gray-500 dark:text-gray-400 mb-2 hover:text-gray-700 dark:hover:text-gray-300"
                onClick={toggleCommentsView}
              >
                {showFullComments ? "Show less" : `Show all ${sortedComments.length} comments`}
              </button>
            )}

            {(showFullComments ? sortedComments : sortedComments.slice(0, 3)).map((comment) => (
              <div key={`modal-comment-${comment.id}`} className="mb-2 dark:text-gray-300">
                <span
                  className="font-semibold mr-2 dark:text-white cursor-pointer"
                  onClick={() => {
                    onProfileClick(comment.username)
                    onClose()
                  }}
                >
                  {comment.username}
                </span>
                {comment.text}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatTimestamp(comment.timestamp)}</p>
              </div>
            ))}
          </div>

          {/* Actions and Add Comment */}
          <div className="p-4 border-t dark:border-gray-700 dark:bg-gray-800">
            <div className="flex justify-between mb-4">
              <div className="flex gap-4 items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 p-0 ${heartPulse ? "animate-pulse-scale" : ""}`}
                  onClick={handleLike}
                >
                  <Heart className={`h-6 w-6 ${isLiked ? "fill-red-500 text-red-500" : "dark:text-white"}`} />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 p-0 dark:text-white">
                  <Send className="h-6 w-6" />
                </Button>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 p-0" onClick={handleSave}>
                <Bookmark className={`h-6 w-6 ${isSaved ? "fill-black dark:fill-white" : "dark:text-white"}`} />
              </Button>
            </div>
            <p className="font-semibold mb-2 dark:text-white">{currentLikes.toLocaleString()} likes</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{formatTimestamp(post.timestamp)}</p>
            <form onSubmit={handleCommentSubmit} className="flex items-center">
              <div className="flex-grow relative flex items-center">
                <Input
                  ref={commentInputRef}
                  type="text"
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="pr-10 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
                <div className="absolute right-2">
                  <EmojiPicker onEmojiSelect={handleEmojiSelect} position="top" />
                </div>
              </div>
              <Button type="submit" variant="ghost" size="sm" className="ml-2 dark:text-white">
                Post
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
