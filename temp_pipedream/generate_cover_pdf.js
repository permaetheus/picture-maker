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

    if (!files?.cover) {
      throw new Error("No cover PDF URL provided")
    }

    // Get API key from environment variables
    const apiKey = process.env.pdfrest_api_key
    if (!apiKey) {
      throw new Error("PDFRest API key not found in environment variables")
    }

    try {
      // Find the image with styleId 10
      const coverImage = images.find(img => img.styleId === 10)
      if (!coverImage) {
        throw new Error("No cover image found with styleId 10")
      }

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

      // Download the cover image
      let imageBuffer
      try {
        const imageResponse = await axios({
          method: 'GET',
          url: coverImage.imageUrl,
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
      formData.append('image_file', imageBuffer, {
        filename: 'cover_image.png',
        contentType: 'image/png'
      })
      formData.append('x', '0')
      formData.append('y', '0')
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
          if (!response.data) {
            throw new Error('Empty response from API')
          }

          if (response.data.error) {
            throw new Error(`API Error: ${response.data.error}`)
          }

          if (!response.data.outputUrl || !response.data.outputId) {
            throw new Error(`Invalid response format: ${JSON.stringify(response.data)}`)
          }

          console.log('Cover PDF generation completed successfully')
          return response.data

        } catch (error) {
          console.error(`Attempt ${attempts} failed:`, error.response?.data || error)
          
          if (attempts === MAX_RETRIES) {
            throw new Error(`Failed to generate cover PDF after ${MAX_RETRIES} attempts: ${error.message}`)
          }
          
          // Wait before retrying (exponential backoff)
          const delay = Math.min(1000 * Math.pow(2, attempts), 10000)
          console.log(`Retrying in ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }

    } catch (error) {
      console.error('Error in cover PDF generation:', error)
      throw error
    }
  },
})
