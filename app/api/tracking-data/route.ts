import { NextResponse } from "next/server"
import { list, get } from "@vercel/blob"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const filename = searchParams.get("file")

    if (filename) {
      // Get a specific file
      try {
        const blob = await get(filename)
        if (!blob) {
          return NextResponse.json({ error: "File not found" }, { status: 404 })
        }

        // Fetch the content
        const response = await fetch(blob.url)
        const events = await response.json()

        return NextResponse.json({ events })
      } catch (error) {
        console.error(`Error fetching file ${filename}:`, error)
        return NextResponse.json({ error: String(error) }, { status: 500 })
      }
    } else {
      // List all tracking files - add debugging
      console.log("Listing tracking files...")

      // Try listing without a prefix first to see all files
      const allBlobs = await list()
      console.log(
        "All blobs:",
        allBlobs.blobs.map((b) => b.pathname),
      )

      // Now list with the prefix we expect
      const blobs = await list({ prefix: "tracking-events/" })
      console.log(
        "Tracking blobs:",
        blobs.blobs.map((b) => b.pathname),
      )

      // Sort by uploadedAt in descending order (newest first)
      blobs.blobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())

      return NextResponse.json({
        files: blobs.blobs.map((blob) => ({
          filename: blob.pathname,
          url: blob.url,
          size: blob.size,
          uploadedAt: blob.uploadedAt,
        })),
        totalFiles: blobs.blobs.length,
      })
    }
  } catch (error) {
    console.error("Error retrieving tracking data:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
