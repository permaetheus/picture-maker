// this code runs on pipedream.com and uploads the cover and guts PDFs to Supabase
// all code in this file MUST be compatible with running on Pipedream.com

import { axios } from "@pipedream/platform"

export default defineComponent({
  props: {
    supabase: {
      type: "app",
      app: "supabase",
      app: "supabase",
    }
  },
  async run({steps, $}) {
    const coverPdfUrl = steps.trigger.event.cover
    const gutsPdfUrl = steps.trigger.event.guts
    const bookId = steps.trigger.event.book_id

    if (!coverPdfUrl || !gutsPdfUrl) {
      throw new Error('Missing PDF URLs in trigger event')
    }

    console.log('Processing PDFs from:')
    console.log('Cover:', coverPdfUrl)
    console.log('Guts:', gutsPdfUrl)

    // Get the IDs from the trigger event
    const coverOutputId = steps.trigger.event.cover_raw.outputId
    const gutsOutputId = steps.trigger.event.guts_raw.outputId
    const timestamp = Date.now()

    // Create filenames with new format
    const coverFileName = `${bookId}_cover_pdfrest${coverOutputId}_${timestamp}.pdf`
    const gutsFileName = `${bookId}_guts_pdfrest${gutsOutputId}_${timestamp}.pdf`

    // Helper function to process one PDF with retries
    async function processPDF(sourceUrl, fileName, maxRetries = 3) {
      console.log(`Processing ${fileName}...`)
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // Fetch the PDF
          console.log(`Fetching ${fileName} from source...`)
          const response = await fetch(sourceUrl, {
            method: 'GET',
            headers: { 'Accept': '*/*' }
          })
          
          if (!response.ok) {
            throw new Error(`Fetch failed with status ${response.status}`)
          }

          const contentLength = response.headers.get('content-length')
          console.log(`File size: ${contentLength ? `${(parseInt(contentLength) / 1024 / 1024).toFixed(2)}MB` : 'unknown'}`)

          // Convert to buffer but in chunks to manage memory
          console.log(`Reading ${fileName} into memory...`)
          const chunks = []
          const reader = response.body.getReader()
          
          while (true) {
            const {done, value} = await reader.read()
            if (done) break
            chunks.push(value)
          }
          
          const buffer = Buffer.concat(chunks)
          console.log(`Successfully read ${(buffer.length / 1024 / 1024).toFixed(2)}MB into memory`)

          // Upload to Supabase using fetch instead of axios for large files
          console.log(`Uploading ${fileName} to Supabase...`)
          
          // Use fetch instead of axios for large files
          const uploadResponse = await fetch(
            `https://${this.supabase.$auth.subdomain}.supabase.co/storage/v1/object/finalized_pdf_forprint/${fileName}`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${this.supabase.$auth.service_key}`,
                'Content-Type': 'application/pdf',
              },
              body: buffer,
            }
          );
          
          if (!uploadResponse.ok) {
            throw new Error(`Upload failed with status ${uploadResponse.status}: ${await uploadResponse.text()}`);
          }
          
          // Clear buffer from memory
          chunks.length = 0
          
          console.log(`Successfully uploaded ${fileName}`)
          return {
            success: true,
            fileName
          }

        } catch (error) {
          console.error(`Attempt ${attempt} failed for ${fileName}:`, error.message)
          
          if (attempt === maxRetries) {
            console.error(`Failed all ${maxRetries} attempts to process ${fileName}`)
            throw error
          }
          
          const delay = attempt * 2000 // Exponential backoff: 2s, 4s, 6s
          console.log(`Retrying in ${delay/1000} seconds...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    // Process PDFs sequentially
    let coverResponse, gutsResponse
    try {
      console.log('Starting cover PDF upload...')
      coverResponse = await processPDF.call(this, coverPdfUrl, coverFileName)
      console.log('Cover PDF completed')
      
      console.log('Starting guts PDF upload...')
      gutsResponse = await processPDF.call(this, gutsPdfUrl, gutsFileName)
      console.log('Guts PDF completed')
    } catch (error) {
      console.error('PDF processing error:', error)
      throw error
    }

    // Construct the public URLs
    const coverStorageUrl = `https://${this.supabase.$auth.subdomain}.supabase.co/storage/v1/object/public/finalized_pdf_forprint/${coverFileName}`
    const gutsStorageUrl = `https://${this.supabase.$auth.subdomain}.supabase.co/storage/v1/object/public/finalized_pdf_forprint/${gutsFileName}`

    // Update the books table with the PDF URLs
    try {
      await axios($, {
        method: 'PATCH',
        url: `https://${this.supabase.$auth.subdomain}.supabase.co/rest/v1/books?id=eq.${bookId}`,
        headers: {
          'Authorization': `Bearer ${this.supabase.$auth.service_key}`,
          'apikey': this.supabase.$auth.service_key,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        data: {
          cover_pdf_key: coverStorageUrl,
          guts_pdf_key: gutsStorageUrl
        }
      })

      // If we get here, the update succeeded (no error was thrown)
      console.log('Database update completed successfully')

      return {
        coverUpload: (coverResponse?.success) ? 'success' : 'failed',
        gutsUpload: (gutsResponse?.success) ? 'success' : 'failed',
        dbUpdate: 'success',  // If no error was thrown, consider it successful
        coverUrl: coverStorageUrl,
        gutsUrl: gutsStorageUrl,
      }
    } catch (error) {
      console.error('Database update error:', error)
      return {
        coverUpload: (coverResponse?.success) ? 'success' : 'failed',
        gutsUpload: (gutsResponse?.success) ? 'success' : 'failed',
        dbUpdate: 'failed',
        coverUrl: coverStorageUrl,
        gutsUrl: gutsStorageUrl,
      }
    }
  },
})
