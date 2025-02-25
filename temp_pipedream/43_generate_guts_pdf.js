// This code is designed to run on Pipedream.com and processes the cover 

// To use any npm package on Pipedream, just import it
import axios from "axios"
import FormData from "form-data"

export default defineComponent({
  async run({ steps, $ }) {
    // Extract book data from the trigger event
    if (!steps.trigger.event?.book_data) {
      throw new Error("No book data provided in trigger event")
    }

    const { book_data } = steps.trigger.event
    const { files, images } = book_data

    if (!files?.cover || !files?.guts) {
      throw new Error("No cover or guts PDF URL provided")
    }
    if (!Array.isArray(images) || images.length === 0) {
      throw new Error("No images provided")
    }

    // Get API key from environment variables
    const apiKey = process.env.pdfrest_api_key
    if (!apiKey) {
      throw new Error("PDFRest API key not found in environment variables")
    }

    try {
      const PAGE_COUNT = steps.trigger.event.book_data.pageCount
      console.log(`Processing images for ${PAGE_COUNT}-page PDF`)

      // Sort images by page number and validate page numbers
      const validImages = images
        .filter(img => {
          // Ensure page number is between 1 and PAGE_COUNT
          if (!img.page || img.page < 1 || img.page > PAGE_COUNT) {
            console.warn(`Skipping image for page ${img.page} as it's invalid (must be between 1 and ${PAGE_COUNT})`)
            return false
          }
          return true
        })
        .sort((a, b) => a.page - b.page)

      // Log the valid images for debugging
      console.log('Valid images to process:', validImages.map(img => ({ page: img.page, url: img.imageUrl })))

      // Process valid images one at a time
      let finalResponse
      let currentPdfUrl = files.guts // Start with the initial guts PDF URL
      let lastOutputId = null // Track the last operation's output ID

      for (const imageData of validImages) {
        console.log(`Processing image for page ${imageData.page}`)

        // Create multipart form data
        const formData = new FormData()

        // For first image, use file URL. For subsequent images, use id
        if (lastOutputId === null) {
          // Get the PDF file
          const pdfResponse = await axios({
            method: 'get',
            url: currentPdfUrl,
            responseType: 'arraybuffer'
          })
          formData.append('file', Buffer.from(pdfResponse.data), 'input.pdf')
        } else {
          formData.append('id', lastOutputId)
        }

        // Get the image file
        const imageResponse = await axios({
          method: 'get',
          url: imageData.imageUrl,
          responseType: 'arraybuffer'
        })
        formData.append('image_file', Buffer.from(imageResponse.data), 'image.png')

        // Add other parameters
        formData.append('x', '0')
        formData.append('y', '0')
        formData.append('page', imageData.page.toString())
        formData.append('output', `${steps.trigger.event.book_id}_guts_${Date.now()}`)

        console.log(`Adding image to page ${imageData.page}`)
        console.log('Request data:', {
          hasFile: lastOutputId === null,
          hasId: lastOutputId !== null,
          page: imageData.page,
          imageUrl: imageData.imageUrl
        })

        const MAX_RETRIES = 3
        let attempts = 0
        let success = false
        
        while (attempts < MAX_RETRIES && !success) {
          try {
            attempts++
            const response = await axios({
              method: 'post',
              url: 'https://api.pdfrest.com/pdf-with-added-image',
              headers: {
                'Accept': 'application/json',
                'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
                'Api-Key': apiKey,
                ...formData.getHeaders()
              },
              data: formData,
              maxBodyLength: Infinity
            })

            // Check for various error conditions
            if (!response || !response.data) {
              throw new Error('Empty response from API')
            }

            if (response.status !== 200) {
              console.error('API Error Response:', response.data)
              throw new Error(`API returned status ${response.status}: ${response.data?.error || 'Unknown error'}`)
            }

            if (response.data.error) {
              console.error('API Error:', response.data)
              throw new Error(`API Error: ${response.data.error}`)
            }

            if (!response.data.outputUrl || !response.data.outputId) {
              console.error('API Response:', response.data)
              throw new Error('API response missing required output information')
            }

            // Store the output ID for next iteration
            lastOutputId = response.data.outputId
            
            console.log(`Successfully processed image for page ${imageData.page}`)
            finalResponse = response.data
            success = true

          } catch (error) {
            console.error(`Attempt ${attempts} failed:`, error.response?.data || error.message)
            if (attempts === MAX_RETRIES) {
              throw new Error(`Failed to process image for page ${imageData.page} after ${MAX_RETRIES} attempts: ${error.message}`)
            }
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts))
          }
        }
      }

      return finalResponse
    } catch (error) {
      console.error("Error in PDF generation:", error)
      throw error
    }
  }
})
