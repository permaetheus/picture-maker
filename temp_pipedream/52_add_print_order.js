// this is node.js code that will be used to add a print order to the print_orders table in supabase via pipedream

import { axios } from "@pipedream/platform"
export default defineComponent({
  props: {
    supabase: {
      type: "app",
      app: "supabase",
    }
  },
  async run({steps, $}) {
    // Extract values from steps
    const rpiResponse = steps.send_print_order.$return_value;
    const shopifyOrderId = steps.trigger.event.order_items[0].order_id;

    // Determine status based on API response
    let status = 'CREATED';  // Default status
    if (rpiResponse.statusCode !== 201) {
      status = 'FAILED';
    }

    // Prepare the insert data
    const data = {
      shopify_order_id: shopifyOrderId,
      rpi_customer_order_id: rpiResponse.customerOrderId,
      status: status,
      api_response_code: rpiResponse.statusCode,
      api_response_description: rpiResponse.statusDescription
    };

    // Insert into print_orders table
    return await axios($, {
      method: 'POST',
      url: `https://${this.supabase.$auth.subdomain}.supabase.co/rest/v1/print_orders`,
      headers: {
        'Authorization': `Bearer ${this.supabase.$auth.service_key}`,
        'apikey': `${this.supabase.$auth.service_key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      data: data
    });
  },
})
