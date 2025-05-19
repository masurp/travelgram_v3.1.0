import { NextResponse } from "next/server"
import { list, del } from "@vercel/blob"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") // 'profile' or 'post'
    const username = searchParams.get("username")

    let prefix = ""
    if (type === "profile") {
      prefix = "profile-images/"
    } else if (type === "post") {
      prefix = "post-images/"
    }

    if (username) {
      prefix += `${username}-`
    }

    const blobs = await list({ prefix })

    return NextResponse.json({
      images: blobs.blobs.map((blob) => ({
        url: blob.url,
        pathname: blob.pathname,
        size: blob.size,
        uploadedAt: blob.uploadedAt,
      })),
    })
  } catch (error) {
    console.error("Error listing images:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { pathname } = await request.json()

    if (!pathname) {
      return NextResponse.json({ error: "Pathname is required" }, { status: 400 })
    }

    await del(pathname)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting image:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
