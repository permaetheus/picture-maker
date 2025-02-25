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
      // Log the API request details
      const apiUrl = `https://${this.supabase.$auth.subdomain}.supabase.co/rest/v1/shopify_orders`
      
      // Debug connection details
      console.log("Debug Info:")
      console.log("- API URL:", apiUrl)
      console.log("- Supabase Auth:", {
        hasServiceKey: !!this.supabase.$auth.service_key,
        subdomain: this.supabase.$auth.subdomain
      })

      // Make the request with detailed error handling
      const response = await axios($, {
        url: apiUrl,
        headers: {
          Authorization: `Bearer ${this.supabase.$auth.service_key}`,
          "apikey": `${this.supabase.$auth.service_key}`,
          "Prefer": "return=representation",
          "Content-Type": "application/json"
        },
        params: {
          select: `
            shopify_orders_sb_id,
            shopify_order_id,
            order_items(
              quantity,
              book_id,
              books(
                id,
                status
              )
            ),
            shipping_addresses(
              name,
              address_line1,
              address_line2,
              city,
              state,
              postal_code,
              country_code
            )
          `
        }
      })

      console.log("Response data:", JSON.stringify(response.data, null, 2))

      const orders = response.data
      
      if (!orders || orders.length === 0) {
        console.log("No orders found in database")
        return {
          ready_orders: [],
          message: "No orders found in database"
        }
      }

      // Track orders with missing requirements for better error reporting
      const ordersWithoutShipping = []
      const ordersWithIncompleteShipping = []
      const ordersWithNonReadyBooks = []

      // Filter orders where all books are ready and shipping is complete
      const readyOrders = orders.filter(order => {
        console.log(`\nChecking order ${order.shopify_orders_sb_id}:`)
        
        // Check for order items
        if (!order.order_items || order.order_items.length === 0) {
          console.log(`Order ${order.shopify_orders_sb_id} skipped: No order items`)
          return false
        }

        // Check for shipping address
        if (!order.shipping_addresses || order.shipping_addresses.length === 0) {
          console.log(`Order ${order.shopify_orders_sb_id} skipped: No shipping address`)
          ordersWithoutShipping.push(order.shopify_orders_sb_id)
          return false
        }

        // Validate shipping address has required fields
        const shippingAddress = order.shipping_addresses[0]
        const requiredFields = ['name', 'address_line1', 'city', 'state', 'postal_code', 'country_code']
        const missingFields = requiredFields.filter(field => !shippingAddress[field])
        
        if (missingFields.length > 0) {
          console.log(`Order ${order.shopify_orders_sb_id} skipped: Missing shipping fields: ${missingFields.join(', ')}`)
          ordersWithIncompleteShipping.push({
            id: order.shopify_orders_sb_id,
            missingFields
          })
          return false
        }

        // Check book statuses
        console.log("Order items:", order.order_items)
        
        const nonReadyBooks = order.order_items.filter(item => {
          if (!item.books) {
            console.log(`Book ${item.book_id} skipped: No book data`)
            return true
          }
          console.log(`Book ${item.book_id} status: ${item.books?.status}`)
          return item.books.status !== 'R'
        })

        if (nonReadyBooks.length > 0) {
          console.log(`Order ${order.shopify_orders_sb_id} skipped: Books not ready: ${nonReadyBooks.map(item => item.book_id).join(', ')}`)
          ordersWithNonReadyBooks.push({
            id: order.shopify_orders_sb_id,
            bookIds: nonReadyBooks.map(item => item.book_id)
          })
          return false
        }
        
        console.log(`Order ${order.shopify_orders_sb_id} is ready for processing`)
        return true
      })

      // If we have orders with issues, throw an error with details
      if (ordersWithoutShipping.length > 0 || 
          ordersWithIncompleteShipping.length > 0 || 
          ordersWithNonReadyBooks.length > 0) {
        throw new Error(JSON.stringify({
          message: "Found orders with issues",
          details: {
            ordersWithoutShipping,
            ordersWithIncompleteShipping,
            ordersWithNonReadyBooks
          }
        }, null, 2))
      }

      if (readyOrders.length === 0) {
        return {
          ready_orders: [],
          message: "No orders with all requirements met (books ready, valid shipping info)"
        }
      }

      // Format the output
      const formattedOrders = readyOrders.map(order => {
        const shippingAddress = order.shipping_addresses[0]
        return {
          order_sb_id: order.shopify_orders_sb_id,
          shopify_order_id: order.shopify_order_id,
          shipping_address: {
            name: shippingAddress.name,
            address_line1: shippingAddress.address_line1,
            address_line2: shippingAddress.address_line2 || "",
            city: shippingAddress.city,
            state: shippingAddress.state,
            postal_code: shippingAddress.postal_code,
            country_code: shippingAddress.country_code
          },
          books: order.order_items.map(item => ({
            book_id: item.book_id,
            quantity: item.quantity
          }))
        }
      })

      return {
        ready_orders: formattedOrders,
        message: `Found ${formattedOrders.length} orders ready for processing`
      }

    } catch (err) {
      console.error("Error fetching orders:", err)
      throw new Error(`Failed to fetch orders: ${err.message}`)
    }
  },
})