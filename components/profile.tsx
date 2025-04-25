"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Edit,
  Grid3X3,
  Settings,
  Bookmark,
  Lock,
  Camera,
  MapPin,
  Plane,
  TreePalmIcon as PalmTree,
  Compass,
} from "lucide-react"
import Image from "next/image"
import PostModal from "@/components/post-modal"
import EditProfileModal from "@/components/edit-profile-modal"
import FollowingModal from "@/components/following-modal"
import MobileGallery from "@/components/mobile-gallery"
import { useUser } from "@/contexts/UserContext"
import { trackEvent } from "@/lib/tracking"

interface ProfileProps {
  username: string
  author: any
  posts: any[]
  allPosts: any[]
  authors?: any[]
  onAddComment: (postId: string, text: string) => void
  onBack: () => void
  onLike: (postId: string) => void
  likedPosts: Set<string>
  onProfileClick: (username: string) => void
  onMobileGalleryChange: (index: number) => void
  onReportPost: (postId: string) => void
  initialTab?: "posts" | "saved"
  onSettingsClick: () => void
  onFollowToggle?: () => void
  onEditPost?: (postId: string, updates: { caption: string; location?: string }) => void
  onDeletePost?: (postId: string) => void
  condition?: string
}

export default function Profile({
  username,
  author,
  posts,
  allPosts,
  authors = [],
  onAddComment,
  onBack,
  onLike,
  likedPosts,
  onProfileClick,
  onMobileGalleryChange,
  onReportPost,
  initialTab = "posts",
  onSettingsClick,
  onFollowToggle,
  onEditPost,
  onDeletePost,
  condition,
}: ProfileProps) {
  const contentPaddingClass = "pb-8"
  const [activeTab, setActiveTab] = useState<"posts" | "saved">(initialTab)
  const [showModal, setShowModal] = useState(false)
  const [selectedPost, setSelectedPost] = useState<any>(null)
  const [currentPostIndex, setCurrentPostIndex] = useState(0)
  const [showEditProfileModal, setShowEditProfileModal] = useState(false)
  const [showFollowingModal, setShowFollowingModal] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)
  const [fullName, setFullName] = useState("")
  const [bio, setBio] = useState("")
  const [savedPostsData, setSavedPostsData] = useState<any[]>([])
  const [followedUsers, setFollowedUsers] = useState<string[]>([])
  const [followingCount, setFollowingCount] = useState(0)
  const [showMobileGallery, setShowMobileGallery] = useState(false)
  const [mobileGalleryIndex, setMobileGalleryIndex] = useState(0)
  const [profilePosts, setProfilePosts] = useState<any[]>([])
  const [avatarError, setAvatarError] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const {
    username: currentUsername,
    profilePhoto: userProfilePhoto,
    bio: userBio,
    fullName: userFullName,
    savedPosts,
    followedUsers: userFollowedUsers,
    followUser,
    unfollowUser,
    participantId,
    savePost,
    unsavePost,
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

  // Log when the component mounts and when props change
  useEffect(() => {
    console.log("Profile - Current username:", username)
    console.log("Profile - Current user username:", currentUsername)
    console.log("Profile - User profile photo:", userProfilePhoto ? userProfilePhoto.substring(0, 50) + "..." : null)
    console.log("Profile - Author data:", author)

    // Track profile view when the component mounts
    if (condition) {
      console.log(`Tracking profile view: ${username} by ${currentUsername}`)
      trackEvent({
        action: "view_profile",
        username: currentUsername, // This is the current user viewing the profile
        postOwner: username, // This is the profile being viewed
        condition,
        participantId,
      })
    }

    if (username === currentUsername) {
      console.log("Profile - Setting profile data from user context")
      setProfilePhoto(userProfilePhoto)
      setBio(userBio)
      setFullName(userFullName || username)

      // Set followed users from user context
      setFollowedUsers(userFollowedUsers || [])
      setFollowingCount(userFollowedUsers?.length || 0)
      console.log("Profile - Set followed users from context:", userFollowedUsers)

      // For the current user, always set followers to 0 - this ensures we don't inherit
      // stats from any matching username in the sheet
      author.followers = 0
    } else {
      console.log("Profile - Setting profile data from author:", author)
      // Make sure we have a valid avatar URL
      if (author.avatar) {
        console.log("Profile - Setting avatar from author:", author.avatar)
        setProfilePhoto(author.avatar)
      } else if (author.userAvatar) {
        console.log("Profile - Setting userAvatar from author:", author.userAvatar)
        setProfilePhoto(author.userAvatar)
      } else {
        // Try to find a post from this user to get their avatar
        const userPost = allPosts.find((post) => post.username === username)
        if (userPost && userPost.userAvatar) {
          console.log("Profile - Setting avatar from user post:", userPost.userAvatar)
          setProfilePhoto(userPost.userAvatar)
        } else {
          console.log("Profile - No avatar found for user")
          setProfilePhoto(null)
        }
      }

      setBio(author.bio || "")
      setFullName(author.fullName || username)

      // For other users, set following count from author data
      setFollowingCount(author.following || 0)
      console.log("Profile - Set following count from author:", author.following)
    }

    // Check if the current user is following this profile
    if (username !== currentUsername) {
      setIsFollowing(userFollowedUsers.includes(username))
      console.log(`Profile - Is following ${username}:`, userFollowedUsers.includes(username))
    }
  }, [
    username,
    currentUsername,
    userProfilePhoto,
    userBio,
    userFullName,
    author,
    userFollowedUsers,
    allPosts,
    condition,
  ])

  // Update followed users when they change in UserContext
  useEffect(() => {
    if (username === currentUsername && userFollowedUsers) {
      setFollowedUsers(userFollowedUsers)
      setFollowingCount(userFollowedUsers.length)
      console.log("Profile - Updated followed users:", userFollowedUsers)
    }
  }, [username, currentUsername, userFollowedUsers])

  // Update saved posts when they change in UserContext or when all posts change
  useEffect(() => {
    if (username === currentUsername && savedPosts && savedPosts.length > 0) {
      console.log("Profile - Updating saved posts. Saved IDs:", savedPosts)
      console.log("Profile - All posts available:", allPosts.length)

      // Filter all posts to get only the saved ones
      const savedPostsArray = allPosts.filter((post) => savedPosts.includes(post.id))
      console.log("Profile - Found saved posts:", savedPostsArray.length)

      setSavedPostsData(savedPostsArray)
    } else {
      setSavedPostsData([])
    }
  }, [username, currentUsername, savedPosts, allPosts])

  const displayName = fullName || username
  const displayBio = bio || ""
  const isCurrentUser = username === currentUsername

  const handleTabChange = (tab: "posts" | "saved") => {
    setActiveTab(tab)
  }

  // Update the handlePostClick function to pass the correct posts array to the modal

  const handlePostClick = (post: any, allPosts: any[]) => {
    setSelectedPost(post)
    setCurrentPostIndex(allPosts.findIndex((p) => p.id === post.id))

    if (isMobile) {
      // For mobile, open the mobile gallery
      setMobileGalleryIndex(allPosts.findIndex((p) => p.id === post.id))
      setShowMobileGallery(true)
    } else {
      // For desktop, open the modal
      setShowModal(true)
    }
  }

  const handleEditProfile = () => {
    setShowEditProfileModal(true)
  }

  const handleSaveProfileChanges = (newProfileData: any) => {
    console.log("Profile - Received profile changes:", {
      ...newProfileData,
      profilePhoto: newProfileData.profilePhoto ? newProfileData.profilePhoto.substring(0, 50) + "..." : null,
    })

    setProfilePhoto(newProfileData.profilePhoto)
    setFullName(newProfileData.fullName)
    setBio(newProfileData.bio)
    setShowEditProfileModal(false)

    // Force a re-render
    setTimeout(() => {
      setAvatarError(false)
    }, 100)
  }

  const handleFollowToggle = () => {
    const newFollowingState = !isFollowing
    setIsFollowing(newFollowingState)

    // Call the parent component's handler if provided
    if (onFollowToggle) {
      onFollowToggle()
    } else {
      // Otherwise use the context methods directly
      if (newFollowingState) {
        followUser(username)
      } else {
        unfollowUser(username)
      }
    }
  }

  const handleSavePost = (postId: string) => {
    // This is handled by the UserContext now
  }

  const handleShowFollowing = () => {
    setShowFollowingModal(true)
  }

  const handleNavigate = (direction: "prev" | "next") => {
    if (!selectedPost) return

    const displayPosts = activeTab === "posts" ? posts : savedPostsData

    let newIndex = currentPostIndex
    if (direction === "prev") {
      newIndex = currentPostIndex > 0 ? currentPostIndex - 1 : displayPosts.length - 1
    } else {
      newIndex = currentPostIndex < displayPosts.length - 1 ? currentPostIndex + 1 : 0
    }

    setCurrentPostIndex(newIndex)
    setSelectedPost(displayPosts[newIndex])
  }

  const handleMobileGalleryOpen = useCallback(
    (open: boolean) => {
      setShowMobileGallery(open)
      // Also notify the parent component about the gallery state
      if (onMobileGalleryChange) {
        onMobileGalleryChange(open)
      }
    },
    [onMobileGalleryChange],
  )

  const handleAvatarError = () => {
    console.error("Avatar image error in Profile component for user:", username)
    console.error("Avatar URL was:", profilePhoto)
    setAvatarError(true)
  }

  const displayPosts = activeTab === "posts" ? posts : savedPostsData

  const isCommentsOnlyUser = useMemo(() => {
    // Never mark the current user's account as private
    if (username === currentUsername) {
      return false
    }

    // Check if this user is only in comments (not in authors sheet and has no posts)
    const isInAuthorsSheet = authors.some((author) => author.username.toLowerCase() === username.toLowerCase())
    const hasNoPosts = posts.length === 0

    // User is comments-only if they're not in authors sheet and have no posts
    return !isInAuthorsSheet && hasNoPosts
  }, [username, authors, posts, currentUsername])

  // Empty state illustrations for posts and saved posts
  const EmptyPostsIllustration = () => (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-full p-8 mb-6">
        <div className="relative w-24 h-24">
          <Camera className="absolute top-0 left-0 h-12 w-12 text-blue-500 dark:text-blue-400" />
          <PalmTree className="absolute bottom-0 right-0 h-12 w-12 text-green-500 dark:text-green-400" />
          <Plane className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-16 w-16 text-blue-600 dark:text-blue-300" />
        </div>
      </div>
      <h3 className="text-xl font-semibold text-center mb-2 dark:text-white">No adventures shared yet</h3>
      <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
        {isCurrentUser
          ? "Start sharing travel moments by creating your first post!"
          : "This traveler hasn't shared any adventures yet."}
      </p>
    </div>
  )

  const EmptySavedIllustration = () => (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-full p-8 mb-6">
        <div className="relative w-24 h-24">
          <Bookmark className="absolute top-0 left-0 h-12 w-12 text-amber-500 dark:text-amber-400" />
          <MapPin className="absolute bottom-0 right-0 h-12 w-12 text-red-500 dark:text-red-400" />
          <Compass className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-16 w-16 text-amber-600 dark:text-amber-300" />
        </div>
      </div>
      <h3 className="text-xl font-semibold text-center mb-2 dark:text-white">No saved destinations yet</h3>
      <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
        Save posts to create your travel bucket list and keep track of destinations you want to visit!
      </p>
    </div>
  )

  return (
    <div
      className={`w-full max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto ${contentPaddingClass} px-4 sm:px-6 lg:px-8 pt-4`}
    >
      {/* Profile header */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 py-8 border-b dark:border-gray-700">
        <Avatar className="h-28 w-28 sm:h-32 sm:w-32">
          {!avatarError && profilePhoto ? (
            <AvatarImage
              src={profilePhoto}
              alt={username}
              onError={handleAvatarError}
              className="cursor-pointer"
              onClick={() => {
                if (profilePhoto) {
                  setSelectedPost({
                    id: "profile-avatar",
                    username,
                    userAvatar: profilePhoto,
                    contentUrl: profilePhoto,
                    contentType: "image",
                    caption: `${username}'s profile picture`,
                    likes: 0,
                  })

                  if (!isMobile) {
                    setShowModal(true)
                  } else {
                    const avatarPost = {
                      id: "profile-avatar",
                      username,
                      userAvatar: profilePhoto,
                      contentUrl: profilePhoto,
                      contentType: "image",
                      caption: `${username}'s profile picture`,
                      likes: 0,
                    }
                    setMobileGalleryIndex(0)
                    handleMobileGalleryOpen(true)
                    setProfilePosts([avatarPost])
                  }
                }
              }}
            />
          ) : (
            <AvatarFallback>{username.substring(0, 2).toUpperCase()}</AvatarFallback>
          )}
        </Avatar>

        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
            <h2 className="text-xl font-semibold dark:text-white text-center sm:text-left">{displayName}</h2>
            <div className="flex gap-2 justify-center sm:justify-start">
              {isCurrentUser ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEditProfile}
                  className="dark:border-gray-600 dark:text-white"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit Profile
                </Button>
              ) : (
                <Button variant={isFollowing ? "secondary" : "default"} size="sm" onClick={handleFollowToggle}>
                  {isFollowing ? "Following" : "Follow"}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={onBack} className="dark:border-gray-600 dark:text-white">
                Back to Feed
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 dark:text-white" onClick={onSettingsClick}>
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="flex justify-center sm:justify-start gap-6 mb-4">
            <div className="text-center">
              <span className="font-semibold dark:text-white">{posts.length}</span>
              <p className="text-sm text-gray-500 dark:text-gray-400">posts</p>
            </div>
            <div className="text-center">
              <span className="font-semibold dark:text-white">{isCurrentUser ? 0 : author.followers}</span>
              <p className="text-sm text-gray-500 dark:text-gray-400">followers</p>
            </div>
            <div className="text-center cursor-pointer" onClick={handleShowFollowing}>
              <span className="font-semibold dark:text-white">{followingCount}</span>
              <p className="text-sm text-gray-500 dark:text-gray-400">following</p>
            </div>
          </div>

          <p className="text-sm dark:text-gray-300">{displayBio}</p>
        </div>
      </div>

      {/* Profile tabs - only show saved tab for current user */}
      <div className="flex justify-center border-b dark:border-gray-700">
        <button
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium ${
            activeTab === "posts"
              ? "border-t-2 border-black dark:border-white dark:text-white"
              : "text-gray-500 dark:text-gray-400"
          }`}
          onClick={() => handleTabChange("posts")}
        >
          <Grid3X3 className="h-4 w-4" />
          <span>Posts</span>
        </button>
        {isCurrentUser && (
          <button
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium ${
              activeTab === "saved"
                ? "border-t-2 border-black dark:border-white dark:text-white"
                : "text-gray-500 dark:text-gray-400"
            }`}
            onClick={() => handleTabChange("saved")}
          >
            <Bookmark className="h-4 w-4" />
            <span>Saved</span>
          </button>
        )}
      </div>

      {/* Private account message for comments-only users */}
      {isCommentsOnlyUser ? (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-full p-6 mb-6">
            <Lock className="h-12 w-12 text-gray-500 dark:text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-center mb-2 dark:text-white">This account is private.</h3>
          <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
            This user has not shared any posts or profile information.
          </p>
        </div>
      ) : (
        /* Posts grid - now with larger images */
        <div className="grid grid-cols-3 gap-2 mt-6">
          {displayPosts.length > 0 ? (
            // Sort posts by order column in descending order (newest first)
            [...displayPosts]
              .sort((a, b) => {
                // If order property is available, sort by it (lower values first - oldest to newest)
                if (a.order !== undefined && b.order !== undefined) {
                  return a.order - b.order
                }
                // Fallback to timestamp sorting if order is not available (oldest to newest)
                if (a.timestamp && b.timestamp) {
                  return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                }
                // If no timestamps, keep original order
                return 0
              })
              .map((post) => (
                <div
                  key={post.id}
                  className="aspect-square relative cursor-pointer overflow-hidden rounded-md shadow-sm hover:shadow-md transition-shadow"
                  onClick={() => handlePostClick(post, displayPosts)}
                >
                  <Image
                    src={post.contentUrl || "/placeholder.svg"}
                    alt={post.caption}
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-300"
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
                </div>
              ))
          ) : (
            <div className="col-span-3">
              {activeTab === "posts" ? <EmptyPostsIllustration /> : <EmptySavedIllustration />}
            </div>
          )}
        </div>
      )}

      {/* Post modal - only for desktop */}
      {showModal && selectedPost && !isMobile && (
        <PostModal
          post={selectedPost}
          onClose={() => setShowModal(false)}
          onAddComment={onAddComment}
          onLike={(postId) => onLike(postId, !likedPosts.has(postId))}
          isLiked={likedPosts.has(selectedPost.id)}
          isSaved={savedPosts.includes(selectedPost.id)}
          onSave={() => {
            if (savedPosts.includes(selectedPost.id)) {
              unsavePost(selectedPost.id)
            } else {
              savePost(selectedPost.id)
            }
          }}
          onProfileClick={onProfileClick}
          allPosts={activeTab === "posts" ? posts : savedPostsData}
          currentIndex={currentPostIndex}
          onNavigate={handleNavigate}
          onEditPost={isCurrentUser ? onEditPost : undefined}
          onDeletePost={
            isCurrentUser
              ? (postId) => {
                  console.log(`Profile - onDeletePost called for post ID: ${postId}`)
                  if (onDeletePost) {
                    onDeletePost(postId)
                    setShowModal(false)
                  }
                }
              : undefined
          }
          isOwnPost={isCurrentUser && selectedPost.username === currentUsername}
        />
      )}

      {/* Edit Profile Modal */}
      {showEditProfileModal && (
        <EditProfileModal
          profilePhoto={profilePhoto}
          fullName={fullName || username}
          username={username}
          bio={bio}
          onClose={() => setShowEditProfileModal(false)}
          onSave={handleSaveProfileChanges}
        />
      )}

      {/* Following Modal */}
      {showFollowingModal && (
        <FollowingModal
          onClose={() => setShowFollowingModal(false)}
          followedUsers={isCurrentUser ? followedUsers : []}
          onProfileClick={(username) => {
            onProfileClick(username)
            setShowFollowingModal(false)
          }}
          allPosts={allPosts} // Pass all posts to get avatars
        />
      )}

      {/* Mobile Gallery */}
      {showMobileGallery && (
        <MobileGallery
          posts={profilePosts.length > 0 ? profilePosts : displayPosts}
          initialIndex={mobileGalleryIndex}
          onClose={() => handleMobileGalleryOpen(false)}
          onLike={onLike}
          likedPosts={likedPosts}
          onProfileClick={onProfileClick}
        />
      )}
    </div>
  )
}
