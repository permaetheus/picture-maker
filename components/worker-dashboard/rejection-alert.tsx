"use client"

import { AlertCircle } from "lucide-react"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"

interface RejectionAlertProps {
  isRejected: boolean
  feedback?: string | null
}

export default function RejectionAlert({
  isRejected,
  feedback
}: RejectionAlertProps) {
  if (!isRejected) return null

  return (
    <Alert variant="destructive">
      <AlertCircle className="size-4" />
      <AlertTitle>This portrait was previously rejected</AlertTitle>
      {feedback && (
        <AlertDescription className="mt-2">
          <div className="font-medium">
            Customer Feedback:{" "}
            <span className="mt-1 whitespace-pre-wrap">{feedback}</span>
          </div>
        </AlertDescription>
      )}
    </Alert>
  )
}
