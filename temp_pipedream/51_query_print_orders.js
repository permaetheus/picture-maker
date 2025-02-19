import { axios } from "@pipedream/platform"

export default defineComponent({
  async run({ steps, $ }) {
    try {
      const orders = steps.query_for_print_orders.$return_value

      if (!orders || !Array.isArray(orders)) {
        console.log('No orders to process')
        return []
      }

      console.log(`Processing ${orders.length} orders...`)

      const results = []
      for (const order of orders) {
        console.log(`Sending order ${order.shopify_order_number} to endpoint...`)
        
        try {
          const response = await axios($, {
            method: 'POST',
            url: 'https://eon7t2775cbib0h.m.pipedream.net',
            headers: {
              'Authorization': 'Bearer print-ready',
              'Content-Type': 'application/json'
            },
            data: order
          })

          results.push({
            shopify_order_number: order.shopify_order_number,
            success: true,
            response: response
          })

          console.log(`Successfully sent order ${order.shopify_order_number}`)

        } catch (orderError) {
          console.error(`Error sending order ${order.shopify_order_number}:`, orderError)
          results.push({
            shopify_order_number: order.shopify_order_number,
            success: false,
            error: orderError.message
          })
        }
      }

      console.log('\nFinal results:', JSON.stringify(results, null, 2))
      return results

    } catch (error) {
      console.error('Error in workflow:', error)
      throw error
    }
  },
})