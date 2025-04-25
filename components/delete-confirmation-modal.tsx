"use client"

import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface DeleteConfirmationModalProps {
  onConfirm: () => void
  onCancel: () => void
}

export default function DeleteConfirmationModal({ onConfirm, onCancel }: DeleteConfirmationModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg overflow-hidden w-full max-w-md">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold">Delete Post</h2>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-6 w-6" />
          </Button>
        </div>

        <div className="p-6">
          <p className="mb-6">Are you sure you want to delete this post? This action cannot be undone.</p>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onConfirm}>
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
