export interface Portrait {
  id: number
  style_id: number
  style_name: string
  reference_photo_url: string
  recipient_age: number
  recipient_gender: string
  recipient_id: number
  prompt_template_male: string
  prompt_template_female: string
  image_prompt_male: string
  image_prompt_female: string
  midjourney_mboard: string
  character: string
  stylize: string
  aspect_ratio: string
  repeat: string
  midj_version: string
  negative_prompts: string
  style_reference: string | null
  style_weight: string | null
  proof_status: string | null
  proof_feedback: string | null
  image_key: string | null
}
