"use client"

import { useState, useCallback } from "react"
import { trackEvent } from "@/lib/tracking"
import { useUser } from "@/contexts/UserContext"
import type { Post, Comment } from "@/lib/types"

export function usePostInteractions() {
  const [likedPostsSet, setLikedPostsSet] = useState<Set<string>>(new Set())
  const [reportedPosts, setReportedPosts] = useState<Set<string>>(new Set())
  const {
    condition,
    username,
    followedUsers,
    followUser,
    unfollowUser,
    savedPosts,
    savePost,
    unsavePost,
    participantId,
    removeUserCreatedPost,
  } = useUser()

  // Handle liking a post
  const handleLike = useCallback(
    (postId: string, liked: boolean, postOwner?: string) => {
      // Update the liked posts set
      const newLikedPosts = new Set(likedPostsSet)
      if (liked) {
        newLikedPosts.add(postId)
      } else {
        newLikedPosts.delete(postId)
      }
      setLikedPostsSet(newLikedPosts)

      // Track the like/unlike event
      if (condition && postOwner) {
        trackEvent({
          action: liked ? "like_post" : "unlike_post",
          username,
          postId,
          postOwner,
          condition,
          participantId,
        })
      }
    },
    [likedPostsSet, condition, username, participantId],
  )

  // Handle saving a post
  const handleSave = useCallback(
    (postId: string, saved: boolean) => {
      if (saved) {
        unsavePost(postId)
      } else {
        savePost(postId)
      }

      // Track the save/unsave event
      if (condition) {
        trackEvent({
          action: saved ? "unsave_post" : "save_post",
          username,
          postId,
          condition,
          participantId,
        })
      }
    },
    [savePost, unsavePost, condition, username, participantId],
  )

  // Handle following a user
  const handleFollowToggle = useCallback(
    (userToFollow: string) => {
      const isCurrentlyFollowing = followedUsers.includes(userToFollow)

      if (isCurrentlyFollowing) {
        unfollowUser(userToFollow)
      } else {
        followUser(userToFollow)
      }

      // Track the follow/unfollow event
      if (condition) {
        trackEvent({
          action: isCurrentlyFollowing ? "unfollow_user" : "follow_user",
          username,
          postOwner: userToFollow,
          condition,
          participantId,
        })
      }
    },
    [followUser, unfollowUser, followedUsers, condition, username, participantId],
  )

  // Handle reporting a post
  const handleReportPost = useCallback(
    (postId: string, postOwner?: string) => {
      // Add the post to the reported set
      setReportedPosts((prev) => new Set(prev).add(postId))

      // Track the report event
      if (condition && postOwner) {
        trackEvent({
          action: "report_post",
          username,
          postId,
          postOwner,
          condition,
          participantId,
        })
      }
    },
    [condition, username, participantId],
  )

  // Handle editing a post
  const handleEditPost = useCallback(
    (
      postId: string,
      updates: { caption: string; location?: string },
      posts?: Post[],
      setPosts?: (posts: Post[]) => void,
      postOwner?: string,
    ) => {
      // If posts and setPosts are provided, update the post in the array
      if (posts && setPosts) {
        const updatedPosts = posts.map((post) => {
          if (post.id === postId) {
            return { ...post, ...updates }
          }
          return post
        })

        // Update the state
        setPosts(updatedPosts)
      }

      // Track the edit event
      if (condition) {
        trackEvent({
          action: "edit_post",
          username,
          postId,
          postOwner: postOwner || username, // Default to current user if not provided
          condition,
          participantId,
        })
      }
    },
    [condition, username, participantId],
  )

  // Handle deleting a post - enhanced with better tracking
  const handleDeletePost = useCallback(
    (postId: string, postOwner?: string) => {
      console.log(`Deleting post with ID: ${postId}, owner: ${postOwner || username}`)

      // If it's a user-created post, remove it from UserContext
      if (postId.startsWith("user-post-")) {
        console.log(`Removing user-created post: ${postId}`)
        removeUserCreatedPost(postId)
      }

      // Track the delete event with enhanced information
      if (condition) {
        trackEvent({
          action: "delete_post",
          username,
          postId,
          postOwner: postOwner || username, // Use provided owner or default to current user
          condition,
          participantId,
          text: "", // Add descriptive text
        })
      }
    },
    [condition, username, participantId, removeUserCreatedPost],
  )

  // Handle adding a comment to a post
  const handleAddComment = useCallback(
    (postId: string, comment: Comment, posts?: Post[], setPosts?: (posts: Post[]) => void, postOwner?: string) => {
      // Track the comment event
      if (condition && postOwner) {
        trackEvent({
          action: "comment_post",
          username,
          postId,
          postOwner,
          text: comment.text,
          condition,
          participantId,
        })
      }
    },
    [condition, username, participantId],
  )

  return {
    likedPostsSet,
    reportedPosts,
    handleLike,
    handleSave,
    handleFollowToggle,
    handleReportPost,
    handleEditPost,
    handleDeletePost,
    handleAddComment,
  }
}
