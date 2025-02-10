"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Copy } from "lucide-react"

interface StyleCardProps {
  styleName: string
  processedPrompt: string
  onCopy: () => Promise<void>
}

export default function StyleCard({
  styleName,
  processedPrompt,
  onCopy
}: StyleCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Style: {styleName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-gray-50 p-4">
          <pre className="whitespace-pre-wrap">{processedPrompt}</pre>
        </div>

        <Button onClick={onCopy} className="w-full sm:w-auto">
          <Copy className="mr-2 size-4" />
          Copy Prompt
        </Button>
      </CardContent>
    </Card>
  )
}
