import { NextResponse } from "next/server"
import { list, put } from "@vercel/blob"
import JSZip from "jszip"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || "all" // 'profile', 'post', or 'all'
    const format = searchParams.get("format") || "zip" // 'zip' or 'json'

    // List all images of the specified type
    const blobs = []

    if (type === "all" || type === "profile") {
      const profileBlobs = await list({ prefix: "profile-images/" })
      blobs.push(...profileBlobs.blobs)
    }

    if (type === "all" || type === "post") {
      const postBlobs = await list({ prefix: "post-images/" })
      blobs.push(...postBlobs.blobs)
    }

    // Sort by uploadedAt
    blobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())

    // If there are too many images, create a background job
    if (blobs.length > 100 && format === "zip") {
      // Create a job ID
      const jobId = `download-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`

      // Store job metadata
      await put(
        `download-jobs/${jobId}.json`,
        JSON.stringify({
          id: jobId,
          type,
          status: "pending",
          totalFiles: blobs.length,
          createdAt: new Date().toISOString(),
        }),
        {
          access: "public",
          contentType: "application/json",
        },
      )

      // Start the background job (in a real implementation, this would be a separate process)
      // For now, we'll just return a job ID and let the client poll for status
      return NextResponse.json({
        success: true,
        message: "Download job created",
        jobId,
        totalFiles: blobs.length,
      })
    }

    // For JSON format or small number of files, process immediately
    if (format === "json") {
      // Return JSON with image URLs
      return NextResponse.json({
        success: true,
        images: blobs.map((blob) => ({
          url: blob.url,
          pathname: blob.pathname,
          size: blob.size,
          uploadedAt: blob.uploadedAt,
        })),
      })
    } else {
      // Create a zip file
      const zip = new JSZip()

      // Add each image to the zip (up to 100 for immediate download)
      const maxFiles = Math.min(blobs.length, 100)

      for (let i = 0; i < maxFiles; i++) {
        const blob = blobs[i]
        try {
          const response = await fetch(blob.url)
          if (!response.ok) throw new Error(`Failed to fetch ${blob.url}`)

          const buffer = await response.arrayBuffer()
          const filename = blob.pathname.split("/").pop() || `image-${i}.jpg`

          zip.file(filename, buffer)
        } catch (error) {
          console.error(`Error adding ${blob.pathname} to zip:`, error)
        }
      }

      // Generate the zip file
      const zipBuffer = await zip.generateAsync({ type: "arraybuffer" })

      // Return as downloadable file
      return new Response(zipBuffer, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="images-${type}-${new Date().toISOString().split("T")[0]}.zip"`,
        },
      })
    }
  } catch (error) {
    console.error("Error downloading images:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
