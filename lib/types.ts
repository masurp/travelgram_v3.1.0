export interface Post {
  id: string
  username: string
  userAvatar?: string
  contentUrl: string
  contentUrls?: string[] // Add this field for multiple photos
  contentType: "image" | "video"
  caption: string
  likes: number
  comments?: Comment[]
  timestamp?: string
  location?: string
  currentPhotoIndex?: number // Track which photo is currently displayed
  disclosure?: string // Add this field for the disclosure category
  order?: number // Add this field for chronological ordering
  deleted?: boolean // Add this field to mark posts as deleted
}

export interface Comment {
  id: string
  username: string
  text: string
  timestamp: string
  order?: number // Add this field for chronological ordering
}

export interface Author {
  username: string
  fullName?: string
  avatar?: string
  userAvatar?: string // Add this as an alternative field name
  bio?: string
  followers: number
  following: 0
  posts: number
}

export interface PostProps {
  post: Post
  onAddComment: (postId: string, comment: Comment) => void
  onProfileClick: (username: string) => void
  onLike: (postId: string, liked: boolean) => void
  likedPosts: Set<string>
}

export type Condition = "condition1" | "condition2" | "condition3" | "condition4" | "condition5"

// Add this interface for ads
export interface Ad {
  id: string
  username: string
  userAvatar?: string
  contentUrl: string
  caption: string
  link: string
  timestamp: string
  type: "ad"
}
