const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')
const https = require('https')

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

// Helper function to download a file from a URL
function downloadFile(url, filePath) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(filePath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });

      fileStream.on('error', (err) => {
        fs.unlink(filePath, () => {}); // Delete the file if there's an error
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function downloadPortraits(bookId) {
  if (!bookId) {
    console.error('Please provide a book_id')
    process.exit(1)
  }

  try {
    console.log(`Fetching portrait images for book_id: ${bookId}`)
    
    // Query portraits table to get image_keys for the book
    const { data: portraits, error: queryError } = await supabase
      .from('portraits')
      .select('id, image_key')
      .eq('book_id', bookId)
      .not('image_key', 'is', null)

    if (queryError) {
      console.error('Error querying portraits:', queryError)
      return
    }

    if (!portraits || portraits.length === 0) {
      console.log('No portraits with images found for this book')
      return
    }

    console.log(`Found ${portraits.length} portraits with images:`)
    portraits.forEach(p => console.log(` - Portrait ${p.id}: ${p.image_key}`))
    console.log('\nStarting download...')

    // Create downloads directory if it doesn't exist
    const downloadDir = path.join(process.cwd(), 'downloads', `book_${bookId}`)
    fs.mkdirSync(downloadDir, { recursive: true })

    // Download each image
    for (const portrait of portraits) {
      if (!portrait.image_key) continue;
      
      console.log(`\nProcessing portrait ${portrait.id}...`)
      
      // Extract just the filename from the key
      const fileName = portrait.image_key.split('/').pop()
      if (!fileName) {
        console.error(`Could not extract filename from key: ${portrait.image_key}`)
        continue
      }

      // Since image_key is a full URL, download directly from that URL
      const filePath = path.join(downloadDir, `${portrait.id}_${fileName}`)
      
      try {
        await downloadFile(portrait.image_key, filePath)
        console.log(`Downloaded: ${fileName}`)
      } catch (error) {
        console.error(`Error downloading portrait ${portrait.id}:`, error.message)
      }
    }

    console.log('\nDownload complete! Files saved in:', downloadDir)
  } catch (error) {
    console.error('Error:', error)
  }
}

// Get book_id from command line argument
const bookId = process.argv[2]
downloadPortraits(bookId) 