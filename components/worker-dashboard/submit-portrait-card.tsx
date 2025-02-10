"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Send } from "lucide-react"

interface SubmitPortraitCardProps {
  midjourneyUrl: string
  onMidjourneyUrlChange: (val: string) => void
  onSubmit: (e: React.FormEvent) => Promise<void>
  submitting: boolean
}

export default function SubmitPortraitCard({
  midjourneyUrl,
  onMidjourneyUrlChange,
  onSubmit,
  submitting
}: SubmitPortraitCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit Portrait</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <input
            type="url"
            value={midjourneyUrl}
            onChange={e => onMidjourneyUrlChange(e.target.value)}
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
  )
}
