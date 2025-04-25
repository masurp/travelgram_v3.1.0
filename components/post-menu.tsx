"use client"

import { useState } from "react"
import { MoreHorizontal, Pencil, Trash2, Flag, Share } from "lucide-react"
import { Button } from "@/components/ui/button"
import EditPostModal from "./edit-post-modal"
import DeleteConfirmationModal from "./delete-confirmation-modal"
import type { Post } from "@/lib/types"

interface PostMenuProps {
  post: Post
  isOwnPost: boolean
  onEditPost?: (postId: string, updates: { caption: string; location?: string }) => void
  onDeletePost?: (postId: string) => void
  onReportPost?: (postId: string) => void
}

export default function PostMenu({ post, isOwnPost, onEditPost, onDeletePost, onReportPost }: PostMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const handleMenuToggle = () => {
    setMenuOpen(!menuOpen)
  }

  const handleEditClick = () => {
    setMenuOpen(false)
    setShowEditModal(true)
  }

  const handleDeleteClick = () => {
    setMenuOpen(false)
    setShowDeleteModal(true)
  }

  const handleReportClick = () => {
    setMenuOpen(false)
    if (onReportPost) {
      onReportPost(post.id)
    }
  }

  const handleShareClick = () => {
    setMenuOpen(false)
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

  const handleEditSave = (postId: string, updates: { caption: string; location?: string }) => {
    if (onEditPost) {
      onEditPost(postId, updates)
    }
    setShowEditModal(false)
  }

  const handleDeleteConfirm = () => {
    console.log(`PostMenu - handleDeleteConfirm called for post ID: ${post.id}, by user: ${post.username}`)
    if (onDeletePost) {
      console.log(`PostMenu - Calling onDeletePost for post ID: ${post.id}`)
      onDeletePost(post.id)
    } else {
      console.error(`PostMenu - onDeletePost is not defined for post ID: ${post.id}`)
    }
    setShowDeleteModal(false)
  }

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleMenuToggle}>
        <MoreHorizontal className="h-5 w-5" />
      </Button>

      {menuOpen && (
        <>
          {/* Backdrop to close menu when clicking outside */}
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />

          {/* Menu */}
          <div className="absolute right-0 top-full mt-1 w-48 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-50">
            <div className="py-1">
              {/* Share option for all posts */}
              <button
                className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={handleShareClick}
              >
                <Share className="h-4 w-4 mr-2" />
                Share
              </button>

              {isOwnPost ? (
                <>
                  <button
                    className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={handleEditClick}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </button>
                  <button
                    className="flex w-full items-center px-4 py-2 text-sm text-red-500 hover:bg-gray-100"
                    onClick={handleDeleteClick}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </button>
                </>
              ) : (
                <button
                  className="flex w-full items-center px-4 py-2 text-sm text-red-500 hover:bg-gray-100"
                  onClick={handleReportClick}
                >
                  <Flag className="h-4 w-4 mr-2" />
                  Report
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {showEditModal && <EditPostModal post={post} onClose={() => setShowEditModal(false)} onSave={handleEditSave} />}

      {showDeleteModal && (
        <DeleteConfirmationModal onConfirm={handleDeleteConfirm} onCancel={() => setShowDeleteModal(false)} />
      )}
    </div>
  )
}
