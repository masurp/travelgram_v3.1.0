import { NextResponse } from "next/server"
import { put } from "@vercel/blob"

// Helper function to check if a string is a base64 image
function isBase64Image(str: string): boolean {
  return str && typeof str === "string" && str.startsWith("data:image/")
}

// Helper function to convert base64 to buffer
function base64ToBuffer(base64: string): { buffer: Buffer; mimeType: string } {
  // Extract the MIME type and base64 data
  const matches = base64.match(/^data:([A-Za-z-+/]+);base64,(.+)$/)

  if (!matches || matches.length !== 3) {
    throw new Error("Invalid base64 string")
  }

  const mimeType = matches[1]
  const base64Data = matches[2]
  const buffer = Buffer.from(base64Data, "base64")

  return { buffer, mimeType }
}

export async function POST(request: Request) {
  try {
    const { type = "all", userData } = await request.json()

    if (!userData || !Array.isArray(userData)) {
      return NextResponse.json({ error: "User data is required" }, { status: 400 })
    }

    const results = {
      total: userData.length,
      profileImagesMigrated: 0,
      postImagesMigrated: 0,
      errors: 0,
      migratedUsers: [] as string[],
    }

    // Process each user
    for (const user of userData) {
      try {
        // Migrate profile image if it's base64
        if ((type === "profile" || type === "all") && user.profilePhoto && isBase64Image(user.profilePhoto)) {
          try {
            const { buffer, mimeType } = base64ToBuffer(user.profilePhoto)

            // Generate filename
            const timestamp = Date.now()
            const extension = mimeType.split("/")[1]
            const filename = `profile-images/${user.username}-${timestamp}.${extension}`

            // Upload to Vercel Blob
            const blob = await put(filename, buffer, {
              access: "public",
              contentType: mimeType,
            })

            // Update user data with new URL
            user.profilePhoto = blob.url
            results.profileImagesMigrated++

            if (!results.migratedUsers.includes(user.username)) {
              results.migratedUsers.push(user.username)
            }
          } catch (error) {
            console.error(`Failed to migrate profile image for ${user.username}:`, error)
            results.errors++
          }
        }

        // Migrate post images if they're base64
        if ((type === "post" || type === "all") && user.posts && Array.isArray(user.posts)) {
          for (const post of user.posts) {
            if (post.contentUrl && isBase64Image(post.contentUrl)) {
              try {
                const { buffer, mimeType } = base64ToBuffer(post.contentUrl)

                // Generate filename
                const timestamp = Date.now()
                const extension = mimeType.split("/")[1]
                const filename = `post-images/${user.username}-${timestamp}.${extension}`

                // Upload to Vercel Blob
                const blob = await put(filename, buffer, {
                  access: "public",
                  contentType: mimeType,
                })

                // Update post data with new URL
                post.contentUrl = blob.url
                results.postImagesMigrated++
              } catch (error) {
                console.error(`Failed to migrate post image for ${user.username}:`, error)
                results.errors++
              }
            }

            // Handle multiple images in contentUrls array
            if (post.contentUrls && Array.isArray(post.contentUrls)) {
              for (let i = 0; i < post.contentUrls.length; i++) {
                if (isBase64Image(post.contentUrls[i])) {
                  try {
                    const { buffer, mimeType } = base64ToBuffer(post.contentUrls[i])

                    // Generate filename
                    const timestamp = Date.now()
                    const extension = mimeType.split("/")[1]
                    const filename = `post-images/${user.username}-${timestamp}-${i}.${extension}`

                    // Upload to Vercel Blob
                    const blob = await put(filename, buffer, {
                      access: "public",
                      contentType: mimeType,
                    })

                    // Update post data with new URL
                    post.contentUrls[i] = blob.url
                    results.postImagesMigrated++
                  } catch (error) {
                    console.error(`Failed to migrate post image for ${user.username}:`, error)
                    results.errors++
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error processing user ${user.username}:`, error)
        results.errors++
      }
    }

    return NextResponse.json({
      success: true,
      results,
      userData, // Return the updated user data
    })
  } catch (error) {
    console.error("Error during image migration:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
