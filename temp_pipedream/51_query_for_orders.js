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
      // First get all orders with status "N"
      console.log('Querying Supabase for orders with status "N"...')
      
      const orders = await axios($, {
        method: 'GET',
        url: `https://${this.supabase.$auth.subdomain}.supabase.co/rest/v1/shopify_orders`,
        headers: {
          Authorization: `Bearer ${this.supabase.$auth.service_key}`,
          "apikey": `${this.supabase.$auth.service_key}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation"
        },
        params: {
          select: 'shopify_orders_sb_id,shopify_order_number,shopify_order_id,status,metadata,customer_email,created_at,order_items(book_id,books(status))',
          status: 'eq.N',
          order: 'created_at.desc'
        }
      })

      // Log the raw response for debugging
      console.log('Raw response:', JSON.stringify(orders, null, 2))

      // Ensure we have orders before filtering
      if (!orders || !Array.isArray(orders)) {
        console.log('No orders found with status "N"')
        return []
      }

      console.log(`Found ${orders.length} orders with status "N"`)

      // Log each order's books status
      orders.forEach((order) => {
        console.log(`\nOrder ${order.shopify_order_number}:`)
        console.log('Order items count:', order.order_items?.length || 0)
        order.order_items?.forEach((item) => {
          console.log(`- Book ${item.book_id} status:`, item.books?.status)
        })
      })

      // Filter orders to only include those where all books have status "R"
      const filteredOrders = orders.filter(order => {
        // Skip orders with no items
        if (!order.order_items?.length) {
          console.log(`Order ${order.shopify_order_number} skipped - no items`)
          return false
        }
        
        const hasAllBooksReady = order.order_items.every(item => item.books?.status === 'R')
        
        if (hasAllBooksReady) {
          console.log(`Order ${order.shopify_order_number} - ALL BOOKS READY`)
        } else {
          console.log(`Order ${order.shopify_order_number} - Not all books ready`)
        }
        
        return hasAllBooksReady
      })

      console.log('\nFinal filtered orders count:', filteredOrders.length)
      if (filteredOrders.length > 0) {
        console.log('Ready orders:', filteredOrders.map(o => o.shopify_order_number).join(', '))
      }
      
      return filteredOrders

    } catch (error) {
      console.error('Error:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response,
        status: error.status
      })
      throw error
    }
  },
})
