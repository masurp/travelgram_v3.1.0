"use client"

import type React from "react"
import { useState, useRef, useEffect, memo, useCallback } from "react"
import Image from "next/image"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Heart,
  Send,
  Bookmark,
  Play,
  Pause,
  Volume2,
  VolumeX,
  UserPlus,
  UserCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import type { Post as PostType, Comment } from "@/lib/types"
import PostModal from "@/components/post-modal"
import { useUser } from "@/contexts/UserContext"
import { formatTimestamp } from "@/lib/dateUtils"
import EmojiPicker from "@/components/emoji-picker"
import PostMenu from "@/components/post-menu"
import MobileGallery from "@/components/mobile-gallery"
import ReportOverlay from "@/components/report-overlay"
import LikeAnimation from "@/components/like-animation"
import { trackEvent } from "@/lib/tracking"

interface PostProps {
  post: PostType
  onAddComment: (postId: string, comment: Comment) => void
  onProfileClick: (username: string) => void
  onLike: (postId: string, liked: boolean) => void
  likedPosts: Set<string>
  onEditPost?: (postId: string, updates: { caption: string; location?: string }) => void
  onDeletePost?: (postId: string) => void
  onReportPost?: (postId: string) => void
  onMobileGalleryChange?: (isOpen: boolean) => void
  onFollowToggle?: (username: string) => void
}

