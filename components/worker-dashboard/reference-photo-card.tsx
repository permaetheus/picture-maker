"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

interface ReferencePhotoCardProps {
  referencePhotoUrl: string
}

export default function ReferencePhotoCard({
  referencePhotoUrl
}: ReferencePhotoCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reference Photo</CardTitle>
      </CardHeader>
      <CardContent>
        <img
          src={referencePhotoUrl}
          alt="Reference"
          className="h-auto max-w-full rounded-lg"
        />
      </CardContent>
    </Card>
  )
}
