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

    if (!files?.guts) {
      throw new Error("No guts PDF URL provided")
    }
    if (!Array.isArray(images) || images.length === 0) {
      throw new Error("No images provided")
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

      // Download the guts PDF
      let pdfBytes
      try {
        const pdfResponse = await axios({
          method: 'GET',
          url: files.guts,
          responseType: 'arraybuffer'
        })
        pdfBytes = pdfResponse.data
      } catch (error) {
        throw new Error(`Failed to download guts PDF: ${error.message}`)
      }

      // Load the PDF document
      let pdfDoc = await PDFDocument.load(pdfBytes)
      
      // Process images one at a time to manage memory
      for (const imageData of validImages) {
        console.log(`Processing image for page ${imageData.page}`)

        try {
          // Download the image
          const imageResponse = await axios({
            method: 'GET',
            url: imageData.imageUrl,
            responseType: 'arraybuffer'
          })
          const imageBytes = imageResponse.data
          
          // Load the image (determine format based on URL)
          let image
          if (imageData.imageUrl.toLowerCase().endsWith('.png')) {
            image = await pdfDoc.embedPng(imageBytes)
          } else if (imageData.imageUrl.toLowerCase().match(/\.(jpe?g)$/i)) {
            image = await pdfDoc.embedJpg(imageBytes)
          } else {
            console.warn(`Skipping image for page ${imageData.page}: Unsupported format`)
            continue
          }
          
          // Get the specified page (adjusting for 0-based indexing in PDF-lib)
          const pageIndex = imageData.page - 1
          if (pageIndex >= pdfDoc.getPageCount()) {
            console.warn(`Page ${imageData.page} doesn't exist in the PDF (total pages: ${pdfDoc.getPageCount()})`)
            continue
          }
          
          const page = pdfDoc.getPage(pageIndex)
          
          // Get page dimensions
          const { width, height } = page.getSize()
          
          // Draw the image on the page starting at position (0, 0)
          page.drawImage(image, {
            x: 0,
            y: 0,
            width: width,
            height: height,
          })
          
          console.log(`Successfully added image to page ${imageData.page}`)
          
        } catch (error) {
          console.error(`Error processing image for page ${imageData.page}:`, error)
          throw new Error(`Failed to process image for page ${imageData.page}: ${error.message}`)
        }
      }

      // Save the PDF
      const modifiedPdfBytes = await pdfDoc.save()
      
      // Create a Base64 string of the PDF for returning
      const base64String = Buffer.from(modifiedPdfBytes).toString('base64')
      
      // Generate a unique name for the output
      const outputName = `${steps.trigger.event.book_id}_guts_${Date.now()}.pdf`
      
      console.log('Guts PDF generation completed successfully')
      
      // Return data in a similar format to the API response
      return {
        success: true,
        outputId: outputName,
        outputUrl: `data:application/pdf;base64,${base64String}`,
        pdfBytes: modifiedPdfBytes // Include binary data if needed downstream
      }
      
    } catch (error) {
      console.error("Error in PDF generation:", error)
      throw error
    }
  }
})