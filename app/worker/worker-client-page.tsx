"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// For your Prompt display
// For your request
import { useRouter } from "next/navigation"

interface WorkerClientPageProps {
  initialPortraitResult: {
    isSuccess: boolean
    message: string
    data?: any
  }
}

export default function WorkerClientPage({
  initialPortraitResult
}: WorkerClientPageProps) {
  const router = useRouter()
  const data = initialPortraitResult.data

  const [midjourneyUrl, setMidjourneyUrl] = useState("")

  if (!initialPortraitResult.isSuccess) {
    return <div>{initialPortraitResult.message}</div>
  }

  if (!data || !data.artist_styles || !data.books?.recipients) {
    return <div>Missing required data</div>
  }

  const {
    id,
    books: {
      recipients: {
        photo_key: reference_photo_url,
        age: recipient_age,
        gender: recipient_gender
      }
    },
    artist_styles: { prompt_template }
  } = data

  const processedText = data.artist_styles.prompt_template
    ?.replace("{age}", data.books.recipients.age)
    ?.replace("{gender}", data.books.recipients.gender)

  async function handleSubmit() {
    if (!midjourneyUrl) return
    await fetch(`/api/portraits/${id}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ midjourneyUrl })
    })
    // Refresh page to fetch next assignment
    router.refresh()
  }

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Reference Photo</CardTitle>
        </CardHeader>
        <CardContent>
          {reference_photo_url ? (
            <img
              src={reference_photo_url}
              alt="Reference"
              className="max-w-md"
            />
          ) : (
            <p>No reference photo</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Prompt Template</CardTitle>
        </CardHeader>
        <CardContent>
          <pre>{prompt_template}</pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Processed Prompt</CardTitle>
        </CardHeader>
        <CardContent>
          <pre>{processedText}</pre>
          <Button onClick={() => navigator.clipboard.writeText(processedText)}>
            Copy
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Submit Midjourney URL</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <input
            type="text"
            value={midjourneyUrl}
            onChange={e => setMidjourneyUrl(e.target.value)}
            placeholder="https://cdn.midjourney.com/..."
            className="border p-2"
          />
          <Button onClick={handleSubmit}>Submit Portrait</Button>
        </CardContent>
      </Card>
    </div>
  )
}
