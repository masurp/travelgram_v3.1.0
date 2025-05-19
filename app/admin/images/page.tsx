"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

interface ImageFile {
  url: string
  pathname: string
  size: number
  uploadedAt: string
}

export default function ImagesDashboard() {
  const [images, setImages] = useState<ImageFile[]>([])
  const [loading, setLoading] = useState(true)
  const [type, setType] = useState<"profile" | "post">("post")
  const [username, setUsername] = useState("")
  const [deleting, setDeleting] = useState<string | null>(null)
  const [migrating, setMigrating] = useState(false)
  const [migrationResults, setMigrationResults] = useState<any>(null)
  const [downloading, setDownloading] = useState(false)
  const [downloadJob, setDownloadJob] = useState<any>(null)

  useEffect(() => {
    fetchImages()
  }, [type, username])

  async function fetchImages() {
    setLoading(true)
    try {
      let url = `/api/images?type=${type}`
      if (username) {
        url += `&username=${encodeURIComponent(username)}`
      }

      const response = await fetch(url)
      const data = await response.json()
      setImages(data.images || [])
    } catch (error) {
      console.error("Failed to fetch images:", error)
    } finally {
      setLoading(false)
    }
  }

  async function deleteImage(pathname: string) {
    if (!confirm("Are you sure you want to delete this image? This action cannot be undone.")) {
      return
    }

    setDeleting(pathname)
    try {
      const response = await fetch("/api/images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pathname }),
      })

      if (response.ok) {
        // Remove the deleted image from the list
        setImages(images.filter((img) => img.pathname !== pathname))
      } else {
        alert("Failed to delete image")
      }
    } catch (error) {
      console.error("Error deleting image:", error)
      alert("Error deleting image")
    } finally {
      setDeleting(null)
    }
  }

  async function migrateBase64Images() {
    if (!confirm("This will scan for base64 images and migrate them to Blob storage. Continue?")) {
      return
    }

    setMigrating(true)
    setMigrationResults(null)

    try {
      // In a real implementation, you would fetch user data from your database
      // For this example, we'll use mock data
      const mockUserData = [
        {
          username: "user1",
          profilePhoto: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...", // Mock base64
          posts: [
            { contentUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD..." }, // Mock base64
          ],
        },
      ]

      const response = await fetch("/api/migrate-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "all",
          userData: mockUserData,
        }),
      })

      const results = await response.json()
      setMigrationResults(results)

      // Refresh the image list
      fetchImages()
    } catch (error) {
      console.error("Error migrating images:", error)
      alert("Error migrating images")
    } finally {
      setMigrating(false)
    }
  }

  async function downloadAllImages(downloadType: "profile" | "post" | "all" = "all") {
    setDownloading(true)
    setDownloadJob(null)

    try {
      // For small downloads, direct download
      window.open(`/api/download-images?type=${downloadType}&format=zip`, "_blank")

      // For larger downloads, we would use a background job
      // const response = await fetch(`/api/download-images?type=${downloadType}&format=zip`)
      // const data = await response.json()

      // if (data.jobId) {
      //   setDownloadJob(data)
      //   // Poll for job status
      // } else {
      //   // Direct download handled by the browser
      // }
    } catch (error) {
      console.error("Error downloading images:", error)
      alert("Error downloading images")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Image Management</h1>

      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Image Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "profile" | "post")}
              className="border rounded px-3 py-2"
            >
              <option value="profile">Profile Images</option>
              <option value="post">Post Images</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Username (optional)</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Filter by username"
              className="border rounded px-3 py-2"
            />
          </div>

          <div className="self-end">
            <Button onClick={fetchImages}>Refresh</Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => downloadAllImages("profile")} disabled={downloading}>
            Download All Profile Images
          </Button>
          <Button onClick={() => downloadAllImages("post")} disabled={downloading}>
            Download All Post Images
          </Button>
          <Button onClick={() => downloadAllImages("all")} disabled={downloading}>
            Download All Images
          </Button>
          <Button onClick={migrateBase64Images} disabled={migrating} variant="outline">
            {migrating ? "Migration in progress..." : "Migrate Base64 Images to Blob"}
          </Button>
        </div>

        {migrationResults && (
          <div className="p-4 border rounded bg-gray-50">
            <h3 className="font-bold">Migration Results</h3>
            <p>Total users processed: {migrationResults.results.total}</p>
            <p>Profile images migrated: {migrationResults.results.profileImagesMigrated}</p>
            <p>Post images migrated: {migrationResults.results.postImagesMigrated}</p>
            <p>Errors: {migrationResults.results.errors}</p>
          </div>
        )}

        {downloadJob && (
          <div className="p-4 border rounded bg-gray-50">
            <h3 className="font-bold">Download Job</h3>
            <p>Job ID: {downloadJob.jobId}</p>
            <p>Total files: {downloadJob.totalFiles}</p>
            <p>Status: {downloadJob.status || "pending"}</p>
            {downloadJob.downloadUrl && (
              <Button onClick={() => window.open(downloadJob.downloadUrl, "_blank")}>Download Now</Button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <p>Loading images...</p>
      ) : images.length === 0 ? (
        <p>No images found</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image) => (
            <div key={image.pathname} className="border rounded overflow-hidden">
              <div className="aspect-square relative">
                <Image src={image.url || "/placeholder.svg"} alt="Uploaded image" fill className="object-cover" />
              </div>
              <div className="p-2">
                <p className="text-xs truncate">{image.pathname.split("/").pop()}</p>
                <p className="text-xs text-gray-500">{new Date(image.uploadedAt).toLocaleString()}</p>
                <p className="text-xs text-gray-500">{Math.round(image.size / 1024)} KB</p>
                <Button
                  variant="destructive"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => deleteImage(image.pathname)}
                  disabled={deleting === image.pathname}
                >
                  {deleting === image.pathname ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
