import type { Post, Comment, Author } from "./types"
import { getImageUrl, getAvatarUrl } from "./imageUtils"

// Use a single sheet ID for all data
const SHEET_ID = process.env.NEXT_PUBLIC_SHEET_ID

// Update the sheet names to use the same sheets for all conditions
const sheetNames = {
  posts: "Posts",
  comments: "Comments",
}

// Add caching for fetched data
const cache = {
  posts: new Map<string, any[]>(),
  comments: new Map<string, any[]>(),
  authors: null as any[] | null,
  ads: null as any[] | null,
}

// Common function to fetch CSV data from Google Sheets with error handling and retries
async function fetchCSV(sheetId: string, sheetName: string, retries = 2) {
  if (!sheetId) {
    throw new Error(`Missing Sheet ID for ${sheetName}`)
  }

  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${sheetName}`

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        // Add cache control to improve performance
        cache: attempt === 0 ? "no-cache" : "default",
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch data from Google Sheet: ${sheetName} (Status: ${response.status})`)
      }

      const csvText = await response.text()

      // Parse the CSV data
      const rows = csvText.split("\n").map((row) => {
        const cells = []
        let currentCell = ""
        let withinQuotes = false

        for (let i = 0; i < row.length; i++) {
          if (row[i] === '"') {
            withinQuotes = !withinQuotes
          } else if (row[i] === "," && !withinQuotes) {
            cells.push(currentCell.trim())
            currentCell = ""
          } else {
            currentCell += row[i]
          }
        }
        cells.push(currentCell.trim())
        return cells.map((cell) => cell.replace(/^"|"$/g, "").replace(/""/g, '"'))
      })

      return rows
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Only retry if not the last attempt
      if (attempt < retries) {
        // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt)))
        continue
      }

      throw lastError
    }
  }

  // This should never be reached due to the throw in the loop
  throw new Error("Unexpected error in fetchCSV")
}

// Update the fetchPosts function to better handle multiple requests
export async function fetchPosts(condition: string, forceRefresh = false): Promise<Post[]> {
  // Check cache first, but allow force refresh
  const cacheKey = `posts-${condition}`

  if (!forceRefresh && cache.posts.has(cacheKey)) {
    return cache.posts.get(cacheKey)!
  }

  if (!SHEET_ID) {
    throw new Error("Missing Google Sheet ID")
  }

  const POSTS_SHEET_NAME = sheetNames.posts
  console.log(`Fetching posts from sheet: ${POSTS_SHEET_NAME}`)

  try {
    const [headers, ...dataRows] = await fetchCSV(SHEET_ID, POSTS_SHEET_NAME)
    console.log(`Fetched ${dataRows.length} posts`)

    // Find the index of the cat1_disclosure column
    const disclosureIndex = headers.findIndex((header) => header === "cat1_disclosure")
    if (disclosureIndex === -1) {
      console.warn("cat1_disclosure column not found in the sheet")
    }

    // Create a map to group posts by ID
    const postsMap = new Map<string, Post & { disclosure?: string }>()

    dataRows.forEach((row) => {
      const post: Partial<Post> & { disclosure?: string } = {}
      headers.forEach((header, index) => {
        switch (header) {
          case "id":
          case "username":
          case "caption":
          case "location":
          case "timestamp":
            post[header] = row[index]
            break
          case "userAvatar":
            post[header] = getAvatarUrl(row[index])
            break
          case "contentUrl":
          case "thumbnailUrl":
            post[header] = getImageUrl(row[index])
            break
          case "likes":
            post[header] = Number.parseInt(row[index], 10) || 0
            break
          case "contentType":
            post[header] = row[index] as "image" | "video"
            break
          case "cat1_disclosure":
            post.disclosure = row[index]
            break
          case "order":
            post.order = Number.parseInt(row[index], 10) || 0
            break
        }
      })

      // If this post ID already exists in the map, add this contentUrl to its contentUrls array
      if (post.id && postsMap.has(post.id)) {
        const existingPost = postsMap.get(post.id)!

        // Initialize contentUrls array if it doesn't exist
        if (!existingPost.contentUrls) {
          existingPost.contentUrls = [existingPost.contentUrl]
        }

        // Add the new contentUrl to the array
        if (post.contentUrl) {
          existingPost.contentUrls.push(post.contentUrl)
        }
      } else {
        // This is a new post ID, add it to the map
        // Initialize with currentPhotoIndex = 0
        post.currentPhotoIndex = 0
        postsMap.set(post.id as string, post as Post & { disclosure?: string })
      }
    })

    // Convert the map values to an array
    const allPosts = Array.from(postsMap.values())

    // Add the disclosure value to each post
    const result = allPosts.map((post) => {
      const { disclosure, ...restPost } = post
      return {
        ...restPost,
        disclosure, // Keep the disclosure property for filtering in the feed component
      }
    }) as Post[]

    // Store in cache
    cache.posts.set(cacheKey, result)

    return result
  } catch (error) {
    console.error("Error fetching posts:", error)
    throw error
  }
}

