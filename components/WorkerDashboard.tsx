"use client"

import React, { useState, useEffect } from "react"
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Loader2, Copy, Send } from "lucide-react"

interface Portrait {
  id: number
  reference_photo_url: string
  recipient_age: number
  recipient_gender: string
  prompt_template: string
  style_name: string
}

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

      if (!response.ok) {
        throw new Error("Failed to submit portrait")
      }

      // Fetch next portrait after successful submission
      await fetchNextPortrait()
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

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Reference Photo</CardTitle>
        </CardHeader>
        <CardContent>
          <img
            src={portrait.reference_photo_url}
            alt="Reference"
            className="h-auto max-w-full rounded-lg"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Style: {portrait.style_name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-gray-50 p-4">
            <pre className="whitespace-pre-wrap">
              {portrait.prompt_template
                .replace("{age}", portrait.recipient_age.toString())
                .replace("{gender}", portrait.recipient_gender)}
            </pre>
          </div>
          <Button onClick={copyPrompt} className="w-full sm:w-auto">
            <Copy className="mr-2 size-4" />
            Copy Prompt
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Submit Portrait</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="url"
              value={midjourneyUrl}
              onChange={e => setMidjourneyUrl(e.target.value)}
              placeholder="Enter Midjourney URL"
              className="w-full rounded-lg border p-2"
              required
            />
            <Button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="mr-2 size-4" />
                  Submit Portrait
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
