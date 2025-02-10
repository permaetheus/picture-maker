"use client"

import React, { useState, useEffect } from "react"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

import ReferencePhotoCard from "@/components/worker-dashboard/reference-photo-card"
import StyleCard from "@/components/worker-dashboard/style-card"
import SubmitPortraitCard from "@/components/worker-dashboard/submit-portrait-card"

import { Portrait } from "@/types"

export default function WorkerDashboard() {
  const [portrait, setPortrait] = useState<Portrait | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [midjourneyUrl, setMidjourneyUrl] = useState("")
  const [submitting, setSubmitting] = useState(false)

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
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!midjourneyUrl.trim()) {
      setError("Please enter a Midjourney URL")
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch(`/api/portraits/${portrait?.id}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ midjourneyUrl })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to submit portrait")
      }

      if (data.success) {
        setMidjourneyUrl("") // Clear the input after successful submission
        await fetchNextPortrait() // Fetch next portrait
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit portrait")
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
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin" />
      </div>
    )
  }

  if (!portrait) {
    return (
      <Alert className="mx-auto mt-8 max-w-2xl">
        <AlertTitle>No Portraits Available</AlertTitle>
        <AlertDescription>
          There are currently no pending portraits to work on. Please check back
          later.
        </AlertDescription>
      </Alert>
    )
  }

  const processedPrompt = portrait.prompt_template
    .replace("{age}", portrait.recipient_age.toString())
    .replace("{gender}", portrait.recipient_gender)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
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

      <SubmitPortraitCard
        midjourneyUrl={midjourneyUrl}
        onMidjourneyUrlChange={val => setMidjourneyUrl(val)}
        onSubmit={handleSubmit}
        submitting={submitting}
      />
    </div>
  )
}
