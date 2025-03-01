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
    const { files, coverImage } = book_data

    if (!files?.cover) {
      throw new Error("No cover PDF URL provided")
    }

    if (!coverImage) {
      throw new Error("No cover image URL provided in book_data")
    }

    // Get API key from environment variables
    const apiKey = process.env.pdfrest_api_key
    if (!apiKey) {
      throw new Error("PDFRest API key not found in environment variables")
    }

    try {
      // Download the cover PDF
      let pdfBuffer
      try {
        const pdfResponse = await axios({
          method: 'GET',
          url: files.cover,
          responseType: 'arraybuffer'
        })
        pdfBuffer = pdfResponse.data
      } catch (error) {
        throw new Error(`Failed to download cover PDF: ${error.message}`)
      }

      // Download the cover image from the direct coverImage URL
      let imageBuffer
      try {
        const imageResponse = await axios({
          method: 'GET',
          url: coverImage,
          responseType: 'arraybuffer'
        })
        imageBuffer = imageResponse.data
      } catch (error) {
        throw new Error(`Failed to download cover image: ${error.message}`)
      }

      // Create form data
      const formData = new FormData()
      
      // Add PDF
      formData.append('file', pdfBuffer, {
        filename: 'cover.pdf',
        contentType: 'application/pdf'
      })

      // Add image and its placement data
      // The placement data is specifically for the cover image
      formData.append('image_file', imageBuffer, {
        filename: 'cover_image.png',
        contentType: 'image/png'
      })
      formData.append('x', '853')
      formData.append('y', '188')
      formData.append('page', '1')

      // Add output filename
      const outputName = `${steps.trigger.event.book_id}_cover_${Date.now()}`
      formData.append('output', outputName)

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

          console.log('Cover PDF generation completed successfully')
          return response.data

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

    } catch (error) {
      console.error('Error in cover PDF generation:', error)
      throw error
    }
  },
})
