"use client"

import { useState, useEffect } from "react"
import { X, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface FollowingModalProps {
  onClose: () => void
  followedUsers: string[]
  onProfileClick: (username: string) => void
  allPosts?: Array<{ username: string; userAvatar?: string }> // Add this to get avatars
}

export default function FollowingModal({ onClose, followedUsers, onProfileClick, allPosts = [] }: FollowingModalProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [userAvatars, setUserAvatars] = useState<Record<string, string>>({})

  // Filter users based on search query
  const filteredUsers = followedUsers.filter((user) => user.toLowerCase().includes(searchQuery.toLowerCase()))

  // Extract avatars from posts on component mount
  useEffect(() => {
    const avatarMap: Record<string, string> = {}

    // Go through all posts to find avatars for followed users
    allPosts.forEach((post) => {
      if (followedUsers.includes(post.username) && post.userAvatar && !avatarMap[post.username]) {
        avatarMap[post.username] = post.userAvatar
      }
    })

    setUserAvatars(avatarMap)
  }, [followedUsers, allPosts])

  // Get avatar for a user, or return undefined if not found
  const getUserAvatar = (username: string): string | undefined => {
    return userAvatars[username]
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden w-full max-w-md">
        {/* Header */}
        <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold dark:text-white">Following</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="dark:text-white">
            <X className="h-6 w-6" />
          </Button>
        </div>

        {/* Search */}
        <div className="p-4 border-b dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              className="pl-10 dark:bg-gray-700 dark:text-white dark:border-gray-600"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* User List */}
        <div className="max-h-96 overflow-y-auto">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <div
                key={user}
                className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => onProfileClick(user)}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    {getUserAvatar(user) ? (
                      <AvatarImage src={getUserAvatar(user)} alt={user} />
                    ) : (
                      <AvatarFallback>{user.substring(0, 2).toUpperCase()}</AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <p className="font-medium dark:text-white">{user}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              {searchQuery ? "No users found" : "Not following anyone yet"}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
