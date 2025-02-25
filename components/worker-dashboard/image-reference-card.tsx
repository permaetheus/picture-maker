"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { useEffect, useRef } from "react"

interface ImageReferenceCardProps {
  imagePromptMale: string | null
  imagePromptFemale: string | null
  recipientGender: string
}

export default function ImageReferenceCard({
  imagePromptMale,
  imagePromptFemale,
  recipientGender
}: ImageReferenceCardProps) {
  // Select the appropriate image based on gender
  const imageUrl =
    recipientGender.toLowerCase() === "male"
      ? imagePromptMale
      : imagePromptFemale

  const imgRef = useRef<HTMLImageElement>(null)

  // Prevent context menu (right-click)
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    return false
  }

  // Prevent drag start
  const handleDragStart = (e: React.DragEvent) => {
    e.preventDefault()
    return false
  }

  // Additional protection using JS
  useEffect(() => {
    const img = imgRef.current
    if (img) {
      // Prevent copy via keyboard shortcuts
      const preventCopy = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "C")) {
          e.preventDefault()
        }
      }

      document.addEventListener("keydown", preventCopy)

      return () => {
        document.removeEventListener("keydown", preventCopy)
      }
    }
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Example Image</CardTitle>
      </CardHeader>
      <CardContent>
        {imageUrl ? (
          <img
            ref={imgRef}
            src={imageUrl}
            alt="Style Reference"
            className="h-auto max-h-[200px] max-w-full select-none rounded-lg object-contain"
            onContextMenu={handleContextMenu}
            onDragStart={handleDragStart}
            style={{
              userSelect: "none",
              pointerEvents: "none" // Prevents most interactions
            }}
          />
        ) : (
          <p>No reference image available</p>
        )}
      </CardContent>
    </Card>
  )
}
