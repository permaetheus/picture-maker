import { axios } from "@pipedream/platform"
import https from 'https'
import { PassThrough } from 'stream'
import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'

const MIN_DPI = 300

// Add retry utility at the top of the file
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))
const MAX_RETRIES = 3
const TIMEOUT = 120000 // 2 minutes

async function fetchWithRetry(url, options = {}, retries = 0) {
  try {
    return new Promise((resolve, reject) => {
      const req = https.request(url, {
        ...options,
        timeout: TIMEOUT,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'image/*',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          ...(options.headers || {})
        }
      }, resolve)
      
      req.on('error', reject)
      req.on('timeout', () => {
        req.destroy()
        reject(new Error(`Request timeout after ${TIMEOUT}ms`))
      })
      
      req.end()
    })
  } catch (error) {
    if (retries < MAX_RETRIES) {
      console.log(`Attempt ${retries + 1} failed, retrying in ${(retries + 1) * 1000}ms...`)
      await wait((retries + 1) * 1000)
      return fetchWithRetry(url, options, retries + 1)
    }
    throw new Error(`Failed after ${MAX_RETRIES} retries: ${error.message}`)
  }
}

export default defineComponent({
  props: {
    supabase: {
      type: "app",
      app: "supabase",
    }
  },
  async run({steps, $}) {
    // Validate input URL and IDs
    if (!steps.trigger?.event?.hi_res_url) {
      throw new Error('No image URL provided in trigger event')
    }
    if (!steps.find_portraitid_bookid?.$return_value?.portrait_id || 
        !steps.find_portraitid_bookid?.$return_value?.book_id) {
      throw new Error('Missing portrait_id or book_id from previous step')
    }

    const imageUrl = steps.trigger.event.hi_res_url
    const portraitId = steps.find_portraitid_bookid.$return_value.portrait_id
    const bookId = steps.find_portraitid_bookid.$return_value.book_id
    
    // Determine content type from URL
    const urlPath = new URL(imageUrl).pathname
    const originalExtension = urlPath.split('.').pop().toLowerCase() || 'png'
    const isPNG = originalExtension === 'png'
    const contentType = isPNG ? 'image/png' : 'image/jpeg'
    
    console.log('Processing image:', {
      url: imageUrl,
      portraitId,
      bookId,
      format: isPNG ? 'PNG' : 'JPEG'
    })

    // Initialize Supabase client
    const supabase = createClient(
      `https://${this.supabase.$auth.subdomain}.supabase.co`,
      this.supabase.$auth.service_key
    )

    // Get target dimensions from image_dimensions table
    const { data: dimensionsData, error: dimensionsError } = await supabase
      .from('image_dimensions')
      .select('width, height')
      .eq('id', 1)  
      .single()

    if (dimensionsError) {
      throw new Error(`Failed to fetch image dimensions: ${dimensionsError.message}`)
    }

    if (!dimensionsData) {
      throw new Error('Could not find dimensions in row 1 of image_dimensions table')
    }

    const targetWidth = dimensionsData.width
    const targetHeight = dimensionsData.height

    console.log('Using dimensions from database:', { targetWidth, targetHeight })

    try {
      console.log('Starting image streaming process...')
      
      // Create a PassThrough stream for the original download
      const downloadStream = new PassThrough()
      
      // Create a transform stream with Sharp
      const transformer = sharp()
        .resize({
          width: targetWidth,    
          height: targetHeight,  
          fit: 'fill',   
          withoutEnlargement: true,
        })

      // Apply format-specific settings
      if (isPNG) {
        transformer.png({
          quality: 100,
          density: MIN_DPI,
          compressionLevel: 9 
        }).withMetadata({
          density: MIN_DPI  
        })
      } else {
        transformer.jpeg({ 
          quality: 80,
          density: MIN_DPI
        }).withMetadata({
          density: MIN_DPI  
        })
      }

      // Create a PassThrough stream for the final upload
      const uploadStream = new PassThrough()

      // Store metadata when it becomes available
      let transformerMetadata = null
      transformer.on('metadata', meta => {
        transformerMetadata = meta
        console.log('Image metadata:', meta) 
      })

      // Pipe everything together
      downloadStream
        .pipe(transformer)
        .pipe(uploadStream)

      let totalBytes = 0
      let lastLogTime = Date.now()
      const logInterval = 5000 

      // Set up the download request
      let downloadRequest
      try {
        downloadRequest = await fetchWithRetry(imageUrl)
      } catch (error) {
        throw new Error(`Failed to download image: ${error.message}`)
      }

      const handleResponse = async (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          console.log('Following redirect to:', response.headers.location)
          try {
            const redirectResponse = await fetchWithRetry(response.headers.location)
            return handleResponse(redirectResponse)
          } catch (error) {
            downloadStream.emit('error', new Error(`Failed to follow redirect: ${error.message}`))
            return
          }
        }

        if (response.statusCode !== 200) {
          downloadStream.emit('error', new Error(`Failed to fetch image: HTTP ${response.statusCode}`))
          return
        }

        console.log('Stream started:', {
          contentType: response.headers['content-type'],
          'content-length': response.headers['content-length'] || 'unknown'
        })

        // Add error handler for the response stream
        response.on('error', (error) => {
          console.error('Response stream error:', error)
          downloadStream.emit('error', error)
        })

        // Pipe the response to our download stream with error handling
        response.pipe(downloadStream).on('error', (error) => {
          console.error('Pipe error:', error)
          downloadStream.emit('error', error)
        })

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
            size: `${(totalBytes / 1024 / 1024).toFixed(2)}MB`
          })
        })
      }

      await handleResponse(downloadRequest)

      // Generate filename with book_id and portrait_id
      const timestamp = Date.now()
      const filename = `${bookId}_${portraitId}_resize_${timestamp}.${originalExtension}`

      console.log('Uploading to Supabase...', {
        filename,
        contentType,
        format: isPNG ? 'PNG' : 'JPEG'
      })
      
      // Upload to Supabase storage using the stream
      const uploadResponse = await axios($, {
        method: 'POST',
        url: `https://${this.supabase.$auth.subdomain}.supabase.co/storage/v1/object/hires-portraits/${filename}`,
        headers: {
          'Authorization': `Bearer ${this.supabase.$auth.service_key}`,
          'Content-Type': contentType,
          'Transfer-Encoding': 'chunked'
        },
        data: uploadStream,
        maxBodyLength: Infinity,
        timeout: 120000, 
      })

      // Get the public URL
      const { data: { publicUrl } } = supabase
        .storage
        .from('hires-portraits')
        .getPublicUrl(filename)

      // Update portraits table with new URL
      const { error: updateError } = await supabase
        .from('portraits')
        .update({ 
          resized_hires_image_key: publicUrl
        })
        .eq('id', portraitId)

      if (updateError) {
        throw new Error(`Failed to update portraits table: ${updateError.message}`)
      }

      console.log('Upload successful')
      return {
        filename,
        bucket: 'hires-portraits',
        originalUrl: imageUrl,
        status: 'success',
        size: totalBytes,
        publicUrl,
        dimensions: {
          target: {
            width: targetWidth,
            height: targetHeight
          },
          final: transformerMetadata ? {
            width: transformerMetadata.width,
            height: transformerMetadata.height,
            dpi: transformerMetadata.density
          } : {
            width: targetWidth,
            height: targetHeight,
            dpi: null 
          }
        },
        format: isPNG ? 'PNG' : 'JPEG',
        portraitId,
        bookId
      }

    } catch (error) {
      console.error('Error in file processing/upload:', {
        message: error.message,
        stack: error.stack,
        response: error.response?.data
      })
      throw error
    }
  },
})
