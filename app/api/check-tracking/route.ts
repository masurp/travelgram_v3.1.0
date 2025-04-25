import { NextResponse } from "next/server"
import { checkTrackingUrl } from "@/lib/check-tracking-url"

export async function GET() {
  try {
    const result = await checkTrackingUrl()

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      {
        valid: false,
        message: `Error checking tracking URL: ${error.message}`,
      },
      { status: 500 },
    )
  }
}
