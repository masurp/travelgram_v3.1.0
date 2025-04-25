"use client"

import { useState, useEffect, useCallback } from "react"
import { parseISO, compareDesc } from "date-fns"
import { fetchPosts, fetchComments, fetchAuthors, fetchAds } from "@/lib/data"
import { applyLikesToPosts, filterPostsByRatio, filterCommentsBySubcondition } from "@/lib/postUtils"
import type { Post, Author, Comment } from "@/lib/types"
import { useUser } from "@/contexts/UserContext"

export function usePostData() {
  // All posts with comments and likes applied
  const [processedPosts, setProcessedPosts] = useState<Post[]>([])
  // Posts filtered by ratio for the feed
  const [feedPosts, setFeedPosts] = useState<Post[]>([])
  // Posts filtered by ratio for explore
  const [explorePosts, setExplorePosts] = useState<Post[]>([])
  const [authors, setAuthors] = useState<Author[]>([])
  const [ads, setAds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { condition, userCreatedPosts } = useUser()

  // Function to get filtered posts by ratio
  const getFilteredPostsByRatio = useCallback((posts: Post[], conditionStr: string, totalPosts = 50) => {
    return filterPostsByRatio(posts, conditionStr, totalPosts)
  }, [])

  // Function to update a post in all relevant state
  const updatePost = useCallback((updatedPost: Post) => {
    const updatePostInArray = (posts: Post[]) => {
      // If the post is marked as deleted, filter it out
      if (updatedPost.deleted) {
        return posts.filter((post) => post.id !== updatedPost.id)
      }
      // Otherwise update it normally
      return posts.map((post) => (post.id === updatedPost.id ? updatedPost : post))
    }

    setProcessedPosts((prev) => updatePostInArray(prev))
    setFeedPosts((prev) => updatePostInArray(prev))
    setExplorePosts((prev) => updatePostInArray(prev))
  }, [])

  // Function to add a comment to a post - improved to update all instances
  const addCommentToPost = useCallback((postId: string, comment: Comment) => {
    // Update the post in all arrays
    const updatePostWithComment = (posts: Post[]) => {
      return posts.map((post) => {
        if (post.id === postId) {
          // Create a new array with the new comment at the beginning
          const updatedComments = [comment, ...(post.comments || [])]
          return { ...post, comments: updatedComments }
        }
        return post
      })
    }

    // Update all post arrays
    setProcessedPosts(updatePostWithComment)
    setFeedPosts(updatePostWithComment)
    setExplorePosts(updatePostWithComment)
  }, [])

  // Load data on initial render and when condition changes
  useEffect(() => {
    async function loadData() {
      if (!condition) {
        setError("No condition set. Please register first.")
        setLoading(false)
        return
      }

      try {
        // Fetch all data in parallel
        const [postData, commentData, authorData, adsData] = await Promise.all([
          fetchPosts(condition).catch((error) => {
            console.error("Error fetching posts:", error)
            throw new Error("Failed to load posts")
          }),
          fetchComments(condition).catch((error) => {
            console.error("Error fetching comments:", error)
            throw new Error("Failed to load comments")
          }),
          fetchAuthors().catch((error) => {
            console.error("Error fetching authors (non-critical):", error)
            return [] // Continue without author data - we'll use fallbacks
          }),
          fetchAds().catch((error) => {
            console.error("Error fetching ads (non-critical):", error)
            return [] // Continue without ads
          }),
        ])

        // Attach comments to their respective posts and sort them in descending order
        const postsWithComments = postData.map((post) => ({
          ...post,
          comments: commentData
            .filter((comment) => comment.postId === post.id)
            .sort((a, b) => compareDesc(parseISO(a.timestamp), parseISO(b.timestamp))),
        }))

        // Apply likes based on condition
        const postsWithLikes = applyLikesToPosts(postsWithComments, condition)

        // Apply comment filtering based on condition
        const postsWithLikesAndFilteredComments = filterCommentsBySubcondition(postsWithLikes, condition)

        // Merge user-created posts with fetched posts
        const allProcessedPosts = [...postsWithLikesAndFilteredComments, ...userCreatedPosts]

        // Store all processed posts (with comments and likes)
        setProcessedPosts(allProcessedPosts)

        // Filter posts for feed based on ratio - 50 posts
        const filteredFeedPosts = filterPostsByRatio(postsWithLikesAndFilteredComments, condition, 50)
        setFeedPosts([...filteredFeedPosts, ...userCreatedPosts])

        // Filter posts for explore based on ratio - 75 posts
        const filteredExplorePosts = filterPostsByRatio(postsWithLikesAndFilteredComments, condition, 75)
        setExplorePosts(filteredExplorePosts)

        setAuthors(authorData)
        setAds(adsData)
      } catch (error) {
        console.error("Failed to fetch data:", error)
        setError("Failed to load data. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [condition, userCreatedPosts])

  return {
    // All posts with likes and comments
    allPosts: processedPosts,
    setAllPosts: setProcessedPosts,

    // Posts filtered for the feed
    feedPosts,
    setFeedPosts,

    // Posts filtered for explore
    explorePosts,
    setExplorePosts,

    // Helper functions
    updatePost,
    addCommentToPost,
    getFilteredPostsByRatio,

    // Other data
    authors,
    ads,
    loading,
    error,
  }
}
