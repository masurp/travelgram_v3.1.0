import { NextResponse } from "next/server"
import { list, del } from "@vercel/blob"

export async function POST(request: Request) {
  try {
    // Only allow this to be called from authorized sources
    const { authorization } = request.headers
    if (authorization !== `Bearer ${process.env.CLEANUP_SECRET_KEY}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { days } = await request.json()
    const retentionDays = days || 30 // Default to 30 days

    // Calculate the cutoff date
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    // List all tracking files
    const blobs = await list({ prefix: "tracking-events/" })

    let deletedCount = 0
    let errorCount = 0

    // Delete files older than the cutoff date
    for (const blob of blobs.blobs) {
      if (new Date(blob.uploadedAt) < cutoffDate) {
        try {
          await del(blob.pathname)
          deletedCount++
        } catch (error) {
          console.error(`Failed to delete ${blob.pathname}:`, error)
          errorCount++
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cleanup complete. Deleted ${deletedCount} files, ${errorCount} errors.`,
    })
  } catch (error) {
    console.error("Error during cleanup:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
