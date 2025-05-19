import { put, get, list } from "@vercel/blob"

// Define the structure of our index
export interface TrackingIndex {
  lastUpdated: string
  files: {
    pathname: string
    url: string
    uploadedAt: string
    size: number
  }[]
}

// The path where we'll store our index
const INDEX_PATH = "tracking-events/index.json"

// Function to update the tracking index
export async function updateTrackingIndex(): Promise<TrackingIndex> {
  try {
    // List all tracking files
    const blobs = await list({ prefix: "tracking-events/" })

    // Filter out the index file itself
    const trackingFiles = blobs.blobs.filter((blob) => !blob.pathname.endsWith("/index.json"))

    // Sort by uploadedAt in descending order (newest first)
    trackingFiles.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())

    // Create the index object
    const index: TrackingIndex = {
      lastUpdated: new Date().toISOString(),
      files: trackingFiles.map((blob) => ({
        pathname: blob.pathname,
        url: blob.url,
        uploadedAt: blob.uploadedAt,
        size: blob.size,
      })),
    }

    // Save the index to blob storage
    await put(INDEX_PATH, JSON.stringify(index, null, 2), {
      contentType: "application/json",
    })

    console.log(`Updated tracking index with ${trackingFiles.length} files`)
    return index
  } catch (error) {
    console.error("Error updating tracking index:", error)
    throw error
  }
}

// Function to get the current tracking index
export async function getTrackingIndex(): Promise<TrackingIndex | null> {
  try {
    // Try to get the existing index
    const blob = await get(INDEX_PATH)

    if (!blob) {
      console.log("No tracking index found, creating a new one")
      return await updateTrackingIndex()
    }

    // Fetch and parse the index
    const response = await fetch(blob.url)
    const index = await response.json()

    return index as TrackingIndex
  } catch (error) {
    console.error("Error getting tracking index:", error)

    // If there's an error (like the index doesn't exist yet), create a new one
    if (error instanceof Error && error.message.includes("not found")) {
      return await updateTrackingIndex()
    }

    return null
  }
}
