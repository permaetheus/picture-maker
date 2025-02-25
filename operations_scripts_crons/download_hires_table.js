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

async function downloadHiResImages(bookId) {
  if (!bookId) {
    console.error('Please provide a book_id')
    process.exit(1)
  }

  try {
    console.log(`Fetching hi-res image keys for book_id: ${bookId}`)
    
    // Query portraits table to get hires_image_keys for the book
    const { data: portraits, error: queryError } = await supabase
      .from('portraits')
      .select('id, hires_image_key')
      .eq('book_id', bookId)
      .not('hires_image_key', 'is', null)

    if (queryError) {
      console.error('Error querying portraits:', queryError)
      return
    }

    if (!portraits || portraits.length === 0) {
      console.log('No portraits with hi-res images found for this book')
      return
    }

    console.log(`Found ${portraits.length} portraits with hi-res images:`)
    portraits.forEach(p => console.log(` - Portrait ${p.id}: ${p.hires_image_key}`))
    console.log('\nStarting download...')

    // Create downloads directory if it doesn't exist
    const downloadDir = path.join(process.cwd(), 'downloads', `book_${bookId}`)
    fs.mkdirSync(downloadDir, { recursive: true })

    // Download each image
    for (const portrait of portraits) {
      if (!portrait.hires_image_key) continue;
      
      console.log(`\nProcessing portrait ${portrait.id}...`)
      
      // Extract just the filename from the key
      const fileName = portrait.hires_image_key.split('/').pop()
      if (!fileName) {
        console.error(`Could not extract filename from key: ${portrait.hires_image_key}`)
        continue
      }

      const { data: fileData, error: downloadError } = await supabase.storage
        .from('hires-portraits')
        .download(fileName)

      if (downloadError) {
        console.error(`Error downloading portrait ${portrait.id}:`, downloadError)
        continue
      }

      // Save the file
      const filePath = path.join(downloadDir, fileName)
      fs.writeFileSync(filePath, Buffer.from(await fileData.arrayBuffer()))
      console.log(`Downloaded: ${fileName}`)
    }

    console.log('\nDownload complete! Files saved in:', downloadDir)
  } catch (error) {
    console.error('Error:', error)
  }
}

// Get book_id from command line argument
const bookId = process.argv[2]
downloadHiResImages(bookId)