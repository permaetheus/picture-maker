import { axios } from "@pipedream/platform"

export default defineComponent({
  props: {
    supabase: {
      type: "app",
      app: "supabase",
    }
  },
  async run({steps, $}) {
    // Validate trigger and book_id
    if (!steps.trigger?.event) {
      throw new Error("Trigger event is missing")
    }

    const bookId = steps.trigger.event.book_id
    if (!bookId || !Number.isInteger(Number(bookId)) || bookId <= 0) {
      throw new Error(`Invalid book_id: ${bookId}. Must be a positive integer.`)
    }

    console.log(`Processing book ID: ${bookId}`)

    // Validate Supabase credentials
    if (!this.supabase?.$auth?.subdomain || !this.supabase?.$auth?.service_key) {
      throw new Error("Missing Supabase credentials")
    }

    const baseURL = `https://${this.supabase.$auth.subdomain}.supabase.co/rest/v1`
    const headers = {
      Authorization: `Bearer ${this.supabase.$auth.service_key}`,
      "apikey": `${this.supabase.$auth.service_key}`,
      "Content-Type": "application/json"
    }

    try {
      // Get book and recipient information
      console.log("Fetching book and recipient data...")
      const bookQuery = `books?id=eq.${bookId}&select=recipient_id,recipients(name,message)`
      const bookData = await axios($, {
        url: `${baseURL}/${bookQuery}`,
        headers
      })

      // Add query for book_skus data
      console.log("Fetching book_skus data...")
      const bookSkusData = await axios($, {
        url: `${baseURL}/book_skus?id=eq.1`,
        headers
      })

      console.log("Book skus data received:", JSON.stringify(bookSkusData, null, 2))

      if (!bookSkusData.length) {
        throw new Error("No book_skus data found")
      }

      if (!bookData.length) {
        throw new Error(`No book found with ID ${bookId}`)
      }

      // Validate recipient data
      if (!bookData[0].recipients) {
        throw new Error(`No recipient found for book ID ${bookId}`)
      }

      const { name, message } = bookData[0].recipients
      if (!name) {
        throw new Error(`Missing required recipient name for book ID ${bookId}`)
      }

      console.log("Recipient data:", { name, message })

      // Get portraits with style information and resized image keys
      console.log("Fetching portrait data...")
      const portraitsQuery = `portraits?book_id=eq.${bookId}&select=resized_hires_image_key,style_id,artist_styles(page)&order=created_at.asc`
      const portraitData = await axios($, {
        url: `${baseURL}/${portraitsQuery}`,
        headers
      })

      console.log("Raw portrait data:", JSON.stringify(portraitData, null, 2))

      if (!portraitData.length) {
        throw new Error(`No portraits found for book ID ${bookId}`)
      }

      // Format and validate the response
      console.log("Processing portraits...")
      const images = portraitData
        .filter(portrait => {
          // Log each portrait being processed
          console.log("Processing portrait:", {
            hasImage: !!portrait.resized_hires_image_key,
            styleId: portrait.style_id,
            page: portrait.artist_styles?.page
          })

          // Validate each portrait has required data
          if (!portrait.resized_hires_image_key) {
            console.warn(`Portrait missing resized_hires_image_key for book ${bookId}`)
            return false
          }
          if (!portrait.style_id) {
            console.warn(`Portrait missing style_id for book ${bookId}`)
            return false
          }
          if (!portrait.artist_styles?.page) {
            console.warn(`Portrait style missing page number for book ${bookId}, style_id: ${portrait.style_id}`)
            return false
          }
          return true
        })
        .map(portrait => ({
          imageUrl: portrait.resized_hires_image_key,
          styleId: portrait.style_id,
          page: portrait.artist_styles.page
        }))

      console.log("Processed images:", JSON.stringify(images, null, 2))

      if (images.length === 0) {
        throw new Error(`No valid portrait images found for book ID ${bookId}`)
      }

      // Detailed page number analysis
      const pages = images.map(img => img.page)
      console.log("Page numbers:", pages)

      // Find duplicate pages
      const pageCount = pages.reduce((acc, page) => {
        acc[page] = (acc[page] || 0) + 1
        return acc
      }, {})

      console.log("Page number counts:", pageCount)

      // Log any duplicates found
      const duplicates = Object.entries(pageCount)
        .filter(([page, count]) => count > 1)
        .map(([page, count]) => `Page ${page} appears ${count} times`)

      if (duplicates.length > 0) {
        console.log("Duplicate pages found:", duplicates)
        throw new Error(
          `Duplicate page numbers found for book ID ${bookId}. Details: ${duplicates.join(", ")}`
        )
      }

      const response = {
        recipient: {
          name,
          message: message || "" // Handle null message by providing empty string
        },
        images,
        files: {
          guts: bookSkusData[0].file_guts || "",
          cover: bookSkusData[0].file_cover || ""
        },
        pageCount: bookSkusData[0].page_count_guts || 0  // Add the page count from book_skus
      }

      // Log final response
      console.log("Final response:", JSON.stringify(response, null, 2))

      return response

    } catch (error) {
      // Enhanced error handling with context
      const errorMessage = error.response?.data?.message || error.message
      const statusCode = error.response?.status
      
      console.error("Error details:", {
        message: errorMessage,
        status: statusCode,
        bookId,
        fullError: error
      })
      
      throw new Error(
        `Failed to process book ID ${bookId}: ${errorMessage}` +
        (statusCode ? ` (Status: ${statusCode})` : '')
      )
    }
  },
})