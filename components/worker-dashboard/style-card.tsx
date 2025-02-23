"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Copy } from "lucide-react"

interface StyleCardProps {
  styleName: string
  processedPrompt: string
  midjourney_mboard: string | null
  character: string | null
  stylize: string | null
  aspect_ratio: string | null
  repeat: string | null
  midj_version: string | null
  negative_prompts: string | null
  onCopy: () => Promise<void>
}

export default function StyleCard({
  styleName,
  processedPrompt,
  midjourney_mboard,
  character,
  stylize,
  aspect_ratio,
  repeat,
  midj_version,
  negative_prompts,
  onCopy
}: StyleCardProps) {
  // Construct the full prompt by concatenating all non-null fields
  const fullPrompt = [
    processedPrompt,
    midjourney_mboard,
    character,
    stylize,
    aspect_ratio,
    repeat,
    midj_version,
    negative_prompts ? `--no ${negative_prompts}` : null
  ]
    .filter(Boolean) // Remove null/undefined values
    .join(" ")
    .trim() // Remove extra spaces

  return (
    <Card>
      <CardHeader>
        <CardTitle>Style: {styleName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-gray-50 p-4">
          <pre className="whitespace-pre-wrap">{fullPrompt}</pre>
        </div>

        <Button onClick={onCopy} className="w-full sm:w-auto">
          <Copy className="mr-2 size-4" />
          Copy Prompt
        </Button>
      </CardContent>
    </Card>
  )
}
