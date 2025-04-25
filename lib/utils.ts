import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Define the types of actions we want to track
export type TrackingAction =
  | "view_post"
  | "view_profile"
  | "follow_user"
  | "unfollow_user"
  | "save_post"
  | "unsave_post"
  | "like_post"
  | "unlike_post"
  | "comment_post"
  | "create_post"
  | "update_profile"
  | "report_post"

// Define the tracking data structure
export interface TrackingData {
  action: TrackingAction
  username: string
  postId?: string
  postOwner?: string
  timestamp: string
  text?: string
  condition: string | null
  contentUrl?: string // Add this field to store image data
}

// Function to track an event (Placeholder implementation)
export function trackEvent(data: TrackingData) {
  console.log("Tracking event (placeholder):", data)
  // In a real implementation, this function would send the tracking data to a server.
}
