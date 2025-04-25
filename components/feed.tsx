"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import Post from "@/components/post"
import Header from "@/components/header"
import MobileFooter from "@/components/mobile-footer"
import { Skeleton } from "@/components/ui/skeleton"
import type { Post as PostType } from "@/lib/types"
import { useUser } from "@/contexts/UserContext"
import { Button } from "@/components/ui/button"
import Profile from "@/components/profile"
import Settings from "@/components/settings"
import { isDesktop } from "@/lib/deviceUtils"
import CreatePostModal from "./create-post-modal"
import { useDarkMode } from "@/contexts/DarkModeContext"
import { getAvatarUrl } from "@/lib/imageUtils"
import { trackEvent } from "@/lib/tracking"
import MobileSearchBar from "@/components/mobile-search-bar"
import { usePostData } from "@/hooks/usePostData"
import { usePostInteractions } from "@/hooks/usePostInteractions"
import { searchPosts } from "@/lib/postUtils"
import ExplorePage from "@/components/explore-page"
import PostModal from "@/components/post-modal"
import ExplorePostView from "@/components/explore-post-view"
import AdPost from "@/components/ad-post"

export default function Feed() {
  // Use our custom hooks for data and interactions
  const { allPosts, feedPosts, explorePosts, updatePost, addCommentToPost, authors, loading, error, ads } =
    usePostData()

  const {
    likedPostsSet,
    reportedPosts,
    handleLike,
    handleSave,
    handleFollowToggle,
    handleReportPost,
    handleEditPost,
    handleDeletePost,
    handleAddComment,
  } = usePostInteractions()

  const [searchKeyword, setSearchKeyword] = useState("")
  const [filteredPosts, setFilteredPosts] = useState<PostType[]>([])
  const {
    condition,
    username,
    logout,
    profilePhoto,
    fullName,
    bio,
    savedPosts,
    followedUsers,
    addUserCreatedPost,
    participantId,
  } = useUser()
  const [showProfile, setShowProfile] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [profileUsername, setProfileUsername] = useState("")
  const [profilePosts, setProfilePosts] = useState<PostType[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [activeProfileTab, setActiveProfileTab] = useState<"posts" | "saved">("posts")
  const [mobileGalleryOpen, setMobileGalleryOpen] = useState(false)
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  const { isDarkMode } = useDarkMode()
  const desktop = isDesktop()
  const [showExplore, setShowExplore] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [selectedPost, setSelectedPost] = useState<PostType | null>(null)
  const [currentPostIndex, setCurrentPostIndex] = useState(0)
  const [showExplorePostView, setShowExplorePostView] = useState(false)
  const [hasTrackedFeedView, setHasTrackedFeedView] = useState(false)
  const searchTrackingTimeout = useRef<NodeJS.Timeout | null>(null)
  const [showMobileGallery, setShowMobileGallery] = useState(false)

  // Filter posts based on search keyword
  useEffect(() => {
    // First get the filtered posts based on search
    const filtered = searchKeyword ? searchPosts(feedPosts, searchKeyword) : feedPosts

    // Separate user's own posts from other posts
    const userOwnPosts = filtered.filter((post) => post.username === username)
    const otherPosts = filtered.filter((post) => post.username !== username)

    // Combine with user's posts at the top
    setFilteredPosts([...userOwnPosts, ...otherPosts])
  }, [searchKeyword, feedPosts, username])

  // Track feed view only once when component mounts
  useEffect(() => {
    if (condition && !hasTrackedFeedView) {
      trackEvent({
        action: "view_post",
        username,
        postId: "feed-page",
        postOwner: "system",
        condition,
        participantId,
      })
      setHasTrackedFeedView(true)
    }
  }, [condition, username, hasTrackedFeedView])

  const handleSearch = useCallback(
    (keyword: string) => {
      setSearchKeyword(keyword)

      // Only track when the user has entered a meaningful search term
      // and after a short delay to avoid tracking every keystroke
      if (keyword.trim().length > 2) {
        // Use setTimeout to debounce the tracking
        clearTimeout(searchTrackingTimeout.current)
        searchTrackingTimeout.current = setTimeout(() => {
          if (condition) {
            trackEvent({
              action: "search",
              username,
              condition,
              text: keyword.trim(), // Track what they searched for
              participantId,
            })
          }
        }, 1000) // Wait 1 second after typing stops before tracking
      }
    },
    [condition, username, participantId],
  )

  const handleMobileSearchToggle = useCallback(() => {
    setShowMobileSearch((prev) => !prev)
    // If closing the search bar, clear the search
    if (showMobileSearch) {
      setSearchKeyword("")
    }
  }, [showMobileSearch])

  // Optimized function to handle post interactions
  const handlePostLike = useCallback(
    (postId: string, liked: boolean) => {
      const post = allPosts.find((p) => p.id === postId)
      if (!post) return

      handleLike(postId, liked, post.username)

      // Update the post in our single source of truth
      const updatedPost = {
        ...post,
        likes: post.likes + (liked ? 1 : -1),
      }

      updatePost(updatedPost)
    },
    [allPosts, handleLike, updatePost],
  )

  // Optimized function to handle post editing
  const handlePostEdit = useCallback(
    (postId: string, updates: { caption: string; location?: string }) => {
      const post = allPosts.find((p) => p.id === postId)
      if (!post) return

      const updatedPost = {
        ...post,
        caption: updates.caption,
        location: updates.location,
      }

      updatePost(updatedPost)
    },
    [allPosts, updatePost],
  )

  // Optimized function to handle post deletion
  const handlePostDelete = useCallback(
    (postId: string) => {
      console.log(`Feed - handlePostDelete called for post ID: ${postId}`)

      // Remove the post from filtered posts
      setFilteredPosts((prev) => prev.filter((post) => post.id !== postId))

      // Find the post in allPosts
      const post = allPosts.find((p) => p.id === postId)
      if (post) {
        console.log(`Found post to delete: ${post.username} - ${post.caption?.substring(0, 20) || "No caption"}`)

        // If it's a user-created post, remove it from UserContext
        if (post.id.startsWith("user-post-")) {
          console.log(`Removing user-created post from UserContext: ${postId}`)
          // This will be handled by the usePostInteractions hook
        }

        // Mark the post as deleted in the central data store
        updatePost({
          ...post,
          deleted: true, // Mark as deleted so it can be filtered out
        })

        // Also update profile posts if we're in profile view
        if (showProfile && profileUsername === post.username) {
          setProfilePosts((prev) => prev.filter((p) => p.id !== postId))
        }

        // Call the interaction hook's delete handler with the post owner
        handleDeletePost(postId, post.username)
      } else {
        console.log(`Post with ID ${postId} not found in allPosts`)
        // Still call delete handler with just the ID
        handleDeletePost(postId)
      }
    },
    [allPosts, updatePost, showProfile, profileUsername, handleDeletePost],
  )

  // Optimized function to handle comment addition
  const handlePostComment = useCallback(
    (postId: string, comment: any) => {
      const post = allPosts.find((p) => p.id === postId)
      if (!post) return

      // Track the comment event via the interaction hook
      handleAddComment(postId, comment, [], () => {}, post.username)

      // Add the comment to our single source of truth
      addCommentToPost(postId, comment)
    },
    [allPosts, handleAddComment, addCommentToPost],
  )

  // Optimized function to handle post reporting
  const handlePostReport = useCallback(
    (postId: string) => {
      const post = allPosts.find((p) => p.id === postId)
      if (!post) return

      handleReportPost(postId, post.username)

      // Remove the post from the feed after the overlay is shown
      setTimeout(() => {
        setFilteredPosts((prevPosts) => prevPosts.filter((post) => post.id !== postId))
      }, 3000) // This matches the countdown in the ReportOverlay
    },
    [allPosts, handleReportPost],
  )

  // Optimized function to handle profile clicks
  const handleProfileClick = useCallback(
    (profileUsername: string) => {
      // Close settings if open
      setShowSettings(false)

      const userPosts = allPosts.filter((post) => post.username === profileUsername)
      setProfileUsername(profileUsername)
      setProfilePosts(userPosts)
      setShowProfile(true)
      setActiveProfileTab("posts")

      // Always track profile views, even for the user's own profile
      if (condition) {
        console.log(`Tracking profile click: ${profileUsername} by ${username}`)
        trackEvent({
          action: "view_profile",
          username, // The current user's username (viewer)
          postOwner: profileUsername, // The profile being viewed
          condition,
          participantId,
        })
      }
    },
    [allPosts, condition, username],
  )

  const handleSavedClick = useCallback(() => {
    // Close settings if open
    setShowSettings(false)

    setProfileUsername(username)
    setProfilePosts(allPosts.filter((post) => post.username === username))
    setShowProfile(true)
    setActiveProfileTab("saved")
  }, [username, allPosts])

  const handleSettingsClick = useCallback(() => {
    // Close profile if open
    setShowProfile(false)
    // Open settings
    setShowSettings(true)
  }, [])

  const handleBackToFeed = useCallback(() => {
    setShowProfile(false)
    setShowSettings(false)
    setShowExplore(false)
    // Clear search when returning to feed
    setSearchKeyword("")
  }, [])

  const handleCloseTab = useCallback(() => {
    window.open("", "_self")
    window.close()
  }, [])

  const handleCreatePost = useCallback(
    (newPostData: Omit<PostType, "id" | "likes" | "comments">) => {
      // Create a new post with a unique ID and initial likes/comments
      const newPost: PostType = {
        ...newPostData,
        id: `user-post-${Date.now()}`,
        likes: 0,
        comments: [],
        timestamp: "1 min ago", // Use "1 min ago" instead of actual date
      }

      // Add the new post to our single source of truth
      updatePost(newPost)

      // Store the new post in the UserContext
      addUserCreatedPost(newPost)
    },
    [updatePost, addUserCreatedPost],
  )

  // Get current author data - memoized to prevent unnecessary recalculations
  const getCurrentAuthor = useCallback(
    (username: string) => {
      // Case-insensitive search for the author
      const author = authors.find((author) => author.username.toLowerCase() === username.toLowerCase())

      if (author) {
        // Make sure the avatar is properly formatted
        if (author.avatar && !author.avatar.startsWith("http")) {
          // If it's not a full URL, it might be just the filename from the Authors sheet
          author.avatar = getAvatarUrl(author.avatar)
        }

        return author
      }

      // Try a more flexible search if exact match fails
      const partialMatch = authors.find(
        (author) =>
          author.username.toLowerCase().includes(username.toLowerCase()) ||
          username.toLowerCase().includes(author.username.toLowerCase()),
      )

      if (partialMatch) {
        // Make sure the avatar is properly formatted
        if (partialMatch.avatar && !partialMatch.avatar.startsWith("http")) {
          partialMatch.avatar = getAvatarUrl(partialMatch.avatar)
        }

        return partialMatch
      }

      // If we don't find the author, create a default one
      const userPosts = allPosts.filter((post) => post.username === username)

      // Try to get the avatar from one of the user's posts
      const avatarFromPost = userPosts.length > 0 ? userPosts[0].userAvatar : null

      return {
        username,
        fullName: username,
        avatar: avatarFromPost,
        followers: 0,
        following: 0,
        posts: userPosts.length,
        bio: "",
      }
    },
    [authors, allPosts],
  )

  // Get current user profile data - memoized
  const getCurrentUserProfile = useMemo(() => {
    // Start with the author data
    const authorData = getCurrentAuthor(username)

    // Override with user context data for the current user
    return {
      ...authorData,
      avatar: profilePhoto || authorData.avatar, // Use profile photo from context or fall back to author data
      fullName: fullName || authorData.fullName,
      bio: bio || authorData.bio,
      followers: 0, // Always set followers to 0 for the current user
      following: followedUsers.length, // Use the actual following count from context
    }
  }, [username, profilePhoto, fullName, bio, followedUsers.length, getCurrentAuthor])

  // Calculate padding classes based on device type
  const topPaddingClass = desktop ? "pt-14" : "pt-12"
  const contentPaddingClass = desktop ? "pb-20" : "pb-24"

  const handleExploreClick = useCallback(() => {
    setShowProfile(false)
    setShowSettings(false)
    setShowExplore(true)
  }, [])

  const handleExplorePostClick = useCallback(
    (post: PostType, index: number) => {
      // Track post click
      if (post.id && condition) {
        console.log(`Tracking explore post click from feed for post ${post.id} by ${post.username}`)
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
      setCurrentPostIndex(index)

      if (desktop) {
        setShowModal(true)
      } else {
        setShowExplorePostView(true)
        // Hide the mobile footer when showing the explore post view
        setMobileGalleryOpen(true)
      }
    },
    [desktop, condition, username],
  )

  const handleCloseExplorePostView = useCallback(() => {
    setShowExplorePostView(false)
    // Show the mobile footer again when closing the explore post view
    setMobileGalleryOpen(false)
  }, [])

  const handleExploreSavePost = useCallback(
    (postId: string, isSaved: boolean) => {
      handleSave(postId, isSaved)
    },
    [handleSave],
  )

  const handleNavigate = useCallback(
    (direction: "prev" | "next") => {
      if (!selectedPost) return

      let newIndex = currentPostIndex
      if (direction === "prev") {
        newIndex = currentPostIndex > 0 ? currentPostIndex - 1 : filteredPosts.length - 1
      } else {
        newIndex = currentPostIndex < filteredPosts.length - 1 ? currentPostIndex + 1 : 0
      }

      setCurrentPostIndex(newIndex)
      setSelectedPost(filteredPosts[newIndex])
    },
    [selectedPost, currentPostIndex, filteredPosts],
  )

  // Function to insert ads randomly into the feed
  const insertAdsIntoFeed = useCallback(
    (posts: PostType[], ads: any[] = []) => {
      if (!ads || ads.length === 0) return posts

      // Separate user's own posts from other posts to keep them at the top
      const userOwnPosts = posts.filter((post) => post.username === username)
      const otherPosts = posts.filter((post) => post.username !== username)

      // Create a copy of the other posts array
      const result = [...otherPosts]

      // For every 4-6 posts, insert an ad
      const adFrequency = Math.floor(Math.random() * 3) + 4 // Random number between 4 and 6

      // Shuffle the ads to get random ones
      const shuffledAds = [...ads].sort(() => Math.random() - 0.5)

      // Insert ads at regular intervals in the other posts
      for (let i = 0; i < shuffledAds.length; i++) {
        const position = (i + 1) * adFrequency
        if (position < result.length) {
          // Mark the ad with a type property
          result.splice(position, 0, { ...shuffledAds[i], type: "ad" })
        }
      }

      // Return with user's own posts at the top
      return [...userOwnPosts, ...result]
    },
    [username],
  )

  return (
    <div className={`flex flex-col items-center min-h-screen w-full ${topPaddingClass} bg-gray-100 dark:bg-gray-900`}>
      <Header
        onSearch={handleSearch}
        onHomeClick={handleBackToFeed}
        onCreatePost={handleCreatePost}
        onProfileClick={handleProfileClick}
        onSavedClick={handleSavedClick}
        onSettingsClick={handleSettingsClick}
        onExploreClick={handleExploreClick}
      />

      {/* Mobile Search Bar - Only show on mobile when toggled */}
      {!desktop && showMobileSearch && (
        <MobileSearchBar
          onSearch={handleSearch}
          onClose={() => setShowMobileSearch(false)}
          searchTerm={searchKeyword}
        />
      )}

      <div className={`w-full max-w-md md:max-w-xl lg:max-w-2xl mx-auto ${contentPaddingClass} px-4 sm:px-6 lg:px-8`}>
        {loading ? (
          <div className="space-y-6 pt-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={`skeleton-${i}`}
                className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg overflow-hidden"
              >
                <div className="p-4 flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full dark:bg-gray-700" />
                  <Skeleton className="h-4 w-32 dark:bg-gray-700" />
                </div>
                <Skeleton className="h-96 w-full dark:bg-gray-700" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-4 w-full dark:bg-gray-700" />
                  <Skeleton className="h-4 w-3/4 dark:bg-gray-700" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="text-center text-red-500 mt-8 dark:text-red-400">{error}</p>
        ) : showSettings ? (
          <Settings onBack={handleBackToFeed} />
        ) : showProfile ? (
          <Profile
            username={profileUsername}
            author={profileUsername === username ? getCurrentUserProfile : getCurrentAuthor(profileUsername)}
            posts={profilePosts}
            allPosts={allPosts}
            authors={authors} // Add this line to pass the authors array
            onAddComment={handlePostComment}
            onBack={handleBackToFeed}
            onLike={handlePostLike}
            likedPosts={likedPostsSet}
            onProfileClick={handleProfileClick}
            onMobileGalleryChange={setMobileGalleryOpen}
            onReportPost={handlePostReport}
            initialTab={activeProfileTab}
            onSettingsClick={handleSettingsClick}
            onEditPost={profileUsername === username ? handlePostEdit : undefined}
            onDeletePost={profileUsername === username ? handleDeletePost : undefined}
            condition={condition}
          />
        ) : showExplore ? (
          <ExplorePage
            onPostClick={handleExplorePostClick}
            allPosts={allPosts}
            explorePosts={explorePosts}
            onLike={handlePostLike}
            likedPosts={likedPostsSet}
            onProfileClick={handleProfileClick}
            onAddComment={handlePostComment}
            savedPosts={savedPosts}
            onSavePost={handleExploreSavePost}
          />
        ) : (
          <>
            <div className="space-y-6 pt-4">
              {filteredPosts.length > 0 ? (
                // Insert ads randomly into the feed
                insertAdsIntoFeed(filteredPosts, ads).map((item) =>
                  item.type === "ad" ? (
                    <AdPost key={`ad-${item.id}`} ad={item} onProfileClick={handleProfileClick} authors={authors} />
                  ) : (
                    <Post
                      key={item.id}
                      post={item}
                      onAddComment={handlePostComment}
                      onProfileClick={handleProfileClick}
                      onLike={handlePostLike}
                      likedPosts={likedPostsSet}
                      onEditPost={item.username === username ? handlePostEdit : undefined}
                      onDeletePost={item.username === username ? handleDeletePost : undefined}
                      onMobileGalleryChange={setMobileGalleryOpen}
                      onReportPost={handlePostReport}
                      onFollowToggle={handleFollowToggle}
                    />
                  ),
                )
              ) : (
                <p className="text-center text-gray-500 dark:text-gray-400 mt-8">
                  No posts found matching your search.
                </p>
              )}
            </div>
            <div className="mt-8 text-center">
              <p className="mb-4 text-gray-700 dark:text-gray-300">
                If you have finished browsing through the feed, please click the button below or close the current tab
                in your Browser to return to the survey.
              </p>
              <Button onClick={handleCloseTab} className="bg-red-500 hover:bg-red-600 text-white">
                Close Tab
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Mobile Footer Navigation - hide when mobile gallery is open or any post view is open */}
      {!desktop && !mobileGalleryOpen && !showExplorePostView && !showMobileGallery && (
        <MobileFooter
          onHomeClick={handleBackToFeed}
          onSearchClick={handleMobileSearchToggle}
          onCreatePostClick={() => setShowCreateModal(true)}
          onProfileClick={() => handleProfileClick(username)}
          onExploreClick={handleExploreClick}
          onLogout={logout}
          onSearchClear={() => setSearchKeyword("")}
        />
      )}

      {/* Create Post Modal */}
      {showCreateModal && <CreatePostModal onClose={() => setShowCreateModal(false)} onCreatePost={handleCreatePost} />}

      {/* Desktop Post Modal */}
      {showModal && selectedPost && (
        <PostModal
          post={selectedPost}
          onClose={() => setShowModal(false)}
          onLike={handlePostLike}
          isLiked={likedPostsSet.has(selectedPost.id)}
          isSaved={savedPosts.includes(selectedPost.id)}
          onSave={() => handleExploreSavePost(selectedPost.id, savedPosts.includes(selectedPost.id))}
          onAddComment={handlePostComment}
          onProfileClick={handleProfileClick}
          onReportPost={handlePostReport}
          onEditPost={selectedPost.username === username ? handlePostEdit : undefined}
          onDeletePost={selectedPost.username === username ? handleDeletePost : undefined}
          onNavigate={handleNavigate}
          allPosts={filteredPosts}
          currentIndex={currentPostIndex}
          isOwnPost={selectedPost.username === username}
        />
      )}

      {/* Mobile Explore Post View */}
      {!desktop && showExplorePostView && selectedPost && (
        <ExplorePostView
          posts={explorePosts}
          initialIndex={currentPostIndex}
          onClose={handleCloseExplorePostView}
          onLike={handlePostLike}
          likedPosts={likedPostsSet}
          onProfileClick={handleProfileClick}
          onAddComment={handlePostComment}
          savedPosts={savedPosts}
          onSavePost={handleExploreSavePost}
          onReportPost={handlePostReport}
        />
      )}
    </div>
  )
}
