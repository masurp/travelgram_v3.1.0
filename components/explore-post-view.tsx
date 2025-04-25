"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import Image from "next/image"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Heart, Bookmark, X, UserPlus, UserCheck, MessageCircle } from "lucide-react"
import type { Post, Comment } from "@/lib/types"
import { useUser } from "@/contexts/UserContext"
import { formatTimestamp } from "@/lib/dateUtils"
import { trackEvent } from "@/lib/tracking"
import ReportOverlay from "./report-overlay"
import LikeAnimation from "./like-animation"
import { Input } from "@/components/ui/input"
import EmojiPicker from "./emoji-picker"
import { isDesktop } from "@/lib/deviceUtils"

interface ExplorePostViewProps {
  posts: Post[]
  initialIndex: number
  onClose: () => void
  onLike: (postId: string, liked: boolean) => void
  likedPosts: Set<string>
  onProfileClick: (username: string) => void
  onAddComment: (postId: string, comment: any) => void
  savedPosts: string[]
  onSavePost: (postId: string, isSaved: boolean) => void
  onReportPost?: (postId: string) => void
}

export default function ExplorePostView({
  posts,
  initialIndex,
  onClose,
  onLike,
  likedPosts,
  onProfileClick,
  onAddComment,
  savedPosts,
  onSavePost,
  onReportPost,
}: ExplorePostViewProps) {
  // Internal state management
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [showLikeAnimation, setShowLikeAnimation] = useState(false)
  const [heartPulse, setHeartPulse] = useState(false)
  const [showReportOverlay, setShowReportOverlay] = useState(false)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [imageError, setImageError] = useState(false)
  const [avatarError, setAvatarError] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState("")
  const [isSwiping, setIsSwiping] = useState(false)
  const [showFullCaption, setShowFullCaption] = useState(false)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const [touchEndX, setTouchEndX] = useState<number | null>(null)
  const [viewedPosts, setViewedPosts] = useState<Set<string>>(new Set())

  const containerRef = useRef<HTMLDivElement>(null)
  const commentInputRef = useRef<HTMLInputElement>(null)
  const lastTapTimeRef = useRef(0)
  const desktop = isDesktop()
  const { username, profilePhoto, condition, followedUsers, followUser, unfollowUser, participantId } = useUser()

  // Get current post data
  const currentPost = posts[currentIndex]
  const isLiked = currentPost ? likedPosts.has(currentPost.id) : false
  const isSaved = currentPost ? savedPosts.includes(currentPost.id) : false
  const isOwnPost = currentPost ? currentPost.username === username : false
  const isFollowing = currentPost ? followedUsers.includes(currentPost.username) : false

  // Check if this post has multiple photos
  const hasMultiplePhotos = currentPost && currentPost.contentUrls && currentPost.contentUrls.length > 1

  // Get the current content URL
  const currentContentUrl = hasMultiplePhotos ? currentPost.contentUrls![currentPhotoIndex] : currentPost?.contentUrl

  // Get the correct avatar URL - use current profile photo for own posts
  const avatarUrl = isOwnPost && profilePhoto ? profilePhoto : currentPost?.userAvatar

  // Reset state when post changes
  useEffect(() => {
    if (currentPost) {
      setImageError(false)
      setAvatarError(false)
      setCurrentPhotoIndex(currentPost.currentPhotoIndex || 0)
      setShowComments(false)
      setShowFullCaption(false)
    }
  }, [currentIndex, currentPost])

  // Track post view when post changes, but only if we haven't viewed it before
  useEffect(() => {
    if (currentPost && currentPost.id && condition && !viewedPosts.has(currentPost.id)) {
      console.log(`Tracking explore post view for post ${currentPost.id} by ${currentPost.username}`)
      trackEvent({
        action: "view_post",
        username,
        postId: currentPost.id,
        postOwner: currentPost.username,
        condition,
        participantId,
      })

      // Add to viewed posts set
      setViewedPosts((prev) => {
        const newSet = new Set(prev)
        newSet.add(currentPost.id)
        return newSet
      })
    }
  }, [currentPost, username, condition, viewedPosts])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showComments) {
          setShowComments(false)
        } else {
          onClose()
        }
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        navigateToPrevious()
      } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        navigateToNext()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [currentIndex, showComments])

  // Prevent body scrolling when component is mounted
  useEffect(() => {
    // Save the original overflow style
    const originalStyle = document.body.style.overflow

    // Prevent scrolling on the body
    document.body.style.overflow = "hidden"

    // Hide the footer when this component is mounted
    document.body.classList.add("no-scroll")

    // Restore original style when component unmounts
    return () => {
      document.body.style.overflow = originalStyle
      document.body.classList.remove("no-scroll")
    }
  }, [])

  // Handle touch events for swiping
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only prevent default if we're touching the main image area
    // This allows buttons and other interactive elements to work normally
    if (
      e.target instanceof HTMLImageElement ||
      (e.target instanceof HTMLDivElement && e.target.classList.contains("swipe-area"))
    ) {
      e.preventDefault()
    }

    setTouchStart(e.targetTouches[0].clientY)
    setTouchStartX(e.targetTouches[0].clientX)
    setIsSwiping(false)
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Only prevent default if we're touching the main image area
    if (
      e.target instanceof HTMLImageElement ||
      (e.target instanceof HTMLDivElement && e.target.classList.contains("swipe-area"))
    ) {
      e.preventDefault()
    }

    setTouchEnd(e.targetTouches[0].clientY)
    setTouchEndX(e.targetTouches[0].clientX)
    setIsSwiping(true)
  }, [])

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      // Only process swipe if we have both touch points and we're actually swiping
      if (!touchStart || !touchEnd || !isSwiping) {
        setIsSwiping(false)
        return
      }

      // Only prevent default if we're touching the main image area
      if (
        e.target instanceof HTMLImageElement ||
        (e.target instanceof HTMLDivElement && e.target.classList.contains("swipe-area"))
      ) {
        e.preventDefault()
      }

      const verticalDistance = touchStart - touchEnd
      const isUpSwipe = verticalDistance > 50
      const isDownSwipe = verticalDistance < -50

      // Handle horizontal swipes for photo navigation
      if (touchStartX && touchEndX) {
        const horizontalDistance = touchStartX - touchEndX
        const isLeftSwipe = horizontalDistance > 50
        const isRightSwipe = horizontalDistance < -50

        // If we have a significant horizontal swipe and it's greater than the vertical movement
        if (
          (isLeftSwipe || isRightSwipe) &&
          Math.abs(horizontalDistance) > Math.abs(verticalDistance) &&
          hasMultiplePhotos
        ) {
          if (isLeftSwipe && currentPhotoIndex < currentPost.contentUrls!.length - 1) {
            setCurrentPhotoIndex(currentPhotoIndex + 1)
            setImageError(false)
          } else if (isRightSwipe && currentPhotoIndex > 0) {
            setCurrentPhotoIndex(currentPhotoIndex - 1)
            setImageError(false)
          }

          setTouchStart(null)
          setTouchEnd(null)
          setTouchStartX(null)
          setTouchEndX(null)
          setIsSwiping(false)
          return
        }
      }

      // Handle vertical swipes for post navigation
      if (isUpSwipe) {
        navigateToNext()
      } else if (isDownSwipe) {
        navigateToPrevious()
      }

      setTouchStart(null)
      setTouchEnd(null)
      setTouchStartX(null)
      setTouchEndX(null)
      setIsSwiping(false)
    },
    [touchStart, touchEnd, touchStartX, touchEndX, isSwiping, hasMultiplePhotos, currentPost, currentPhotoIndex],
  )

  const navigateToPrevious = useCallback(() => {
    if (showComments) {
      setShowComments(false)
      return
    }

    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }, [showComments, currentIndex])

  const navigateToNext = useCallback(() => {
    if (showComments) {
      setShowComments(false)
      return
    }

    if (currentIndex < posts.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }, [showComments, currentIndex, posts.length])

  // Navigate to previous photo in the post
  const goToPreviousPhoto = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation() // Prevent triggering other click handlers

      if (hasMultiplePhotos && currentPhotoIndex > 0) {
        setCurrentPhotoIndex(currentPhotoIndex - 1)
        setImageError(false) // Reset error state when changing photos
      }
    },
    [hasMultiplePhotos, currentPhotoIndex],
  )

  // Navigate to next photo in the post
  const goToNextPhoto = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation() // Prevent triggering other click handlers

      if (hasMultiplePhotos && currentPhotoIndex < currentPost.contentUrls!.length - 1) {
        setCurrentPhotoIndex(currentPhotoIndex + 1)
        setImageError(false) // Reset error state when changing photos
      }
    },
    [hasMultiplePhotos, currentPhotoIndex, currentPost],
  )

  // Handle like action
  const handleLike = useCallback(() => {
    if (!currentPost) return

    const newLikedState = !isLiked

    // Show animation
    if (newLikedState) {
      setShowLikeAnimation(true)
      setHeartPulse(true)
      setTimeout(() => setHeartPulse(false), 300)
    }

    // Call parent handler
    onLike(currentPost.id, newLikedState)

    // Track the like/unlike event
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
  }, [currentPost, isLiked, onLike, condition, username])

  // Handle save action
  const handleSave = useCallback(() => {
    if (!currentPost) return

    // Call parent handler
    onSavePost(currentPost.id, isSaved)

    // Track the save/unsave event
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
  }, [currentPost, isSaved, onSavePost, condition, username])

  // Handle comment toggle
  const handleCommentToggle = useCallback(() => {
    setShowComments(!showComments)

    // Focus the comment input when opening comments
    if (!showComments && commentInputRef.current) {
      setTimeout(() => {
        commentInputRef.current?.focus()
      }, 300)
    }
  }, [showComments])

  // Handle report action
  const handleReport = useCallback(() => {
    if (!currentPost) return

    setShowReportOverlay(true)

    // Track the report event
    if (condition) {
      trackEvent({
        action: "report_post",
        username,
        postId: currentPost.id,
        postOwner: currentPost.username,
        condition,
        participantId,
      })
    }
  }, [currentPost, condition, username])

  // Handle report completion
  const handleReportComplete = useCallback(() => {
    setShowReportOverlay(false)

    if (onReportPost && currentPost) {
      onReportPost(currentPost.id)
    }

    // Navigate to next post if available, otherwise close
    if (currentIndex < posts.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else if (posts.length <= 1) {
      onClose()
    }
  }, [currentPost, onReportPost, currentIndex, posts.length, onClose])

  // Handle follow toggle
  const handleFollowToggle = useCallback(() => {
    if (!currentPost) return

    if (isFollowing) {
      unfollowUser(currentPost.username)

      // Track unfollow
      if (condition) {
        trackEvent({
          action: "unfollow_user",
          username,
          postOwner: currentPost.username,
          condition,
          participantId,
        })
      }
    } else {
      followUser(currentPost.username)

      // Track follow
      if (condition) {
        trackEvent({
          action: "follow_user",
          username,
          postOwner: currentPost.username,
          condition,
          participantId,
        })
      }
    }
  }, [currentPost, isFollowing, unfollowUser, followUser, condition, username])

  // Handle animation completion
  const handleAnimationComplete = useCallback(() => {
    setShowLikeAnimation(false)
  }, [])

  // Handle image error
  const handleImageError = useCallback(() => {
    setImageError(true)
  }, [])

  // Handle avatar error
  const handleAvatarError = useCallback(() => {
    setAvatarError(true)
  }, [])

  // Toggle comments view
  const handleViewComments = useCallback(() => {
    setShowComments(true)
  }, [])

  // Handle comment submission
  const handleCommentSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!currentPost || !newComment.trim()) return

      const comment: Comment = {
        id: `c${Date.now()}`,
        username: username,
        text: newComment.trim(),
        timestamp: "1 min ago", // Use "1 min ago" instead of actual date
      }

      // Clear input
      setNewComment("")

      // Call parent handler to update the central data store
      onAddComment(currentPost.id, comment)

      // Track comment
      if (condition) {
        trackEvent({
          action: "comment_post",
          username,
          postId: currentPost.id,
          postOwner: currentPost.username,
          text: comment.text,
          condition,
          participantId,
        })
      }
    },
    [currentPost, newComment, username, onAddComment, condition],
  )

  // Handle emoji selection
  const handleEmojiSelect = useCallback((emoji: string) => {
    setNewComment((prev) => prev + emoji)
    // Focus the input after adding an emoji
    if (commentInputRef.current) {
      commentInputRef.current.focus()
    }
  }, [])

  // Handle double tap for liking
  const handleImageTap = useCallback(() => {
    if (!currentPost || isSwiping) return

    const now = Date.now()
    const DOUBLE_TAP_DELAY = 300

    if (now - lastTapTimeRef.current < DOUBLE_TAP_DELAY) {
      // Double tap detected
      if (!isLiked) {
        // Show animation
        setShowLikeAnimation(true)
        setHeartPulse(true)
        setTimeout(() => setHeartPulse(false), 300)

        // Call parent handler
        onLike(currentPost.id, true)

        // Track the like event
        if (condition) {
          trackEvent({
            action: "like_post",
            username,
            postId: currentPost.id,
            postOwner: currentPost.username,
            condition,
            participantId,
          })
        }
      }
    }

    lastTapTimeRef.current = now
  }, [currentPost, isSwiping, isLiked, onLike, condition, username])

  // Handle profile click
  const handleProfileClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (isSwiping) return

      if (currentPost) {
        onProfileClick(currentPost.username)
        onClose()
      }
    },
    [currentPost, isSwiping, onProfileClick, onClose],
  )

  // Toggle full caption
  const toggleFullCaption = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setShowFullCaption(!showFullCaption)
    },
    [showFullCaption],
  )

  // Function to truncate caption
  const getTruncatedCaption = useCallback(
    (caption: string, maxLength = 35) => {
      if (!caption || caption.length <= maxLength || showFullCaption) {
        return caption
      }
      return (
        <>
          {caption.substring(0, maxLength)}...{" "}
          <span className="text-blue-500 cursor-pointer" onClick={toggleFullCaption}>
            show more
          </span>
        </>
      )
    },
    [showFullCaption, toggleFullCaption],
  )

  // Get comment count
  const commentCount = currentPost?.comments?.length || 0

  if (!currentPost) return null

  return (
    <div className="fixed inset-0 bg-black z-[1000] flex flex-col" onClick={(e) => e.stopPropagation()}>
      {/* Close button */}
      <div className="absolute top-4 left-4 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="bg-black bg-opacity-50 text-white hover:bg-opacity-70 rounded-full"
        >
          <X className="h-6 w-6" />
        </Button>
      </div>

      {/* Main content area with touch handlers */}
      <div
        ref={containerRef}
        className="flex-1 relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Report overlay */}
        {showReportOverlay && <ReportOverlay onComplete={handleReportComplete} />}

        {/* Comments overlay */}
        {showComments && (
          <div className="absolute inset-0 bg-black bg-opacity-90 z-[1001] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h3 className="text-white font-semibold">Comments</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowComments(false)} className="text-white">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 pb-32">
              {" "}
              {/* Added extra padding at bottom */}
              {currentPost.comments && currentPost.comments.length > 0 ? (
                currentPost.comments.map((comment) => (
                  <div key={comment.id} className="mb-4">
                    <div className="flex items-start">
                      <Avatar className="h-8 w-8 mr-2">
                        <AvatarFallback>{comment.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-baseline">
                          <span
                            className="font-semibold text-white mr-2 cursor-pointer"
                            onClick={() => {
                              onProfileClick(comment.username)
                              onClose()
                            }}
                          >
                            {comment.username}
                          </span>
                          <span className="text-gray-300 text-sm">{comment.text}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{formatTimestamp(comment.timestamp)}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">No comments yet</p>
              )}
            </div>

            <div className="p-4 border-t border-gray-800 bg-black sticky bottom-0 left-0 right-0 z-[1002]">
              <form onSubmit={handleCommentSubmit} className="flex items-center">
                <div className="flex-grow relative flex items-center">
                  <Input
                    ref={commentInputRef}
                    type="text"
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="pr-10 bg-gray-800 text-white border-gray-700"
                  />
                  <div className="absolute right-2">
                    <EmojiPicker onEmojiSelect={handleEmojiSelect} position="top" />
                  </div>
                </div>
                <Button type="submit" variant="ghost" size="sm" className="ml-2 text-white">
                  Post
                </Button>
              </form>
            </div>
          </div>
        )}

        {/* Post content */}
        <div className="absolute inset-0 flex items-center justify-center swipe-area">
          {imageError ? (
            <div className="text-white text-center">Image not available</div>
          ) : (
            <div
              className="relative w-full h-full flex items-center justify-center swipe-area"
              onClick={handleImageTap}
            >
              <Image
                src={currentContentUrl || "/placeholder.svg"}
                alt={currentPost.caption || "Post image"}
                layout="fill"
                objectFit="contain"
                onError={handleImageError}
                className="swipe-area"
                onDoubleClick={() => {
                  if (!isLiked) {
                    // Show animation
                    setShowLikeAnimation(true)
                    setHeartPulse(true)
                    setTimeout(() => setHeartPulse(false), 300)

                    // Call parent handler
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

              {/* Photo indicators (dots) */}
              {hasMultiplePhotos && (
                <div className="absolute bottom-20 left-0 right-0 flex justify-center gap-1.5 z-20">
                  {currentPost.contentUrls!.map((_, index) => (
                    <div
                      key={`indicator-${index}`}
                      className={`h-1.5 w-1.5 rounded-full ${
                        index === currentPhotoIndex ? "bg-white" : "bg-white bg-opacity-50"
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Like animation overlay */}
              <LikeAnimation isActive={showLikeAnimation} onAnimationComplete={handleAnimationComplete} />
            </div>
          )}
        </div>

        {/* User info and caption overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent pt-20 pb-6 px-4">
          <div className="flex items-center mb-2">
            <Avatar className="h-10 w-10 mr-3 cursor-pointer border-2 border-white" onClick={handleProfileClick}>
              {avatarError ? (
                <AvatarFallback>{currentPost.username.substring(0, 2).toUpperCase()}</AvatarFallback>
              ) : (
                <AvatarImage src={avatarUrl} alt={currentPost.username} onError={handleAvatarError} />
              )}
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center">
                <p className="font-semibold text-white cursor-pointer" onClick={handleProfileClick}>
                  {currentPost.username}
                </p>
                {!isOwnPost && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleFollowToggle}
                    className="ml-2 h-7 text-xs py-0 px-2 text-white hover:bg-white/20"
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck className="h-3 w-3 mr-1" />
                        <span>Following</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-3 w-3 mr-1" />
                        <span>Follow</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
              {currentPost.location && <p className="text-xs text-gray-300">{currentPost.location}</p>}
            </div>
          </div>

          {currentPost.caption && (
            <div className="text-white text-sm mb-4">
              <p>
                {showFullCaption ? (
                  <>
                    {currentPost.caption}{" "}
                    <span className="text-blue-500 cursor-pointer" onClick={toggleFullCaption}>
                      show less
                    </span>
                  </>
                ) : (
                  getTruncatedCaption(currentPost.caption)
                )}
              </p>
            </div>
          )}

          <p className="text-xs text-gray-300 mb-2">{formatTimestamp(currentPost.timestamp)}</p>
        </div>

        {/* Action buttons on the right side - smaller and without background */}
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex flex-col items-center space-y-6">
          {/* Like button */}
          <div className="flex flex-col items-center">
            <button
              onClick={handleLike}
              className={`text-white ${heartPulse ? "animate-pulse-scale" : ""}`}
              aria-label="Like"
            >
              <Heart className={`h-7 w-7 ${isLiked ? "fill-red-500 text-red-500" : "text-white"}`} />
            </button>
            <span className="text-white text-xs mt-1">{currentPost.likes}</span>
          </div>

          {/* Comment button */}
          <div className="flex flex-col items-center">
            <button onClick={handleCommentToggle} className="text-white" aria-label="Comment">
              <MessageCircle className="h-7 w-7" />
            </button>
            <span className="text-white text-xs mt-1">{commentCount}</span>
          </div>

          {/* Save button */}
          <div className="flex flex-col items-center">
            <button onClick={handleSave} className="text-white" aria-label="Save">
              <Bookmark className={`h-7 w-7 ${isSaved ? "fill-white" : ""}`} />
            </button>
          </div>
        </div>

        {/* Multiple photos indicator */}
        {hasMultiplePhotos && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-60 text-white text-sm px-3 py-1 rounded-full z-30">
            {currentPhotoIndex + 1}/{currentPost.contentUrls!.length}
          </div>
        )}

        {/* Swipe indicator */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-xs opacity-70 text-center">
          <div>Swipe up/down to navigate posts</div>
          {hasMultiplePhotos && <div>Swipe left/right to view photos</div>}
        </div>
      </div>
    </div>
  )
}
