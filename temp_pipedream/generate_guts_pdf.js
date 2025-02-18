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
      // Download the guts PDF
      let currentPdfBuffer
      try {
        const pdfResponse = await axios({
          method: 'GET',
          url: files.guts,
          responseType: 'arraybuffer'
        })
        currentPdfBuffer = pdfResponse.data
      } catch (error) {
        throw new Error(`Failed to download guts PDF: ${error.message}`)
      }

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
      for (const imageData of validImages) {
        console.log(`Processing image for page ${imageData.page}`)
        
        // Download the image
        let imageBuffer
        try {
          const imageResponse = await axios({
            method: 'GET',
            url: imageData.imageUrl,
            responseType: 'arraybuffer'
          })
          imageBuffer = imageResponse.data
        } catch (error) {
          console.error('Error downloading image:', error)
          if (error.response) {
            throw new Error(`Failed to download image for page ${imageData.page}: ${error.response.data?.error || error.response.statusText}`)
          } else if (error.request) {
            throw new Error(`Failed to download image for page ${imageData.page}: No response received`)
          } else {
            throw new Error(`Failed to download image for page ${imageData.page}: ${error.message}`)
          }
        }

        // Create form data for this image
        const formData = new FormData()
        
        // Add current PDF
        formData.append('file', currentPdfBuffer, {
          filename: 'current.pdf',
          contentType: 'application/pdf'
        })

        // Ensure page number is sent as a string to the API
        const pageNumber = imageData.page.toString()

        // Add single image and its placement data
        formData.append('image_file', imageBuffer, {
          filename: `image_${pageNumber}.png`,
          contentType: 'image/png'
        })
        formData.append('x', '0')
        formData.append('y', '0')
        formData.append('page', pageNumber)

        // Add output filename
        const outputName = `${steps.trigger.event.book_id}_guts_${Date.now()}`
        formData.append('output', outputName)

        console.log(`Adding image to page ${imageData.page}`)

        const MAX_RETRIES = 3
        let attempts = 0
        
        while (attempts < MAX_RETRIES) {
          try {
            attempts++
            const response = await axios({
              method: 'post',
              url: 'https://api.pdfrest.com/pdf-with-added-image',
              headers: {
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

            // Check for API error responses
            if (response.status !== 200) {
              throw new Error(`API returned status ${response.status}: ${response.data?.error || 'Unknown error'}`)
            }

            if (response.data.error) {
              throw new Error(`API Error: ${response.data.error}`)
            }

            // Check for missing output URL/ID
            if (!response.data.outputUrl || !response.data.outputId) {
              throw new Error('API response missing required output information')
            }

            console.log(`Successfully processed image for page ${imageData.page}`)
            finalResponse = response.data
            break // Success - exit retry loop

          } catch (error) {
            // Log the full error for debugging
            console.error('PDF processing error:', error)

            // Handle specific axios errors
            if (error.response) {
              // The request was made and the server responded with a status code
              // that falls out of the range of 2xx
              const errorMessage = error.response.data?.error || error.response.statusText
              if (error.response.status === 401) {
                throw new Error(`Authentication failed: ${errorMessage}`)
              } else if (error.response.status === 400) {
                throw new Error(`Invalid request: ${errorMessage}`)
              } else {
                if (attempts < MAX_RETRIES) {
                  console.log(`Attempt ${attempts} failed, retrying...`)
                  continue
                }
                throw new Error(`API error (${error.response.status}): ${errorMessage}`)
              }
            } else if (error.request) {
              // The request was made but no response was received
              if (attempts < MAX_RETRIES) {
                console.log(`Attempt ${attempts} failed, retrying...`)
                continue
              }
              throw new Error('No response received from API')
            } else {
              // Something happened in setting up the request
              throw new Error(`Request setup error: ${error.message}`)
            }
          }
        }
      }

      console.log('PDF generation completed successfully')
      return finalResponse

    } catch (error) {
      console.error('Error in PDF generation:', error)
      throw error
    }
  },
})
