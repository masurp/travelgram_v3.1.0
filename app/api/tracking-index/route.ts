import { NextResponse } from "next/server"
import { getTrackingIndex, updateTrackingIndex } from "@/lib/tracking-index"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const forceUpdate = searchParams.get("forceUpdate") === "true"

    let index
    if (forceUpdate) {
      // Force a refresh of the index
      index = await updateTrackingIndex()
    } else {
      // Get the current index
      index = await getTrackingIndex()
    }

    if (!index) {
      return NextResponse.json({ error: "Failed to retrieve tracking index" }, { status: 500 })
    }

    return NextResponse.json(index)
  } catch (error) {
    console.error("Error retrieving tracking index:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