// Wrap the Post component with memo
export default memo(function Post({
  post,
  onAddComment,
  onProfileClick,
  onLike,
  likedPosts,
  onEditPost,
  onDeletePost,
  onReportPost,
  onMobileGalleryChange,
  onFollowToggle,
}: PostProps) {
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState("")
  const [comments, setComments] = useState<Comment[]>(post.comments || [])
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [contentError, setContentError] = useState(false)
  const [avatarError, setAvatarError] = useState(false)
  const [showMobileGallery, setShowMobileGallery] = useState(false)
  const [showReportOverlay, setShowReportOverlay] = useState(false)
  const [showLikeAnimation, setShowLikeAnimation] = useState(false)
  const [heartPulse, setHeartPulse] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(post.currentPhotoIndex || 0)
  const [hasTrackedView, setHasTrackedView] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const commentInputRef = useRef<HTMLInputElement>(null)
  const postRef = useRef<HTMLDivElement>(null)
  const {
    username,
    profilePhoto,
    savedPosts,
    savePost,
    unsavePost,
    followedUsers,
    followUser,
    unfollowUser,
    condition,
    participantId,
  } = useUser()

  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)

    return () => {
      window.removeEventListener("resize", checkMobile)
    }
  }, [])

  // Set up intersection observer to track when post is actually visible
  useEffect(() => {
    if (!postRef.current || hasTrackedView) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting) {
          // Only track the view when the post is actually visible
          if (post.id && condition) {
            console.log(`Tracking post view for post ${post.id} by ${post.username}`)
            trackEvent({
              action: "view_post",
              username,
              postId: post.id,
              postOwner: post.username,
              condition,
              participantId,
            })
          }
          setHasTrackedView(true)
          // Once tracked, no need to keep observing
          observer.disconnect()
        }
      },
      {
        // Post must be at least 50% visible to count as viewed
        threshold: 0.5,
        rootMargin: "0px",
      },
    )

    observer.observe(postRef.current)

    return () => {
      observer.disconnect()
    }
  }, [postRef, hasTrackedView, post.id, post.username, username, condition])

  // Check if this post has multiple photos
  const hasMultiplePhotos = post.contentUrls && post.contentUrls.length > 1

  // Get the current content URL
  const currentContentUrl = hasMultiplePhotos ? post.contentUrls![currentPhotoIndex] : post.contentUrl

  // Check if this post belongs to the current user
  const isOwnPost = post.username === username

  // Check if the current user is following the post author
  const isFollowing = followedUsers.includes(post.username)

  // Check if this post is liked
  const isLiked = likedPosts.has(post.id)

  // Check if this post is saved
  const isSaved = savedPosts.includes(post.id)

  // Get the correct avatar URL - use current profile photo for own posts
  const avatarUrl = isOwnPost && profilePhoto ? profilePhoto : post.userAvatar

  // Update the handleLike function to pass the post owner
  const handleLike = useCallback(() => {
    const newLikedState = !isLiked
    onLike(post.id, newLikedState)

    if (newLikedState) {
      // Show animation when liking
      setShowLikeAnimation(true)
      // Also add a pulse effect to the heart button
      setHeartPulse(true)
      setTimeout(() => setHeartPulse(false), 300)
    }
  }, [isLiked, onLike, post.id])

  const handleAnimationComplete = useCallback(() => {
    setShowLikeAnimation(false)
  }, [])

  // Update the handleSave function to ensure tracking works correctly
  const handleSave = useCallback(() => {
    console.log(`Post ${post.id} - handleSave called, current isSaved:`, isSaved)

    if (isSaved) {
      console.log(`Post ${post.id} - Unsaving post`)

      // Track the unsave event directly here
      if (condition) {
        console.log(`Tracking unsave_post with owner: ${post.username}`)
        trackEvent({
          action: "unsave_post",
          username,
          postId: post.id,
          postOwner: post.username,
          condition,
          participantId,
        })
      }

      unsavePost(post.id)
    } else {
      console.log(`Post ${post.id} - Saving post`)

      // Track the save event directly here
      if (condition) {
        console.log(`Tracking save_post with owner: ${post.username}`)
        trackEvent({
          action: "save_post",
          username,
          postId: post.id,
          postOwner: post.username,
          condition,
          participantId,
        })
      }

      savePost(post.id)
    }
  }, [isSaved, post.id, post.username, condition, username, unsavePost, savePost])

  const toggleComments = useCallback(() => {
    setShowComments(!showComments)
  }, [showComments])

  // Find the handleCommentSubmit function and update the timestamp
  const handleCommentSubmit = useCallback(
    (e: React.FormEvent) => {
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

        // Add the new comment to the end of the array (it will appear at the bottom)
        setComments((prevComments) => [...prevComments, comment])
        onAddComment(post.id, comment)
        setNewComment("")
      }
    },
    [newComment, username, onAddComment, post.id],
  )

  const handleEmojiSelect = useCallback((emoji: string) => {
    setNewComment((prev) => prev + emoji)
    // Focus the input after adding an emoji
    if (commentInputRef.current) {
      commentInputRef.current.focus()
    }
  }, [])

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }, [isPlaying])

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }, [isMuted])

  // Navigate to previous photo
  const goToPreviousPhoto = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation() // Prevent triggering the post click
      if (hasMultiplePhotos && currentPhotoIndex > 0) {
        setCurrentPhotoIndex(currentPhotoIndex - 1)
        setContentError(false) // Reset error state when changing photos
      }
    },
    [hasMultiplePhotos, currentPhotoIndex],
  )

  // Navigate to next photo
  const goToNextPhoto = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation() // Prevent triggering the post click
      if (hasMultiplePhotos && currentPhotoIndex < post.contentUrls!.length - 1) {
        setCurrentPhotoIndex(currentPhotoIndex + 1)
        setContentError(false) // Reset error state when changing photos
      }
    },
    [hasMultiplePhotos, currentPhotoIndex, post.contentUrls],
  )

  // Update the handlePostClick function to track post clicks
  const handlePostClick = useCallback(() => {
    // Track post click event - this is separate from the view tracking
    if (post.id && condition) {
      console.log(`Tracking post click for post ${post.id} by ${post.username}`)
      trackEvent({
        action: "click_post", // New action type for clicks
        username,
        postId: post.id,
        postOwner: post.username,
        condition,
        participantId,
      })
    }

    if (!isMobile) {
      setShowModal(true)
    } else {
      handleMobileGalleryOpen()
    }
  }, [isMobile, post.id, post.username, username, condition])

  // Update the handleMobileGalleryOpen function
  const handleMobileGalleryOpen = useCallback(() => {
    if (isMobile) {
      setShowMobileGallery(true)
      if (onMobileGalleryChange) {
        onMobileGalleryChange(true)
      }
    }
  }, [isMobile, onMobileGalleryChange])

  const handleContentError = useCallback(() => {
    setContentError(true)
  }, [])

  const handleAvatarError = useCallback(() => {
    setAvatarError(true)
  }, [])

  const handleReportPost = useCallback(() => {
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
  }, [condition, username, post.id, post.username])

  const handleReportComplete = useCallback(() => {
    if (onReportPost) {
      onReportPost(post.id)
    }
  }, [onReportPost, post.id])

  const handleFollowToggle = useCallback(() => {
    if (onFollowToggle) {
      onFollowToggle(post.username)
    } else {
      if (isFollowing) {
        unfollowUser(post.username)
      } else {
        followUser(post.username)
      }
    }
  }, [onFollowToggle, post.username, isFollowing, unfollowUser, followUser])

  useEffect(() => {
    setContentError(false)
    setAvatarError(false)
  }, [post.contentUrl, post.userAvatar])

  useEffect(() => {
    // Update comments when they change from props
    if (post.comments) {
      // Sort comments by order if available, otherwise keep original order
      const sortedComments = [...post.comments].sort((a, b) => {
        // If order property exists, sort by it (lower values are older)
        if (a.order !== undefined && b.order !== undefined) {
          return a.order - b.order
        }
        return 0
      })
      setComments(sortedComments)
    }
  }, [post.comments])

  const renderContent = useCallback(() => {
    if (!currentContentUrl || contentError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
          Content not available
        </div>
      )
    }

    if (post.contentType === "image") {
      return (
        <Image
          src={currentContentUrl || "/placeholder.svg"}
          alt={post.caption || "Post image"}
          fill
          className="object-cover"
          onError={handleContentError}
          onDoubleClick={() => {
            if (!isLiked) {
              setShowLikeAnimation(true)
              setHeartPulse(true)
              setTimeout(() => setHeartPulse(false), 300)
              onLike(post.id, true)
            }
          }}
        />
      )
    }

    if (post.contentType === "video") {
      return (
        <div className="relative w-full h-full">
          <video
            ref={videoRef}
            src={currentContentUrl}
            className="w-full h-full object-cover"
            loop
            muted={isMuted}
            onError={handleContentError}
          />
          <div className="absolute bottom-4 left-4 flex space-x-2">
            <Button variant="secondary" size="icon" onClick={togglePlay}>
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button variant="secondary" size="icon" onClick={toggleMute}>
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
        Unsupported content type
      </div>
    )
  }, [
    currentContentUrl,
    contentError,
    post.contentType,
    post.caption,
    isLiked,
    post.id,
    handleContentError,
    isMuted,
    isPlaying,
    onLike,
    toggleMute,
    togglePlay,
  ])

  return (
    <>
      <div
        ref={postRef}
        className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg overflow-hidden relative"
      >
        {/* Report overlay */}
        {showReportOverlay && <ReportOverlay onComplete={handleReportComplete} />}

        {/* Post header */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 cursor-pointer" onClick={() => onProfileClick(post.username)}>
              {avatarError ? (
                <AvatarFallback>{post.username.substring(0, 2).toUpperCase()}</AvatarFallback>
              ) : (
                <AvatarImage src={avatarUrl} alt={post.username} onError={handleAvatarError} />
              )}
            </Avatar>
            <div className="flex items-center gap-2">
              <div>
                <p
                  className="font-semibold text-sm cursor-pointer dark:text-white"
                  onClick={() => onProfileClick(post.username)}
                >
                  {post.username}
                </p>
                {post.location && <p className="text-xs text-gray-500 dark:text-gray-400">{post.location}</p>}
              </div>

              {/* Follow button - only show if not the current user's post */}
              {!isOwnPost && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs py-0 px-2 ml-1 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleFollowToggle()
                  }}
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

          <PostMenu
            post={post}
            isOwnPost={isOwnPost}
            onEditPost={onEditPost}
            onDeletePost={onDeletePost}
            onReportPost={handleReportPost}
          />
        </div>

        {/* Post content */}
        <div className="relative aspect-square cursor-pointer" onClick={handlePostClick}>
          {renderContent()}

          {/* Photo counter for multiple photos */}
          {hasMultiplePhotos && (
            <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-md z-10">
              {currentPhotoIndex + 1}/{post.contentUrls!.length}
            </div>
          )}

          {/* Navigation arrows for multiple photos */}
          {hasMultiplePhotos && (
            <>
              {currentPhotoIndex > 0 && (
                <button
                  onClick={goToPreviousPhoto}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 rounded-full p-2 z-10"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="h-5 w-5 text-white" />
                </button>
              )}

              {currentPhotoIndex < post.contentUrls!.length - 1 && (
                <button
                  onClick={goToNextPhoto}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 rounded-full p-2 z-10"
                  aria-label="Next photo"
                >
                  <ChevronRight className="h-5 w-5 text-white" />
                </button>
              )}

              {/* Photo indicators (dots) */}
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                {post.contentUrls!.map((_, index) => (
                  <div
                    key={`indicator-${index}`}
                    className={`h-1.5 w-1.5 rounded-full ${
                      index === currentPhotoIndex ? "bg-white" : "bg-white bg-opacity-50"
                    }`}
                  />
                ))}
              </div>
            </>
          )}

          {/* Like animation overlay */}
          <LikeAnimation isActive={showLikeAnimation} onAnimationComplete={handleAnimationComplete} />
        </div>

        {/* Post actions */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 relative ${heartPulse ? "animate-pulse-scale" : ""}`}
                onClick={handleLike}
              >
                <Heart className={`h-6 w-6 ${isLiked ? "fill-red-500 text-red-500" : "dark:text-white"}`} />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Send className="h-6 w-6 dark:text-white" />
              </Button>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSave}>
              <Bookmark className={`h-6 w-6 ${isSaved ? "fill-black dark:fill-white" : "dark:text-white"}`} />
            </Button>
          </div>

          {/* Likes count */}
          <p className="font-semibold text-sm mb-1 dark:text-white">{post.likes.toLocaleString()} likes</p>

          {/* Caption */}
          {post.caption && (
            <div className="mb-1">
              <span
                className="font-semibold text-sm mr-2 dark:text-white cursor-pointer"
                onClick={() => onProfileClick(post.username)}
              >
                {post.username}
              </span>
              <span className="text-xs sm:text-sm dark:text-gray-300">{post.caption}</span>
            </div>
          )}

          {/* Comments */}
          <button className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mb-1" onClick={toggleComments}>
            {showComments ? "Hide comments" : `View all ${comments.length} comments`}
          </button>

          {showComments && (
            <div className="mt-2 space-y-2">
              {comments.map((comment) => (
                <div key={`comment-${comment.id}`} className="text-xs sm:text-sm dark:text-gray-300">
                  <span
                    className="font-semibold mr-2 dark:text-white cursor-pointer"
                    onClick={() => onProfileClick(comment.username)}
                  >
                    {comment.username}
                  </span>
                  {comment.text}
                  <p className="text-2xs sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {formatTimestamp(comment.timestamp)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Comment form */}
          <form onSubmit={handleCommentSubmit} className="mt-4 flex items-center">
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

          {/* Timestamp */}
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mt-2">{formatTimestamp(post.timestamp)}</p>
        </div>
      </div>

      {showModal && !isMobile && (
        <PostModal
          post={{
            ...post,
            userAvatar: avatarUrl, // Pass the updated avatar URL
            currentPhotoIndex: currentPhotoIndex, // Pass the current photo index to the modal
          }}
          onClose={() => setShowModal(false)}
          onAddComment={onAddComment}
          onLike={onLike}
          isLiked={isLiked}
          isSaved={isSaved}
          onSave={handleSave}
          onProfileClick={onProfileClick}
          onEditPost={isOwnPost ? onEditPost : undefined}
          onDeletePost={isOwnPost ? onDeletePost : undefined}
          onReportPost={!isOwnPost ? onReportPost : undefined}
          isFollowing={isFollowing}
          onFollowToggle={handleFollowToggle}
          isOwnPost={isOwnPost}
        />
      )}
      {showMobileGallery && (
        <MobileGallery
          posts={[
            {
              ...post,
              userAvatar: avatarUrl, // Pass the updated avatar URL
              currentPhotoIndex: currentPhotoIndex, // Pass the current photo index to the mobile gallery
            },
          ]}
          initialIndex={0}
          onClose={() => {
            setShowMobileGallery(false)
            if (onMobileGalleryChange) {
              onMobileGalleryChange(false)
            }
          }}
          onLike={onLike}
          likedPosts={likedPosts}
        />
      )}
    </>
  )
})
