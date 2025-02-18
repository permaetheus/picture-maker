import { axios } from "@pipedream/platform"

export default defineComponent({
  props: {
    supabase: {
      type: "app",
      app: "supabase",
    }
  },
  async run({steps, $}) {
    const coverPdfUrl = steps.trigger.event.cover
    const gutsPdfUrl = steps.trigger.event.guts
    const bookId = steps.trigger.event.book_id

    if (!coverPdfUrl || !gutsPdfUrl) {
      throw new Error('Missing PDF URLs in trigger event')
    }

    console.log('Attempting to fetch PDFs from:')
    console.log('Cover:', coverPdfUrl)
    console.log('Guts:', gutsPdfUrl)

    // Fetch the PDFs from the URLs
    let coverPDF, gutsPDF
    try {
      // Fetch cover PDF with binary handling
      const coverResponse = await fetch(coverPdfUrl, {
        method: 'GET',
        headers: {
          'Accept': '*/*'  // Accept any content type
        }
      })
      
      if (!coverResponse.ok) {
        throw new Error(`Cover fetch failed with status ${coverResponse.status}`)
      }

      // Get the binary data as an ArrayBuffer and convert to Buffer
      const coverArrayBuffer = await coverResponse.arrayBuffer()
      coverPDF = Buffer.from(coverArrayBuffer)
      
      console.log('Cover PDF size:', coverPDF.length)
      console.log('Cover content type:', coverResponse.headers.get('content-type'))

      // Fetch guts PDF with binary handling
      const gutsResponse = await fetch(gutsPdfUrl, {
        method: 'GET',
        headers: {
          'Accept': '*/*'  // Accept any content type
        }
      })
      
      if (!gutsResponse.ok) {
        throw new Error(`Guts fetch failed with status ${gutsResponse.status}`)
      }

      // Get the binary data as an ArrayBuffer and convert to Buffer
      const gutsArrayBuffer = await gutsResponse.arrayBuffer()
      gutsPDF = Buffer.from(gutsArrayBuffer)
      
      console.log('Guts PDF size:', gutsPDF.length)
      console.log('Guts content type:', gutsResponse.headers.get('content-type'))

    } catch (error) {
      console.error('Error fetching PDFs:', error)
      throw error
    }

    // Validate we got actual PDF data
    if (!coverPDF?.length || !gutsPDF?.length) {
      throw new Error(`PDF files are empty. Cover size: ${coverPDF?.length || 0}, Guts size: ${gutsPDF?.length || 0}`)
    }

    // Get the IDs from the trigger event
    const coverOutputId = steps.trigger.event.cover_raw.outputId
    const gutsOutputId = steps.trigger.event.guts_raw.outputId

    // Generate timestamp
    const timestamp = Date.now()

    // Create filenames with new format
    const coverFileName = `${bookId}_cover_pdfrest${coverOutputId}_${timestamp}.pdf`
    const gutsFileName = `${bookId}_guts_pdfrest${gutsOutputId}_${timestamp}.pdf`

    // Log the generated filenames
    console.log('Generated cover filename:', coverFileName)
    console.log('Generated guts filename:', gutsFileName)

    // Upload cover PDF to Supabase
    let coverResponse, gutsResponse
    try {
      console.log('Attempting to upload cover PDF to Supabase...')
      console.log('Upload URL:', `https://${this.supabase.$auth.subdomain}.supabase.co/storage/v1/object/finalized_pdf_forprint/${coverFileName}`)
      
      // Log the first few bytes of the PDF to verify content
      console.log('First 20 bytes of cover PDF:', coverPDF.slice(0, 20))
      
      const coverResult = await axios($, {
        method: 'POST',
        url: `https://${this.supabase.$auth.subdomain}.supabase.co/storage/v1/object/finalized_pdf_forprint/${coverFileName}`,
        headers: {
          'Authorization': `Bearer ${this.supabase.$auth.service_key}`,
          'Content-Type': 'application/octet-stream',
        },
        // Send the raw buffer directly
        data: coverPDF,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        // Prevent any data transformation
        transformRequest: [(data) => data]
      })

      coverResponse = coverResult
      console.log('Cover upload response:', coverResult)

      if (!coverResult?.Key && !coverResult?.data?.Key) {
        throw new Error('Upload failed - no Key in response')
      }
      
      console.log('Cover upload successful')
    } catch (error) {
      console.error('Cover upload error details:', {
        message: error.message,
        data: error.response?.data || error,
        status: error.response?.status,
        headers: error.response?.headers
      })
      throw error
    }

    // Upload guts PDF to Supabase
    try {
      console.log('Attempting to upload guts PDF to Supabase...')
      
      // Log the first few bytes of the PDF to verify content
      console.log('First 20 bytes of guts PDF:', gutsPDF.slice(0, 20))
      
      const gutsResult = await axios($, {
        method: 'POST',
        url: `https://${this.supabase.$auth.subdomain}.supabase.co/storage/v1/object/finalized_pdf_forprint/${gutsFileName}`,
        headers: {
          'Authorization': `Bearer ${this.supabase.$auth.service_key}`,
          'Content-Type': 'application/octet-stream',
        },
        // Send the raw buffer directly
        data: gutsPDF,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        // Prevent any data transformation
        transformRequest: [(data) => data]
      })

      gutsResponse = gutsResult
      console.log('Guts upload response:', gutsResult)

      if (!gutsResult?.Key && !gutsResult?.data?.Key) {
        throw new Error('Upload failed - no Key in response')
      }
      
      console.log('Guts upload successful')
    } catch (error) {
      console.error('Guts upload error details:', {
        message: error.message,
        data: error.response?.data || error,
        status: error.response?.status,
        headers: error.response?.headers
      })
      throw error
    }

    // Construct the public URLs
    const coverStorageUrl = `https://${this.supabase.$auth.subdomain}.supabase.co/storage/v1/object/public/finalized_pdf_forprint/${coverFileName}`
    const gutsStorageUrl = `https://${this.supabase.$auth.subdomain}.supabase.co/storage/v1/object/public/finalized_pdf_forprint/${gutsFileName}`

    // Update the books table with the PDF URLs
    try {
      await axios($, {
        method: 'PATCH',
        url: `https://${this.supabase.$auth.subdomain}.supabase.co/rest/v1/books?id=eq.${bookId}`,
        headers: {
          'Authorization': `Bearer ${this.supabase.$auth.service_key}`,
          'apikey': this.supabase.$auth.service_key,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        data: {
          cover_pdf_key: coverStorageUrl,
          guts_pdf_key: gutsStorageUrl
        }
      })

      // If we get here, the update succeeded (no error was thrown)
      console.log('Database update completed successfully')

      return {
        coverUpload: (coverResponse?.Key || coverResponse?.data?.Key) ? 'success' : 'failed',
        gutsUpload: (gutsResponse?.Key || gutsResponse?.data?.Key) ? 'success' : 'failed',
        dbUpdate: 'success',  // If no error was thrown, consider it successful
        coverUrl: coverStorageUrl,
        gutsUrl: gutsStorageUrl,
        coverSize: coverPDF.length,
        gutsSize: gutsPDF.length
      }
    } catch (error) {
      console.error('Database update error:', error)
      return {
        coverUpload: (coverResponse?.Key || coverResponse?.data?.Key) ? 'success' : 'failed',
        gutsUpload: (gutsResponse?.Key || gutsResponse?.data?.Key) ? 'success' : 'failed',
        dbUpdate: 'failed',
        coverUrl: coverStorageUrl,
        gutsUrl: gutsStorageUrl,
        coverSize: coverPDF.length,
        gutsSize: gutsPDF.length
      }
    }
  },
})
