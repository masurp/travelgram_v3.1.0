import { NextResponse } from "next/server"
import { list, del } from "@vercel/blob"
import { updateTrackingIndex } from "@/lib/tracking-index"

export async function POST(request: Request) {
  try {
    // Basic security check - require a secret key
    const { searchParams } = new URL(request.url)
    const key = searchParams.get("key")

    // Check if the provided key matches the environment variable
    if (key !== process.env.CLEANUP_SECRET_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // List all tracking files
    const blobs = await list({ prefix: "tracking-events/" })

    // Filter out the index file itself - we'll update it after
    const trackingFiles = blobs.blobs.filter((blob) => !blob.pathname.endsWith("/index.json"))

    if (trackingFiles.length === 0) {
      return NextResponse.json({ message: "No tracking files found to delete" })
    }

    // Delete each file
    const deletionPromises = trackingFiles.map(async (blob) => {
      try {
        await del(blob.url)
        return { path: blob.pathname, success: true }
      } catch (error) {
        console.error(`Failed to delete ${blob.pathname}:`, error)
        return { path: blob.pathname, success: false, error: String(error) }
      }
    })

    // Wait for all deletions to complete
    const results = await Promise.all(deletionPromises)

    // Count successes and failures
    const successes = results.filter((r) => r.success).length
    const failures = results.filter((r) => !r.success).length

    // Update the index after deletion
    await updateTrackingIndex()

    return NextResponse.json({
      message: `Deleted ${successes} tracking files${failures > 0 ? `, ${failures} failed` : ""}`,
      totalProcessed: results.length,
      results,
    })
  } catch (error) {
    console.error("Error deleting tracking data:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
