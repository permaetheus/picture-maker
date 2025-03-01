import { axios } from "@pipedream/platform"
import sharp from "sharp"

export default defineComponent({
  props: {
    supabase: {
      type: "app",
      app: "supabase",
    }
  },
  async run({steps, $}) {
    // Get the book_id from the trigger
    const bookId = steps.trigger.event.book_id;
    if (!bookId) {
      throw new Error("No book_id provided in trigger event");
    }
    
    // Constants for image processing
    const WIDTH = 862;
    const HEIGHT = 872;
    const DPI = 300;
    
    // 1. Get the portrait with style_id 20 for this book
    const portraitsResponse = await axios($, {
      url: `https://${this.supabase.$auth.subdomain}.supabase.co/rest/v1/portraits`,
      headers: {
        Authorization: `Bearer ${this.supabase.$auth.service_key}`,
        "apikey": `${this.supabase.$auth.service_key}`,
      },
      params: {
        select: "*",
        book_id: `eq.${bookId}`,
        style_id: "eq.20"
      }
    });
    
    const portrait = portraitsResponse.data[0];
    if (!portrait || !portrait.image_key) {
      throw new Error(`No portrait found with style_id 20 for book_id ${bookId} or missing image_key`);
    }
    
    // 2. Download the original image
    const imageUrl = portrait.image_key;
    const imageResponse = await axios($, {
      url: imageUrl,
      responseType: "arraybuffer"
    });
    
    // 3. Process the image with sharp
    const processedImageBuffer = await sharp(imageResponse.data)
      .resize(WIDTH, HEIGHT, {
        fit: 'fill',
        withoutEnlargement: false
      })
      .withMetadata({
        density: DPI
      })
      .png()
      .toBuffer();
    
    // 4. Upload the processed image to Supabase storage
    const timestamp = Date.now();
    const filename = `${bookId}_portrait_hires_${timestamp}.png`;
    
    const uploadResponse = await axios($, {
      method: 'POST',
      url: `https://${this.supabase.$auth.subdomain}.supabase.co/storage/v1/object/hires-portraits/${filename}`,
      headers: {
        Authorization: `Bearer ${this.supabase.$auth.service_key}`,
        "apikey": `${this.supabase.$auth.service_key}`,
        "Content-Type": "image/png"
      },
      data: processedImageBuffer
    });
    
    // Get the public URL for the uploaded image
    const publicUrl = `https://${this.supabase.$auth.subdomain}.supabase.co/storage/v1/object/public/hires-portraits/${filename}`;
    
    // 5. Update the portrait record with the high-res image URL
    const updateResponse = await axios($, {
      method: 'PATCH',
      url: `https://${this.supabase.$auth.subdomain}.supabase.co/rest/v1/portraits`,
      headers: {
        Authorization: `Bearer ${this.supabase.$auth.service_key}`,
        "apikey": `${this.supabase.$auth.service_key}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      params: {
        id: `eq.${portrait.id}`
      },
      data: {
        hires_image_key: publicUrl
      }
    });
    
    // Return the result
    return {
      portrait_id: portrait.id,
      book_id: bookId,
      original_image_url: imageUrl,
      hires_image_url: publicUrl,
      dimensions: `${WIDTH}x${HEIGHT}`,
      dpi: DPI
    };
  },
})
