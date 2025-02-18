import { axios } from "@pipedream/platform"
import https from 'https'
import { PassThrough } from 'stream'

// Size threshold for using chunked download (20MB)
const LARGE_FILE_THRESHOLD = 20 * 1024 * 1024

export default defineComponent({
  props: {
    supabase: {
      type: "app",
      app: "supabase",
    }
  },
  async run({steps, $}) {
    // Validate input URLs
    if (!steps.trigger?.event?.cover || !steps.trigger?.event?.guts) {
      throw new Error('Missing PDF URLs in trigger event')
    }

    const coverUrl = steps.trigger.event.cover
    const gutsUrl = steps.trigger.event.guts
    const bookId = steps.trigger.event.book_id

    if (!bookId) {
      throw new Error('Missing book_id in trigger event')
    }

    console.log('Processing PDFs for book:', bookId)

    // Validate Supabase credentials
    if (!this.supabase?.$auth?.subdomain || !this.supabase?.$auth?.service_key) {
      throw new Error('Missing Supabase credentials')
    }

    // Generate filenames using book_id and timestamp
    const timestamp = Date.now()
    const coverFilename = `${bookId}_cover_${timestamp}.pdf`
    const gutsFilename = `${bookId}_guts_${timestamp}.pdf`

    async function uploadPDF(url, filename) {
      console.log(`Starting upload for ${filename}...`)
      
      const passThrough = new PassThrough()
      let totalBytes = 0
      let lastLogTime = Date.now()
      const logInterval = 5000 // Log every 5 seconds

      return new Promise((resolve, reject) => {
        const downloadRequest = https.request(url, {
          method: 'GET',
          timeout: 60000,
          headers: {
            'User-Agent': 'Mozilla/5.0',
            'Accept': 'application/pdf'
          }
        }, (downloadResponse) => {
          if (downloadResponse.statusCode !== 200) {
            reject(new Error(`Failed to fetch PDF: HTTP ${downloadResponse.statusCode}`))
            return
          }

          console.log(`Stream started for ${filename}`)

          downloadResponse.pipe(passThrough)

          downloadResponse.on('data', chunk => {
            totalBytes += chunk.length
            const now = Date.now()
            if (now - lastLogTime > logInterval) {
              console.log(`Download progress for ${filename}: ${(totalBytes / 1024 / 1024).toFixed(2)}MB received`)
              lastLogTime = now
            }
          })

          downloadResponse.on('end', () => {
            console.log(`Download completed for ${filename}:`, {
              size: `${(totalBytes / 1024 / 1024).toFixed(2)}MB`
            })
          })
        })

        downloadRequest.on('error', reject)
        downloadRequest.on('timeout', () => {
          downloadRequest.destroy()
          reject(new Error(`Connection timeout while downloading ${filename}`))
        })
        
        downloadRequest.end()

        // Upload to Supabase storage
        axios($, {
          method: 'POST',
          url: `https://${this.supabase.$auth.subdomain}.supabase.co/storage/v1/object/finalized_pdf_forprint/${filename}`,
          headers: {
            'Authorization': `Bearer ${this.supabase.$auth.service_key}`,
            'Content-Type': 'application/pdf',
            'Transfer-Encoding': 'chunked'
          },
          data: passThrough,
          maxBodyLength: Infinity,
          timeout: 300000, // 5 minute timeout for upload
        })
        .then(response => {
          console.log(`Upload successful for ${filename}`)
          resolve({
            filename,
            size: totalBytes,
            response: response.data
          })
        })
        .catch(error => {
          console.error(`Supabase upload error for ${filename}:`, {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
          })
          reject(error)
        })
      })
    }

    try {
      // Upload both PDFs in parallel
      const [coverUpload, gutsUpload] = await Promise.all([
        uploadPDF(coverUrl, coverFilename),
        uploadPDF(gutsUrl, gutsFilename)
      ])

      // Generate public URLs
      const baseUrl = `https://${this.supabase.$auth.subdomain}.supabase.co/storage/v1/object/public/finalized_pdf_forprint`
      const coverPdfKey = `${baseUrl}/${coverFilename}`
      const gutsPdfKey = `${baseUrl}/${gutsFilename}`

      // Update the books table with the new PDF keys and status
      const updateResponse = await axios($, {
        method: 'PATCH',
        url: `https://${this.supabase.$auth.subdomain}.supabase.co/rest/v1/books`,
        headers: {
          'Authorization': `Bearer ${this.supabase.$auth.service_key}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        params: {
          id: `eq.${bookId}`
        },
        data: {
          pdf_key: gutsPdfKey, // Main PDF key for the book
          file_cover: coverPdfKey, // Storing cover PDF in a separate column
          status: 'R' // Mark as ready
        }
      })

      if (updateResponse.status !== 204) {
        throw new Error(`Failed to update books table: Unexpected status ${updateResponse.status}`)
      }

      return {
        bookId,
        cover: {
          filename: coverFilename,
          url: coverPdfKey,
          size: coverUpload.size
        },
        guts: {
          filename: gutsFilename,
          url: gutsPdfKey,
          size: gutsUpload.size
        },
        status: 'success'
      }

    } catch (error) {
      console.error('Error in PDF upload process:', {
        message: error.message,
        stack: error.stack,
        response: error.response?.data
      })
      throw error
    }
  },
})
