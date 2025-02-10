"use client"

import React, { useState, useEffect } from "react"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

import ReferencePhotoCard from "@/components/worker-dashboard/reference-photo-card"
import StyleCard from "@/components/worker-dashboard/style-card"
import UploadPortraitCard from "@/components/worker-dashboard/upload-portrait-card"

import { Portrait } from "@/types"

export default function WorkerDashboard() {
  const [portrait, setPortrait] = useState<Portrait | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [userId, setUserId] = useState<string>("")

  // Fetch next available portrait
  const fetchNextPortrait = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/portraits/next")
      const result = await response.json()
      console.log("API response:", result)

      if (!result.isSuccess || !result.data) {
        setPortrait(null)
        return
      }

      setPortrait(result.data)
    } catch (error) {
      setError("Failed to fetch portrait")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // Submit completed portrait
  const handleImageUpload = async (imageUrl: string) => {
    if (!portrait?.id) return

    try {
      setSubmitting(true)
      const response = await fetch(`/api/portraits/${portrait.id}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ midjourneyUrl: imageUrl })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to submit portrait")
      }

      if (data.success) {
        await fetchNextPortrait() // Fetch next portrait
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit portrait")
      throw err // Re-throw to be handled by the UploadPortraitCard
    } finally {
      setSubmitting(false)
    }
  }

  // Copy prompt to clipboard
  const copyPrompt = async () => {
    if (!portrait) return

    const processedPrompt = portrait.prompt_template
      .replace("{age}", portrait.recipient_age.toString())
      .replace("{gender}", portrait.recipient_gender)

    await navigator.clipboard.writeText(processedPrompt)
  }

  // Initial portrait fetch
  useEffect(() => {
    fetchNextPortrait()
  }, [])

  if (loading) {
    return (
      <div className="mx-auto max-w-[800px] px-4">
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="size-8 animate-spin" />
        </div>
      </div>
    )
  }

  if (!portrait) {
    return (
      <div className="mx-auto max-w-[800px] px-4">
        <Alert className="mt-8">
          <AlertTitle>No Portraits Available</AlertTitle>
          <AlertDescription>
            There are currently no pending portraits to work on. Please check
            back later.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const processedPrompt = portrait.prompt_template
    .replace("{age}", portrait.recipient_age.toString())
    .replace("{gender}", portrait.recipient_gender)

  return (
    <div className="mx-auto max-w-[800px] px-4">
      <div className="space-y-8">
        <UploadPortraitCard
          onImageUpload={handleImageUpload}
          userId={userId}
          portraitId={portrait?.id || 0}
        />
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <ReferencePhotoCard referencePhotoUrl={portrait.reference_photo_url} />

        <StyleCard
          styleName={portrait.style_name}
          processedPrompt={processedPrompt}
          onCopy={copyPrompt}
        />
      </div>
    </div>
  )
}
