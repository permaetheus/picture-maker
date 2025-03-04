"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Copy, Check } from "lucide-react"
import { useState } from "react"

interface StyleCardProps {
  styleName: string
  prompt_template_male: string | null
  prompt_template_female: string | null
  recipient_gender: string
  recipient_age: number
  midjourney_mboard: string | null
  character: string | null
  stylize: string | null
  aspect_ratio: string | null
  repeat: string | null
  midj_version: string | null
  negative_prompts: string | null
  style_reference: string | null
  style_weight: string | null
  onCopy: () => Promise<void>
}

export default function StyleCard({
  styleName,
  prompt_template_male,
  prompt_template_female,
  recipient_gender,
  recipient_age,
  midjourney_mboard,
  character,
  stylize,
  aspect_ratio,
  repeat,
  midj_version,
  negative_prompts,
  style_reference,
  style_weight,
  onCopy
}: StyleCardProps) {
  // Add state for copy feedback
  const [copied, setCopied] = useState(false)

  // Select the appropriate template based on gender
  const template =
    recipient_gender.toLowerCase() === "male"
      ? prompt_template_male
      : prompt_template_female

  // Process the template with age and gender
  const processedPrompt = template
    ? template
        .replace("{age}", recipient_age.toString())
        .replace("{gender}", () => {
          // Use boy/girl for under 18, otherwise use male/female
          if (recipient_age < 18) {
            return recipient_gender.toLowerCase() === "male" ? "boy" : "girl"
          } else {
            return recipient_gender.toLowerCase() === "male" ? "man" : "woman"
          }
        })
    : ""

  // Format the parameters in a specific order with proper spacing
  const parameters = [
    midjourney_mboard && `--p ${midjourney_mboard}`,
    character && `--cw ${character}`,
    aspect_ratio && `--ar ${aspect_ratio}`,
    repeat && `--r ${repeat}`,
    stylize && `--stylize ${stylize}`,
    style_reference && `--sref ${style_reference}`,
    style_weight && `--sw ${style_weight}`,
    midj_version && `--v ${midj_version}`,
    negative_prompts && `--no ${negative_prompts}`
  ]
    .filter(Boolean)
    .map(param => (param as string).trim())
    .join(" ")

  // Combine prompt and parameters with proper spacing
  const fullPrompt = `${processedPrompt.trim()}${parameters ? ` ${parameters}` : ""}`

  // Handle copy with feedback
  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullPrompt)
    setCopied(true)

    // Reset after short delay
    setTimeout(() => {
      setCopied(false)
    }, 2000)

    if (onCopy) await onCopy()
  }

  return (
    <Card
      className={`transition-all ${copied ? "bg-green-50 dark:bg-green-900/20" : ""}`}
    >
      <CardHeader>
        <CardTitle>Style: {styleName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-gray-50 p-4">
          <pre className="whitespace-pre-wrap break-words">{fullPrompt}</pre>
        </div>

        <Button
          onClick={handleCopy}
          className="w-full sm:w-auto"
          disabled={!fullPrompt}
          variant={copied ? "success" : "default"}
        >
          {copied ? (
            <>
              <Check className="mr-2 size-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="mr-2 size-4" />
              Copy Prompt
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
