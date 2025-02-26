// To use any npm package on Pipedream, just import it
import axios from "axios"
import { PDFDocument, rgb } from 'pdf-lib'

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

    try {
      // Find the image with styleId 10
      const coverImage = images.find(img => img.styleId === 10)
      if (!coverImage) {
        throw new Error("No cover image found with styleId 10")
      }

      console.log("Processing cover PDF with image:", coverImage.imageUrl)

      // Download the cover PDF
      let pdfBytes
      try {
        const pdfResponse = await axios({
          method: 'GET',
          url: files.cover,
          responseType: 'arraybuffer'
        })
        pdfBytes = pdfResponse.data
      } catch (error) {
        throw new Error(`Failed to download cover PDF: ${error.message}`)
      }

      // Download the cover image
      let imageBytes
      try {
        const imageResponse = await axios({
          method: 'GET',
          url: coverImage.imageUrl,
          responseType: 'arraybuffer'
        })
        imageBytes = imageResponse.data
      } catch (error) {
        throw new Error(`Failed to download cover image: ${error.message}`)
      }

      // Load the PDF document
      const pdfDoc = await PDFDocument.load(pdfBytes)
      
      // Load the image (determine format based on URL)
      let image
      if (coverImage.imageUrl.toLowerCase().endsWith('.png')) {
        image = await pdfDoc.embedPng(imageBytes)
      } else if (coverImage.imageUrl.toLowerCase().match(/\.(jpe?g)$/i)) {
        image = await pdfDoc.embedJpg(imageBytes)
      } else {
        throw new Error('Unsupported image format. Only PNG and JPEG are supported.')
      }

      // Get the first page
      const pages = pdfDoc.getPages()
      if (pages.length === 0) {
        throw new Error('PDF has no pages')
      }
      const firstPage = pages[0]
      
      // Get page dimensions
      const { width, height } = firstPage.getSize()
      
      // Calculate dimensions to fill the page while maintaining aspect ratio
      const imgWidth = width
      const imgHeight = height
      
      // Draw the image on the page starting at position (0, 0)
      firstPage.drawImage(image, {
        x: 0,
        y: 0,
        width: imgWidth,
        height: imgHeight,
      })

      // Save the PDF
      const modifiedPdfBytes = await pdfDoc.save()
      
      // Create a Base64 string of the PDF
      const base64String = Buffer.from(modifiedPdfBytes).toString('base64')
      
      // Generate a unique name for the output
      const outputName = `${steps.trigger.event.book_id}_cover_${Date.now()}.pdf`
      
      console.log('Cover PDF generation completed successfully')
      
      // Return data in a similar format to the API response
      return {
        success: true,
        outputId: outputName,
        outputUrl: `data:application/pdf;base64,${base64String}`,
        pdfBytes: modifiedPdfBytes // Include binary data if needed downstream
      }

    } catch (error) {
      console.error('Error in cover PDF generation:', error)
      throw error
    }
  },
})