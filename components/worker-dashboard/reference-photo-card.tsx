"use client"

import React, { useState, useEffect } from "react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Check, Download } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

interface Photo {
  id: string
  photoKey: string
  url: string
  createdAt: string
}

interface ReferencePhotoCardProps {
  recipientId: number
  fallbackPhotoUrl?: string // For backward compatibility
}

export default function ReferencePhotoCard({
  recipientId,
  fallbackPhotoUrl
}: ReferencePhotoCardProps) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function loadPhotos() {
      console.log(`Loading photos for recipient ID: ${recipientId}`)

      try {
        console.log(`Posting to /api/recipient-photos with ID: ${recipientId}`)
        const response = await fetch(`/api/recipient-photos`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ recipientId })
        })

        const result = await response.json()
        console.log(
          "API response FOR DEBUGGING:",
          JSON.stringify(result, null, 2)
        )

        let photosList: Photo[] = []

        // Add photos from the database if any were found
        if (result.isSuccess && result.data && result.data.length > 0) {
          console.log(
            `Got ${result.data.length} photos from API:`,
            result.data.map((p: any) => ({ id: p.id, url: p.url }))
          )

          // Properly map API response to match the Photo interface
          photosList = result.data.map(
            (item: {
              id?: string
              photoKey?: string
              photo_key?: string
              url?: string
              createdAt?: string
              created_at?: string
            }) => ({
              id: item.id || `photo-${Date.now()}-${Math.random()}`,
              photoKey: item.photoKey || item.photo_key || "",
              url: item.url || item.photo_key || "",
              createdAt:
                item.createdAt || item.created_at || new Date().toISOString()
            })
          )

          console.log("Mapped photos list:", photosList)
        }

        // Always add the fallback photo if it exists and isn't already in the list
        if (fallbackPhotoUrl) {
          console.log("Adding fallback photo URL:", fallbackPhotoUrl)
          // Check if this URL isn't already in our list to avoid duplicates
          const fallbackExists = photosList.some(
            photo => photo.url === fallbackPhotoUrl
          )
          console.log("Fallback exists in list?", fallbackExists)

          if (!fallbackExists) {
            photosList.push({
              id: "fallback",
              photoKey: "fallback",
              url: fallbackPhotoUrl,
              createdAt: new Date().toISOString()
            })
          }
        }

        console.log(
          `Final photos list (${photosList.length}):`,
          photosList.map(p => ({
            id: p.id,
            url: p.url.substring(0, 30) + "..."
          }))
        )

        if (photosList.length > 0) {
          setPhotos(photosList)
          // Auto-select all photos when they're loaded
          setSelectedPhotos(new Set(photosList.map(photo => photo.id)))
        } else {
          setError("No reference photos available")
        }
      } catch (err) {
        console.error("Fetch error:", err)
        // If fetch fails but we have a fallback URL, use that
        if (fallbackPhotoUrl) {
          const fallbackPhoto = {
            id: "fallback",
            photoKey: "fallback",
            url: fallbackPhotoUrl,
            createdAt: new Date().toISOString()
          }
          setPhotos([fallbackPhoto])
          // Auto-select the fallback photo
          setSelectedPhotos(new Set([fallbackPhoto.id]))
        } else {
          setError("Failed to load reference photos")
        }
      } finally {
        setLoading(false)
      }
    }

    loadPhotos()
  }, [recipientId, fallbackPhotoUrl])

  // Improved drag and drop functionality
  const handleDragStart = (e: React.DragEvent, photo: Photo) => {
    // Always use all photos for dragging
    const selectedPhotosList = photos

    // This is important: set the effectAllowed property
    e.dataTransfer.effectAllowed = "copy"

    // Set a drag image to show something is being dragged
    // Create a temporary element to use as the drag image
    const temp = document.createElement("div")
    temp.className = "drag-ghost"
    temp.innerHTML = `<div style="padding: 10px; background: rgba(0,0,0,0.7); color: white; border-radius: 4px;">
                       <span>${selectedPhotosList.length} image${selectedPhotosList.length !== 1 ? "s" : ""}</span>
                      </div>`
    document.body.appendChild(temp)
    e.dataTransfer.setDragImage(temp, 0, 0)
    setTimeout(() => document.body.removeChild(temp), 0)

    // Set standard text data
    e.dataTransfer.setData(
      "text/plain",
      selectedPhotosList.map(p => p.url).join("\n")
    )

    // Set HTML data - some applications accept this
    const html = selectedPhotosList
      .map(p => `<img src="${p.url}" alt="Dragged image" />`)
      .join("")
    e.dataTransfer.setData("text/html", html)

    // Set URL data - for browsers that support it
    selectedPhotosList.forEach((p, i) => {
      // Some applications recognize this format
      if (i === 0) {
        e.dataTransfer.setData(
          "text/uri-list",
          selectedPhotosList.map(p => p.url).join("\n")
        )
      }
    })
  }

  // Add this function to download selected images
  const downloadSelectedImages = async () => {
    const selectedPhotosList = photos.filter(p => selectedPhotos.has(p.id))

    if (selectedPhotosList.length === 0) {
      return
    }

    // For a single image, download directly
    if (selectedPhotosList.length === 1) {
      const link = document.createElement("a")
      link.href = selectedPhotosList[0].url
      link.download = selectedPhotosList[0].url.split("/").pop() || "image.jpg"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      return
    }

    // For multiple images, create a zip (this would require a library like JSZip)
    // For now we'll do them one by one
    selectedPhotosList.forEach((photo, index) => {
      setTimeout(() => {
        const link = document.createElement("a")
        link.href = photo.url
        link.download = photo.url.split("/").pop() || `image-${index}.jpg`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }, index * 500) // Delay each download by 500ms to prevent browser blocking
    })
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="size-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error && photos.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <Alert className="flex h-64 items-center justify-center">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // Always show grid view regardless of number of photos
  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <h2 className="mb-4 text-xl font-semibold">
          Character Reference Images
        </h2>

        <div className="mb-4 flex gap-2">
          <span className="text-muted-foreground ml-auto text-sm">
            {photos.length} photo{photos.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map(photo => {
            return (
              <div
                key={photo.id}
                className="relative cursor-grab overflow-hidden rounded-md border-2 border-blue-500"
                draggable={true}
                onDragStart={e => handleDragStart(e, photo)}
              >
                <div className="relative aspect-square">
                  <Image
                    src={photo.url}
                    alt="Reference photo"
                    fill
                    className="object-cover"
                  />

                  <div className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-blue-500">
                    <Check className="size-3 text-white" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="text-muted-foreground mt-4 text-sm">
          <p>Drag images to use them in the image generation prompt.</p>
        </div>
      </CardContent>
    </Card>
  )
}
