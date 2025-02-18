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
      // Get orders with all books ready and shipping info
      const { data: orders, error } = await axios($, {
        url: `https://${this.supabase.$auth.subdomain}.supabase.co/rest/v1/shopify_orders`,
        headers: {
          Authorization: `Bearer ${this.supabase.$auth.service_key}`,
          "apikey": `${this.supabase.$auth.service_key}`,
          "Prefer": "return=representation"
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

      if (error) throw error
      if (!orders || orders.length === 0) {
        return {
          ready_orders: [],
          message: "No orders found"
        }
      }

      // Filter orders where all books are ready
      const readyOrders = orders.filter(order => {
        return order.order_items?.length > 0 && 
               order.order_items.every(item => item.books?.status === 'R')
      })

      if (readyOrders.length === 0) {
        return {
          ready_orders: [],
          message: "No orders with all books ready"
        }
      }

      // Format the output
      const formattedOrders = readyOrders.map(order => {
        const shippingAddress = order.shipping_addresses?.[0]
        return {
          order_sb_id: order.shopify_orders_sb_id,
          shopify_order_id: order.shopify_order_id,
          shipping_address: shippingAddress ? {
            name: shippingAddress.name,
            address_line1: shippingAddress.address_line1,
            address_line2: shippingAddress.address_line2 || "", // Handle null address_line2
            city: shippingAddress.city,
            state: shippingAddress.state,
            postal_code: shippingAddress.postal_code,
            country_code: shippingAddress.country_code
          } : null,
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