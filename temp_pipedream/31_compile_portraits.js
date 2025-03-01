import { axios } from "@pipedream/platform"

export default defineComponent({
  props: {
    supabase: {
      type: "app",
      app: "supabase",
    }
  },
  async run({steps, $}) {
    // Get book_id from the trigger event
    const bookId = steps.trigger.event.book_id

    // Query Supabase for all portraits matching the book_id
    const response = await axios($, {
      url: `https://${this.supabase.$auth.subdomain}.supabase.co/rest/v1/portraits`,
      headers: {
        Authorization: `Bearer ${this.supabase.$auth.service_key}`,
        "apikey": `${this.supabase.$auth.service_key}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      params: {
        select: "id,image_key,style_id",
        book_id: `eq.${bookId}`,
        // Filtering out style_id 20 (cover image)
        style_id: "not.eq.20" 
      }
    })

    // Map response to array of {portrait_id, image_key} objects and filter out null image_keys
    const portraitImages = response
      .filter(portrait => portrait.image_key !== null)
      .map(portrait => ({
        portrait_id: portrait.id,
        image_key: portrait.image_key
      }))

    return portraitImages
  },
})