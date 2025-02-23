"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Image Reference</CardTitle>
      </CardHeader>
      <CardContent>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Style Reference"
            className="h-auto max-h-[200px] max-w-full rounded-lg object-contain"
          />
        ) : (
          <p>No reference image available</p>
        )}
      </CardContent>
    </Card>
  )
}
