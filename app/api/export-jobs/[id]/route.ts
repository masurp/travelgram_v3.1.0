import { NextResponse } from "next/server"
import { get } from "@vercel/blob"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const jobId = params.id

    // Try to get the job metadata from blob storage
    try {
      const blob = await get(`exports/metadata/${jobId}.json`)

      if (!blob) {
        return NextResponse.json({ error: "Export job not found" }, { status: 404 })
      }

      const response = await fetch(blob.url)
      const job = await response.json()

      return NextResponse.json({ job })
    } catch (error) {
      console.error(`Error fetching job ${jobId}:`, error)
      return NextResponse.json({ error: "Export job not found" }, { status: 404 })
    }
  } catch (error) {
    console.error("Error getting export job:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
