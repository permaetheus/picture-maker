"use client"

import React, { useState, useEffect } from "react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Check } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Photo {
  id: string
  photoKey: string
  url: string
  createdAt: string
}

interface ReferencePhotoCardProps {
  recipientId: number
  fallbackPhotoUrl?: string
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
      console.log("Initial props:", { recipientId, fallbackPhotoUrl })

      let currentPhotos: Photo[] = []

      // If we have a fallback URL, add it first
      if (fallbackPhotoUrl) {
        const fallbackPhoto = {
          id: "fallback",
          photoKey: "fallback",
          url: fallbackPhotoUrl,
          createdAt: new Date().toISOString()
        }
        currentPhotos.push(fallbackPhoto)
      }

      // Only try to fetch additional photos if we have a valid recipientId
      if (recipientId > 0) {
        try {
          const response = await fetch(`/api/recipient-photos`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ recipientId })
          })

          const result = await response.json()
          console.log("API response for photos:", result)

          if (
            result.isSuccess &&
            Array.isArray(result.data) &&
            result.data.length > 0
          ) {
            const apiPhotos = result.data.map((item: any) => ({
              id: item.id || `photo-${Date.now()}-${Math.random()}`,
              photoKey: item.photo_key || "",
              url: item.url || item.photo_key || "",
              createdAt: item.created_at || new Date().toISOString()
            }))

            // Add API photos that aren't duplicates
            apiPhotos.forEach((photo: Photo) => {
              if (!currentPhotos.some(p => p.url === photo.url)) {
                currentPhotos.push(photo)
              }
            })
          }
        } catch (err) {
          console.error("Error fetching additional photos:", err)
        }
      }

      // Set photos and selected photos once at the end
      if (currentPhotos.length > 0) {
        setPhotos(currentPhotos)
        setSelectedPhotos(
          new Set(currentPhotos.map((photo: Photo) => photo.id))
        )
      } else if (!fallbackPhotoUrl) {
        setError("No reference photos available")
      }

      setLoading(false)
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
          {photos.map(photo => (
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
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
                <div className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-blue-500">
                  <Check className="size-3 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-muted-foreground mt-4 text-sm">
          <p>Drag images to use them in the image generation prompt.</p>
        </div>
      </CardContent>
    </Card>
  )
}
