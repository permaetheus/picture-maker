import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

// Add debug logging
console.log('Supabase URL:', process.env.SUPABASE_URL ? 'Found' : 'Missing')
console.log('Using Service Role Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Found' : 'Missing')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false
    }
  }
)

/**
 * Downloads all high-resolution images for a specific book from Supabase storage
 * @param {string} bookId - The ID of the book whose images we want to download
 */
async function downloadHiResImages(bookId) {
  // Validate input
  if (!bookId) {
    console.error('Please provide a book_id')
    process.exit(1)
  }

  try {
    console.log(`Searching for images for book_id: ${bookId}`)
    
    // Query Supabase storage to list all files that match our book_id prefix
    // Limit set to 1000 files, adjust if needed
    const { data: files, error: listError } = await supabase
      .storage
      .from('hires-portraits')
      .list('', {
        limit: 1000,
        search: `${bookId}_`  // Search for files starting with bookId_
      })

    // Handle any errors from the list operation
    if (listError) {
      console.error('Error listing files:', listError)
      return
    }

    // Check if we found any matching files
    if (!files || files.length === 0) {
      console.log('No high-res images found for this book')
      return
    }

    console.log(`Found ${files.length} high-res images. Starting download...`)

    // Create directory structure for downloads
    // Format: ./downloads/book_[bookId]/
    const downloadDir = path.join(process.cwd(), 'downloads', `book_${bookId}`)
    fs.mkdirSync(downloadDir, { recursive: true })

    // Iterate through each file and download it
    for (const file of files) {
      console.log(`Processing file: ${file.name}`)
      
      // Download the file from Supabase storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('hires-portraits')
        .download(file.name)

      // Handle any download errors
      if (downloadError) {
        console.error(`Error downloading file ${file.name}:`, downloadError)
        continue  // Skip to next file if this one fails
      }

      // Save the downloaded file to local filesystem
      const filePath = path.join(downloadDir, file.name)
      fs.writeFileSync(filePath, Buffer.from(await fileData.arrayBuffer()))
      console.log(`Downloaded: ${file.name}`)
    }

    console.log('Download complete! Files saved in:', downloadDir)
  } catch (error) {
    console.error('Error:', error)
  }
}

// Get book_id from command line argument
const bookId = process.argv[2]
downloadHiResImages(bookId)