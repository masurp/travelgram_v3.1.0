import { shuffleArray } from "./arrayUtils"
import type { Post } from "./types"

// Function to generate a random number within a range
export function getRandomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Parse condition string into main condition and subcondition
export function parseCondition(conditionStr: string): { mainCondition: string; subCondition: string } {
  // Default to subcondition 'a' if not specified
  let mainCondition = conditionStr
  let subCondition = "a"

  // Check if the condition includes a subcondition (a or b)
  if (conditionStr.endsWith("a") || conditionStr.endsWith("b")) {
    mainCondition = conditionStr.slice(0, -1)
    subCondition = conditionStr.slice(-1)
  }

  // Map numeric conditions to internal format
  if (mainCondition === "1") {
    mainCondition = "condition1"
  } else if (mainCondition === "2") {
    mainCondition = "condition2"
  } else if (mainCondition === "3") {
    mainCondition = "condition3"
  } else if (mainCondition === "4") {
    mainCondition = "condition4"
  } else if (mainCondition === "5") {
    mainCondition = "condition5"
  }

  return { mainCondition, subCondition }
}

// UPDATED: Apply likes to posts based on subcondition - ALWAYS override existing likes
export function applyLikesToPosts(posts: Post[], conditionStr: string): Post[] {
  const { subCondition } = parseCondition(conditionStr)

  return posts.map((post) => {
    // Create a new post object to avoid mutating the original
    const newPost = { ...post }

    // ALWAYS assign likes based on condition, regardless of existing likes
    if (subCondition === "a") {
      // Subcondition a: High disclosure gets many likes, low disclosure gets few
      if (newPost.disclosure === "high") {
        newPost.likes = getRandomInRange(120, 170)
      } else {
        newPost.likes = getRandomInRange(5, 55)
      }
    } else {
      // Subcondition b: Low disclosure gets many likes, high disclosure gets few
      if (newPost.disclosure === "high") {
        newPost.likes = getRandomInRange(5, 55)
      } else {
        newPost.likes = getRandomInRange(120, 170)
      }
    }

    return newPost
  })
}

// UPDATED: Filter comments based on subcondition with random 1-2 comments
export function filterCommentsBySubcondition(posts: Post[], conditionStr: string): Post[] {
  const { subCondition } = parseCondition(conditionStr)

  return posts.map((post) => {
    // Create a new post object to avoid mutating the original
    const newPost = { ...post }

    // If post has no comments, return as is
    if (!newPost.comments || newPost.comments.length === 0) {
      return newPost
    }

    // Filter comments based on subcondition and disclosure level
    if (subCondition === "a") {
      // Subcondition a: High disclosure gets all comments, low disclosure gets limited comments
      if (newPost.disclosure === "high") {
        // Keep all comments for high disclosure posts
      } else {
        // Randomly keep either 1 or 2 comments for low disclosure posts
        const commentCount = getRandomInRange(1, 2)
        newPost.comments = newPost.comments.slice(0, commentCount)
      }
    } else {
      // Subcondition b: Low disclosure gets all comments, high disclosure gets limited comments
      if (newPost.disclosure === "high") {
        // Randomly keep either 1 or 2 comments for high disclosure posts
        const commentCount = getRandomInRange(1, 2)
        newPost.comments = newPost.comments.slice(0, commentCount)
      } else {
        // Keep all comments for low disclosure posts
      }
    }

    return newPost
  })
}

// Filter posts based on condition WITHOUT modifying like counts
// Updated to accept an optional totalPosts parameter with default value of 50
export function filterPostsByRatio(allPosts: Post[], conditionStr: string, totalPosts = 50): Post[] {
  // Parse the condition string
  const { mainCondition } = parseCondition(conditionStr)

  // Separate posts by disclosure category
  const highDisclosurePosts = allPosts.filter((post) => post.disclosure === "high")
  const lowDisclosurePosts = allPosts.filter((post) => post.disclosure === "low")

  // Define the ratios based on main condition
  let highRatio = 0.5
  let lowRatio = 0.5

  switch (mainCondition) {
    case "condition1":
      highRatio = 0.05
      lowRatio = 0.95
      break
    case "condition2":
      highRatio = 0.15
      lowRatio = 0.85
      break
    case "condition3":
      highRatio = 0.25
      lowRatio = 0.75
      break
    case "condition4":
      highRatio = 0.5
      lowRatio = 0.5
      break
    case "condition5":
      highRatio = 0.9
      lowRatio = 0.1
      break
  }

  // Calculate how many posts of each type we need based on the totalPosts parameter
  const highCount = Math.round(totalPosts * highRatio)
  const lowCount = totalPosts - highCount

  // Check if we have enough posts of each type
  const actualHighCount = Math.min(highCount, highDisclosurePosts.length)
  const actualLowCount = Math.min(lowCount, lowDisclosurePosts.length)

  // Shuffle and select the required number of posts from each category
  // Use slice to create new arrays without modifying the original posts
  const selectedHighPosts = shuffleArray([...highDisclosurePosts]).slice(0, actualHighCount)
  const selectedLowPosts = shuffleArray([...lowDisclosurePosts]).slice(0, actualLowCount)

  // Combine and shuffle the selected posts
  const combinedPosts = [...selectedHighPosts, ...selectedLowPosts]
  return shuffleArray(combinedPosts)
}

// UPDATED: Process posts with both likes and comments based on condition
export function filterPostsByCondition(allPosts: Post[], conditionStr: string, totalPosts = 50): Post[] {
  // First apply likes based on condition
  const postsWithLikes = applyLikesToPosts(allPosts, conditionStr)

  // Then filter comments based on condition
  const postsWithLikesAndComments = filterCommentsBySubcondition(postsWithLikes, conditionStr)

  // Finally filter by ratio
  return filterPostsByRatio(postsWithLikesAndComments, conditionStr, totalPosts)
}

// Search posts based on keyword
export function searchPosts(posts: Post[], searchTerm: string): Post[] {
  if (!searchTerm) return posts

  const term = searchTerm.toLowerCase()
  return posts.filter(
    (post) =>
      // Search in caption
      (post.caption && post.caption.toLowerCase().includes(term)) ||
      // Search in username
      post.username
        .toLowerCase()
        .includes(term) ||
      // Search in location (if it exists)
      (post.location && post.location.toLowerCase().includes(term)),
  )
}
