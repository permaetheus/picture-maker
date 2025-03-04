"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// For your Prompt display
// For your request
import { useRouter } from "next/navigation"
import RejectionAlert from "@/components/worker-dashboard/rejection-alert"

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

  // Safely parse arrays and pick first child
  const firstBook = Array.isArray(data?.books) ? data.books[0] : data?.books
  const firstRecipient =
    firstBook?.recipients && Array.isArray(firstBook.recipients)
      ? firstBook.recipients[0]
      : firstBook?.recipients

  const firstStyle = Array.isArray(data?.artist_styles)
    ? data.artist_styles[0]
    : data?.artist_styles

  if (!firstStyle?.prompt_template || !firstRecipient?.photo_key) {
    return <div>Missing required data</div>
  }

  const processedText = firstStyle.prompt_template
    ?.replace("{age}", firstRecipient.age)
    ?.replace("{gender}", firstRecipient.gender)

  async function handleSubmit() {
    if (!midjourneyUrl) return
    await fetch(`/api/portraits/${data.id}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ midjourneyUrl })
    })
    // Refresh page to fetch next assignment
    router.refresh()
  }

  return (
    <div className="space-y-4 p-4">
      {data.proof_status === "R" && (
        <RejectionAlert isRejected={true} feedback={data.proof_feedback} />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Reference Photo</CardTitle>
        </CardHeader>
        <CardContent>
          {firstRecipient?.photo_key ? (
            <img
              src={firstRecipient.photo_key}
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
          <pre>{firstStyle?.prompt_template}</pre>
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
