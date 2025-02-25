// This code is designed to run on Pipedream.com

import { axios } from "@pipedream/platform"
import https from 'https'
import { PassThrough } from 'stream'
import sharp from 'sharp'

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
    // Validate input URL
    if (!steps.trigger?.event?.hi_res_url) {
      throw new Error('No image URL provided in trigger event')
    }

    // Validate portrait_id and book_id
    if (!steps.find_portraitid_bookid?.$return_value?.portrait_id || !steps.find_portraitid_bookid?.$return_value?.book_id) {
      throw new Error('Missing portrait_id or book_id')
    }

    const imageUrl = steps.trigger.event.hi_res_url
    console.log('Attempting to fetch image from:', imageUrl)

    // Validate URL format
    try {
      new URL(imageUrl)
    } catch (e) {
      throw new Error(`Invalid URL format: ${imageUrl}`)
    }
    
    // Extract file extension from URL or default to jpg
    const urlPath = new URL(imageUrl).pathname
    const originalExtension = urlPath.split('.').pop().toLowerCase() || 'jpg'
    
    // Validate Supabase credentials
    if (!this.supabase?.$auth?.subdomain || !this.supabase?.$auth?.service_key) {
      throw new Error('Missing Supabase credentials')
    }

    // Generate filename using book_id, portrait_id and timestamp
    const timestamp = Date.now()
    const filename = `${steps.find_portraitid_bookid.$return_value.book_id}_${steps.find_portraitid_bookid.$return_value.portrait_id}_hires_${timestamp}.png`

    try {
      console.log('Starting image streaming process...')
      
      // Create a PassThrough stream to pipe data through
      const passThrough = new PassThrough()
      let contentType = 'image/png'
      let totalBytes = 0
      let lastLogTime = Date.now()
      const logInterval = 5000 // Log every 5 seconds

      // Create sharp transform stream to set DPI
      const sharpTransform = sharp()
        .withMetadata({
          density: 300 // Set DPI to 300
        })
        .png() // Ensure output is PNG

      // Pipe through sharp for DPI modification
      passThrough.pipe(sharpTransform)

      // Set up the download request
      const downloadRequest = https.request(imageUrl, {
        method: 'GET',
        timeout: 60000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'image/*',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive'
        }
      }, (downloadResponse) => {
        console.log('Received response:', {
          statusCode: downloadResponse.statusCode,
          headers: downloadResponse.headers
        })

        if (downloadResponse.statusCode === 302 || downloadResponse.statusCode === 301) {
          // Handle redirects
          console.log('Following redirect to:', downloadResponse.headers.location)
          downloadRequest.destroy()
          
          https.get(downloadResponse.headers.location, {
            timeout: 60000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
              'Accept': 'image/*'
            }
          }, (redirectResponse) => {
            handleResponse(redirectResponse)
          }).on('error', (error) => passThrough.emit('error', error))
          
          return
        }

        handleResponse(downloadResponse)
      })

      function handleResponse(response) {
        if (response.statusCode !== 200) {
          passThrough.emit('error', new Error(`Failed to fetch image: HTTP ${response.statusCode}`))
          return
        }

        console.log('Stream started:', {
          contentType,
          'content-length': response.headers['content-length'] || 'unknown'
        })

        // Pipe the response to our PassThrough stream
        response.pipe(passThrough)

        // Track progress
        response.on('data', chunk => {
          totalBytes += chunk.length
          const now = Date.now()
          if (now - lastLogTime > logInterval) {
            console.log(`Download progress: ${(totalBytes / 1024 / 1024).toFixed(2)}MB received`)
            lastLogTime = now
          }
        })

        response.on('end', () => {
          console.log('Download completed:', {
            size: `${(totalBytes / 1024 / 1024).toFixed(2)}MB`,
            contentType
          })
        })
      }

      downloadRequest.on('error', (error) => passThrough.emit('error', error))
      downloadRequest.on('timeout', () => {
        downloadRequest.destroy()
        passThrough.emit('error', new Error('Connection timeout while downloading image'))
      })
      
      downloadRequest.end()

      console.log('Uploading to Supabase...')
      
      // Upload to Supabase storage using the stream
      const uploadResponse = await axios($, {
        method: 'POST',
        url: `https://${this.supabase.$auth.subdomain}.supabase.co/storage/v1/object/hires-portraits/${filename}`,
        headers: {
          'Authorization': `Bearer ${this.supabase.$auth.service_key}`,
          'Content-Type': contentType,
          'Transfer-Encoding': 'chunked'
        },
        data: sharpTransform,
        maxBodyLength: Infinity,
        timeout: 120000, // 2 minute timeout for upload
      }).catch(error => {
        console.error('Supabase upload error:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        })
        if (error.response?.status === 403) {
          throw new Error('Unauthorized: Invalid Supabase credentials')
        }
        if (error.response?.status === 404) {
          throw new Error('Bucket "hires-portraits" not found')
        }
        throw new Error(`Failed to upload to Supabase: ${error.message}`)
      })

      console.log('Upload successful, updating portraits table...')

      // Construct the public URL for the uploaded image
      const publicImageUrl = `https://${this.supabase.$auth.subdomain}.supabase.co/storage/v1/object/public/hires-portraits/${filename}`

      // Update the portraits table with the public URL
      const updateResponse = await axios($, {
        method: 'PATCH',
        url: `https://${this.supabase.$auth.subdomain}.supabase.co/rest/v1/portraits?id=eq.${steps.find_portraitid_bookid.$return_value.portrait_id}`,
        headers: {
          'apikey': this.supabase.$auth.service_key,
          'Authorization': `Bearer ${this.supabase.$auth.service_key}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        data: {
          hires_image_key: publicImageUrl
        }
      }).catch(error => {
        console.error('Database update error:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        })
        throw new Error(`Failed to update portrait record: ${error.message}`)
      })

      console.log('Portrait record updated successfully')
      
      return {
        filename,
        publicUrl: publicImageUrl,
        bucket: 'hires-portraits',
        originalUrl: imageUrl,
        status: 'success',
        contentType,
        size: totalBytes,
        portrait_id: steps.find_portraitid_bookid.$return_value.portrait_id,
        book_id: steps.find_portraitid_bookid.$return_value.book_id,
        response: uploadResponse.data
      }
    } catch (error) {
      console.error('Error in file upload process:', {
        message: error.message,
        stack: error.stack,
        response: error.response?.data
      })
      throw error
    }
  },
})