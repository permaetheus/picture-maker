// everything below is code intentded to run on pipedream.com
// it is not intended to run on my local machine  

import { axios } from "@pipedream/platform"
import sharp from "sharp"
import fs from "fs"
import path from "path"
import { promisify } from "util"
import stream from "stream"
import { execSync } from "child_process"

// Promisify the pipeline function for easier stream handling
const pipeline = promisify(stream.pipeline);

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
    let portraitData;
    try {
      console.log(`Requesting portrait data for book_id: ${bookId}, style_id: 20`);
      
      portraitData = await axios($, {
        url: `https://${this.supabase.$auth.subdomain}.supabase.co/rest/v1/portraits`,
        headers: {
          Authorization: `Bearer ${this.supabase.$auth.service_key}`,
          "apikey": `${this.supabase.$auth.service_key}`,
          "Content-Type": "application/json"
        },
        params: {
          select: "*",
          book_id: `eq.${bookId}`,
          style_id: "eq.20"
        }
      });
      
      console.log("API Response data:", JSON.stringify(portraitData));
      
    } catch (error) {
      console.error("Error fetching portrait:", error.message);
      throw new Error(`Failed to fetch portrait for book_id ${bookId}: ${error.message}`);
    }
    
    // Check if we have a valid array response
    if (!portraitData || !Array.isArray(portraitData)) {
      throw new Error(`Invalid API response format. Expected array but got: ${typeof portraitData}`);
    }
    
    if (portraitData.length === 0) {
      throw new Error(`No portrait found with style_id 20 for book_id ${bookId}`);
    }
    
    const portrait = portraitData[0];
    
    // Check if there's an original image to process
    if (!portrait.image_key) {
      throw new Error(`Portrait found for book_id ${bookId} but missing image_key. Cannot process without source image.`);
    }
    
    // 2. Download the original image to /tmp directory
    const imageUrl = portrait.image_key;
    const tmpDir = "/tmp";
    const originalImagePath = path.join(tmpDir, `original_${bookId}_${Date.now()}.png`);
    const processedImagePath = path.join(tmpDir, `processed_${bookId}_${Date.now()}.png`);
    
    console.log(`Downloading image from URL: ${imageUrl} to ${originalImagePath}`);
    
    try {
      // Use curl to download the file (more reliable for binary data)
      const curlCommand = `curl -s -X GET "${imageUrl}" \
        -H "Authorization: Bearer ${this.supabase.$auth.service_key}" \
        -H "apikey: ${this.supabase.$auth.service_key}" \
        -o "${originalImagePath}"`;
      
      console.log("Executing curl command to download image");
      execSync(curlCommand);
      
      // Check if file was downloaded successfully
      if (!fs.existsSync(originalImagePath)) {
        throw new Error("File download failed - file does not exist");
      }
      
      const stats = fs.statSync(originalImagePath);
      console.log(`Downloaded file size: ${stats.size} bytes`);
      
      if (stats.size === 0) {
        throw new Error("Downloaded file is empty");
      }
      
      // 3. Process the image with sharp from the file system
      console.log("Processing image with Sharp...");
      await sharp(originalImagePath)
        .resize(WIDTH, HEIGHT, {
          fit: 'fill',
          withoutEnlargement: false
        })
        .withMetadata({
          density: DPI
        })
        .png()
        .toFile(processedImagePath);
      
      console.log("Image processing successful");
      const processedStats = fs.statSync(processedImagePath);
      console.log(`Processed file size: ${processedStats.size} bytes`);
      
      // 4. Upload the processed image to Supabase storage
      const timestamp = Date.now();
      const filename = `${bookId}_portrait_hires_${timestamp}.png`;
      
      console.log(`Uploading processed image to Supabase: ${filename}`);
      const fileContent = fs.readFileSync(processedImagePath);
      
      const uploadResponse = await axios($, {
        method: 'POST',
        url: `https://${this.supabase.$auth.subdomain}.supabase.co/storage/v1/object/hires-portraits/${filename}`,
        headers: {
          Authorization: `Bearer ${this.supabase.$auth.service_key}`,
          "apikey": `${this.supabase.$auth.service_key}`,
          "Content-Type": "image/png"
        },
        data: fileContent
      });
      
      console.log("Upload response:", JSON.stringify(uploadResponse));
      
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
      
      console.log("Update response:", JSON.stringify(updateResponse));
      
      // Clean up temporary files
      fs.unlinkSync(originalImagePath);
      fs.unlinkSync(processedImagePath);
      
      // Return the result
      return {
        portrait_id: portrait.id,
        book_id: bookId,
        original_image_url: imageUrl,
        hires_image_url: publicUrl,
        dimensions: `${WIDTH}x${HEIGHT}`,
        dpi: DPI
      };
      
    } catch (error) {
      console.error("Error in image processing:", error.message);
      // Clean up any temporary files that might exist
      if (fs.existsSync(originalImagePath)) fs.unlinkSync(originalImagePath);
      if (fs.existsSync(processedImagePath)) fs.unlinkSync(processedImagePath);
      throw new Error(`Failed to process image: ${error.message}`);
    }
  },
})
