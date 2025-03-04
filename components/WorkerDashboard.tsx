"use client"

import React, { useState, useEffect } from "react"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

import ReferencePhotoCard from "@/components/worker-dashboard/reference-photo-card"
import StyleCard from "@/components/worker-dashboard/style-card"
import UploadPortraitCard from "@/components/worker-dashboard/upload-portrait-card"
import ImageReferenceCard from "@/components/worker-dashboard/image-reference-card"
import RejectionAlert from "@/components/worker-dashboard/rejection-alert"

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

  // Update copyPrompt function to handle all parameters with proper prefixes
  const copyPrompt = async () => {
    if (!portrait) return

    // Select template based on gender
    const template =
      portrait.recipient_gender.toLowerCase() === "male"
        ? portrait.prompt_template_male
        : portrait.prompt_template_female

    // Process the template with age and gender
    const processedPrompt = template
      .replace("{age}", portrait.recipient_age.toString())
      .replace("{gender}", () => {
        // Use boy/girl for under 18, otherwise use man/woman
        if (portrait.recipient_age < 18) {
          return portrait.recipient_gender.toLowerCase() === "male"
            ? "boy"
            : "girl"
        } else {
          return portrait.recipient_gender.toLowerCase() === "male"
            ? "man"
            : "woman"
        }
      })

    // Format parameters with proper prefixes
    const parameters = [
      portrait.midjourney_mboard && `--p ${portrait.midjourney_mboard}`,
      portrait.character && `--cw ${portrait.character}`,
      portrait.aspect_ratio && `--ar ${portrait.aspect_ratio}`,
      portrait.repeat && `--r ${portrait.repeat}`,
      portrait.stylize && `--stylize ${portrait.stylize}`,
      portrait.style_reference && `--sref ${portrait.style_reference}`,
      portrait.style_weight && `--sw ${portrait.style_weight}`,
      portrait.midj_version && `--v ${portrait.midj_version}`,
      portrait.negative_prompts && `--no ${portrait.negative_prompts}`
    ]
      .filter(Boolean)
      .map(param => (param as string).trim())
      .join(" ")

    // Combine prompt and parameters
    const fullPrompt = `${processedPrompt.trim()}${parameters ? ` ${parameters}` : ""}`
    await navigator.clipboard.writeText(fullPrompt)
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

  return (
    <div className="mx-auto max-w-[800px] px-4">
      <div className="space-y-8">
        {portrait.proof_status === "R" && (
          <RejectionAlert
            isRejected={true}
            feedback={portrait.proof_feedback}
          />
        )}

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

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <ReferencePhotoCard
            referencePhotoUrl={portrait.reference_photo_url}
          />
          <ImageReferenceCard
            imagePromptMale={portrait.image_prompt_male}
            imagePromptFemale={portrait.image_prompt_female}
            recipientGender={portrait.recipient_gender}
          />
        </div>

        <StyleCard
          styleName={portrait.style_name}
          prompt_template_male={portrait.prompt_template_male}
          prompt_template_female={portrait.prompt_template_female}
          recipient_gender={portrait.recipient_gender}
          recipient_age={portrait.recipient_age}
          midjourney_mboard={portrait.midjourney_mboard}
          character={portrait.character}
          stylize={portrait.stylize}
          aspect_ratio={portrait.aspect_ratio}
          repeat={portrait.repeat}
          midj_version={portrait.midj_version}
          negative_prompts={portrait.negative_prompts}
          style_reference={portrait.style_reference}
          style_weight={portrait.style_weight}
          onCopy={copyPrompt}
        />
      </div>
    </div>
  )
}
