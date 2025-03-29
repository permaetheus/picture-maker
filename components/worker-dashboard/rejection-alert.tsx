"use client"

import { AlertCircle } from "lucide-react"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import Image from "next/image"

interface RejectionAlertProps {
  isRejected: boolean
  feedback?: string | null
  rejectedImageUrl?: string | null
}

export default function RejectionAlert({
  isRejected,
  feedback,
  rejectedImageUrl
}: RejectionAlertProps) {
  if (!isRejected) return null

  return (
    <Alert variant="destructive" className="mt-4">
      <AlertCircle className="size-4" />
      <AlertTitle>
        This portrait was previously rejected by the customer
      </AlertTitle>
      {feedback && (
        <AlertDescription className="mt-2">
          <div className="font-medium">
            Customer Feedback:{" "}
            <span className="whitespace-pre-wrap font-normal">{feedback}</span>
          </div>
        </AlertDescription>
      )}
      {rejectedImageUrl && (
        <div className="mt-4">
          <p className="mb-2 font-semibold">Rejected Image:</p>
          <Image
            src={rejectedImageUrl}
            alt="Rejected Portrait"
            width={200}
            height={200}
            className="rounded-lg border object-contain"
            unoptimized
          />
        </div>
      )}
    </Alert>
  )
}
