"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { Skeleton } from "@/components/ui/skeleton"
import { useUser } from "@/contexts/UserContext"
import { trackEvent } from "@/lib/tracking"
import { Heart } from "lucide-react"
import { isDesktop } from "@/lib/deviceUtils"
import type { Post } from "@/lib/types"
import ExplorePostView from "./explore-post-view"

interface ExplorePageProps {
  onPostClick: (post: Post, index: number) => void
  allPosts: Post[]
  explorePosts: Post[]
  onLike: (postId: string, liked: boolean) => void
  likedPosts: Set<string>
  onProfileClick: (username: string) => void
  onAddComment: (postId: string, comment: any) => void
  savedPosts: string[]
  onSavePost: (postId: string, isSaved: boolean) => void
}

export default function ExplorePage({
  onPostClick,
  allPosts,
  explorePosts,
  onLike,
  likedPosts,
  onProfileClick,
  onAddComment,
  savedPosts,
  onSavePost,
}: ExplorePageProps) {
  const [loading, setLoading] = useState(false)
  const { condition, username, participantId } = useUser()
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showExplorePostView, setShowExplorePostView] = useState(false)
  const desktop = isDesktop()

  // Track view of explore page
  useEffect(() => {
    if (condition) {
      trackEvent({
        action: "view_post",
        username,
        postId: "explore-page",
        postOwner: "system",
        condition,
        participantId,
      })
    }
  }, [condition, username])

  const handlePostClick = useCallback(
    (post: Post, index: number) => {
      // Track post click
      if (post.id && condition) {
        console.log(`Tracking explore post click for post ${post.id} by ${post.username}`)
        trackEvent({
          action: "click_post",
          username,
          postId: post.id,
          postOwner: post.username,
          condition,
          participantId,
        })
      }

      setSelectedPost(post)
      setCurrentIndex(index)

      // For mobile, show our own ExplorePostView
      if (!desktop) {
        setShowExplorePostView(true)
      } else {
        // For desktop, use the parent's handler
        onPostClick(post, index)
      }
    },
    [desktop, onPostClick, condition, username],
  )

  const handleCloseExplorePostView = useCallback(() => {
    setShowExplorePostView(false)
  }, [])

  const handleReportPost = useCallback(
    (postId: string) => {
      // Remove the post from the display
      const updatedPosts = explorePosts.filter((post) => post.id !== postId)
      // Close the post view
      setShowExplorePostView(false)
    },
    [explorePosts],
  )

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-1 md:gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={`skeleton-${i}`} className="aspect-square w-full">
            <Skeleton className="h-full w-full" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-center mb-4 dark:text-white">Explore</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-1 md:gap-2">
        {explorePosts.map((post, index) => (
          <div
            key={`${post.id}-${index}`}
            className="relative aspect-square cursor-pointer overflow-hidden rounded-md group"
            onClick={() => handlePostClick(post, index)}
          >
            <Image
              src={post.contentUrl || "/placeholder.svg"}
              alt={post.caption || "Explore image"}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />

            {/* Multiple photos indicator */}
            {post.contentUrls && post.contentUrls.length > 1 && (
              <div className="absolute top-2 right-2 bg-black bg-opacity-60 rounded-md p-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </div>
            )}

            {/* Improved overlay - always visible with hover effect */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm text-white">{post.username}</p>
                <div className="flex items-center">
                  <Heart className="h-4 w-4 text-white fill-white mr-1" />
                  <p className="text-xs text-white">{post.likes}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile ExplorePostView */}
      {!desktop && showExplorePostView && selectedPost && (
        <ExplorePostView
          posts={explorePosts}
          initialIndex={currentIndex}
          onClose={handleCloseExplorePostView}
          onLike={onLike}
          likedPosts={likedPosts}
          onProfileClick={onProfileClick}
          onAddComment={onAddComment}
          savedPosts={savedPosts}
          onSavePost={onSavePost}
          onReportPost={handleReportPost}
        />
      )}
    </div>
  )
}
