import { NextResponse } from "next/server"
import { put } from "@vercel/blob"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const username = formData.get("username") as string

    if (!file || !username) {
      return NextResponse.json({ error: "File and username are required" }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 })
    }

    // Generate a unique filename
    const timestamp = Date.now()
    const extension = file.name.split(".").pop()
    const filename = `post-images/${username}-${timestamp}.${extension}`

    // Upload to Vercel Blob
    const blob = await put(filename, file, {
      access: "public",
      contentType: file.type,
    })

    return NextResponse.json({
      success: true,
      url: blob.url,
      size: blob.size,
    })
  } catch (error) {
    console.error("Error uploading post image:", error)
    return NextResponse.json({ error: "Failed to upload image", details: String(error) }, { status: 500 })
  }
}
