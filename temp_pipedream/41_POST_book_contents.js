import axios from "axios"

export default defineComponent({
  async run({ steps, $ }) {
    const book_ids = steps.poll_for_books.$return_value.book_ids

    // Return early if no books
    if (!book_ids || !book_ids.length) {
      console.log('No books to process')
      return []
    }

    console.log(`Processing ${book_ids.length} books`)
    
    // Process each book ID sequentially 
    const results = []
    for (const book_id of book_ids) {
      try {
        console.log(`Processing book ID: ${book_id}`)
        const { data } = await axios({
          method: 'POST',
          url: 'https://eo7awzdscger8oc.m.pipedream.net',
          headers: {
            Authorization: 'Bearer collate-data',
            'Content-Type': 'application/json'
          },
          data: {
            book_id: book_id
          }
        })
        results.push(data)
        console.log(`Successfully processed book ID ${book_id}`)
      } catch (err) {
        console.error(`Error posting book ID ${book_id}:`, err.message)
      }
    }

    return results
  }
})