export async function fetchComments(condition: string): Promise<Comment[]> {
  // Check cache first
  if (cache.comments.has(condition)) {
    return cache.comments.get(condition)!
  }

  if (!SHEET_ID) {
    throw new Error("Missing Google Sheet ID")
  }

  const COMMENTS_SHEET_NAME = sheetNames.comments
  console.log(`Fetching comments from sheet: ${COMMENTS_SHEET_NAME}`)

  try {
    const [headers, ...dataRows] = await fetchCSV(SHEET_ID, COMMENTS_SHEET_NAME)
    console.log(`Fetched ${dataRows.length} comments`)

    const result = dataRows.map((row) => {
      const comment: Partial<Comment> = {}
      headers.forEach((header, index) => {
        switch (header) {
          case "id":
          case "postId":
          case "username":
          case "text":
          case "timestamp":
            comment[header] = row[index]
            break
          case "order":
            comment.order = Number.parseInt(row[index], 10) || 0
            break
        }
      })
      return comment as Comment
    })

    // Store in cache
    cache.comments.set(condition, result)

    return result
  } catch (error) {
    console.error("Error fetching comments:", error)
    throw error
  }
}

export async function fetchAuthors(): Promise<Author[]> {
  // Check cache first
  if (cache.authors) {
    return cache.authors
  }

  if (!SHEET_ID) {
    throw new Error("Missing Google Sheet ID")
  }

  // Use the environment variable if available, otherwise use the default "Authors"
  const AUTHORS_SHEET_NAME = process.env.AUTHORS_SHEET_NAME || "Authors"
  console.log(`Fetching authors from sheet: ${AUTHORS_SHEET_NAME}`)

  try {
    const [headers, ...dataRows] = await fetchCSV(SHEET_ID, AUTHORS_SHEET_NAME)
    console.log(`Fetched ${dataRows.length} authors with headers:`, headers)

    const result = dataRows.map((row, index) => {
      const author: Partial<Author> = {
        username: "",
        followers: 0,
        following: 0,
        posts: 0,
        bio: "Travel enthusiast sharing adventures from around the world ✈️",
      }

      headers.forEach((header, index) => {
        if (index < row.length) {
          const headerLower = header.toLowerCase().trim()
          const value = row[index].trim()

          if (headerLower === "username") {
            author.username = value
          } else if (["name", "fullname", "full_name", "full name"].includes(headerLower)) {
            author.fullName = value
          } else if (["bio", "biography", "description"].includes(headerLower)) {
            author.bio = value || author.bio // Use default if empty
          } else if (["followers", "follower", "follower_count", "followercount"].includes(headerLower)) {
            author.followers = Number.parseInt(value, 10) || 0
          } else if (["following", "following_count", "followingcount"].includes(headerLower)) {
            author.following = Number.parseInt(value, 10) || 0
          } else if (["posts", "post_count", "postcount"].includes(headerLower)) {
            author.posts = Number.parseInt(value, 10) || 0
          } else if (["avatar", "useravatar", "profile_picture", "profilepicture", "image"].includes(headerLower)) {
            author.avatar = value // Store the raw avatar value
          }
        }
      })

      return author as Author
    })

    // Store in cache
    cache.authors = result

    return result
  } catch (error) {
    console.error("Error fetching authors:", error)
    return [] // Return empty array instead of throwing to prevent app from crashing
  }
}

// Update the fetchAds function to handle userAvatar
export async function fetchAds(): Promise<any[]> {
  // Check cache first
  if (cache.ads) {
    return cache.ads
  }

  if (!SHEET_ID) {
    throw new Error("Missing Google Sheet ID")
  }

  const ADS_SHEET_NAME = "ads"
  console.log(`Fetching ads from sheet: ${ADS_SHEET_NAME}`)

  try {
    const [headers, ...dataRows] = await fetchCSV(SHEET_ID, ADS_SHEET_NAME)
    console.log(`Fetched ${dataRows.length} ads`)

    const result = dataRows.map((row) => {
      const ad: any = {}
      headers.forEach((header, index) => {
        switch (header) {
          case "id":
          case "username":
          case "caption":
          case "link":
          case "timestamp":
          case "type":
            ad[header] = row[index]
            break
          case "contentUrl":
            ad[header] = getImageUrl(row[index])
            break
          case "userAvatar":
            ad[header] = getAvatarUrl(row[index])
            break
        }
      })
      return ad
    })

    // Store in cache
    cache.ads = result

    return result
  } catch (error) {
    console.error("Error fetching ads:", error)
    return [] // Return empty array instead of throwing to prevent app from crashing
  }
}

// Add a function to clear the cache if needed
export function clearCache() {
  cache.posts.clear()
  cache.comments.clear()
  cache.authors = null
}
