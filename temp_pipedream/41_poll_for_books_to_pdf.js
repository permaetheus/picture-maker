// This code is designed to run on Pipedream.com and processes proof status updates from the proofing software


import { axios } from "@pipedream/platform"

export default defineComponent({
  props: {
    supabase: {
      type: "app", 
      app: "supabase",
    }
  },
  async run({steps, $}) {
    try {
      const response = await axios($, {
        url: `https://${this.supabase.$auth.subdomain}.supabase.co/rest/v1/books`,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.supabase.$auth.service_key}`,
          "apikey": `${this.supabase.$auth.service_key}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation"
        },
        params: {
          select: '*,portraits(*),recipient:recipients(*)',
          status: 'eq.N'
        }
      })

      // The response itself is the data array in Pipedream's axios
      const books = Array.isArray(response) ? response : []
      console.log('Number of books found:', books.length)

      if (books.length === 0) {
        console.log('No books found with status N')
        return { book_ids: [] }
      }

      // Log the first book's complete structure
      if (books[0]) {
        console.log('First book structure:', JSON.stringify(books[0], null, 2))
      }

      const booksWithPortraits = books.filter(book => {
        console.log(`Book ${book.id} portraits:`, book.portraits)
        return book.portraits?.length > 0
      })
      console.log(`Books with portraits: ${booksWithPortraits.length}`)
      
      const book_ids = booksWithPortraits
        .filter(book => {
          const hasAllPortraits = book.portraits.every(p => p.hires_image_key && p.hires_image_key !== '')
          if (!hasAllPortraits) {
            console.log(`Book ${book.id} filtered out - missing hires_image_key`)
            console.log('Portraits:', JSON.stringify(book.portraits, null, 2))
          }
          return hasAllPortraits
        })
        .map(book => book.id)

      console.log(`Final books with complete portraits: ${book_ids.length}`)
      console.log(`Found ${book_ids.length} books with status N and complete portraits`)
      return { book_ids }

    } catch (error) {
      console.error('Error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      })
      return { book_ids: [] }
    }
  },
})