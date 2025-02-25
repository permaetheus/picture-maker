// this is node.js code that will be used to add a print order to the print_orders table in supabase via pipedream

// this is node.js code that will be used to update the status of a print order in the print_orders table in supabase via pipedream
// heres teh logic to use in swtich to update teh Status column for a given rpi_customer_order_id in the print_orders table



import { axios } from "@pipedream/platform"

// Status mapping for print order events
const STATUS_MAPPING = {
  // CREATED status events
  OrderCreated: "CREATED",
  OrderReceived: "CREATED",
  OrderFinishedPricing: "CREATED",

  // PROCESSING status events
  OrderAcceptedByPrinter: "PROCESSING",
  OrderAssetsAllProcessed: "PROCESSING",
  OrderEnteredHoldingBin: "PROCESSING",
  OrderExitedHoldingBin: "PROCESSING",
  OrderExitedLimitQueue: "PROCESSING",
  OrderOverLimitQueued: "PROCESSING",
  OrderExceedsLimitQueue: "PROCESSING",
  OrderShippingEstimatesRefreshed: "PROCESSING",

  // PRINTING status events
  OrderSubmittedToPrinter: "PRINTING",

  // SHIPPED status events
  OrderShipped: "SHIPPED",

  // CANCELLED status events
  OrderCancellationRequestSentToPrinter: "CANCELLED",
  OrderCancelledBeforeSubmissionToPrinter: "CANCELLED",
  OrderCancelled: "CANCELLED",
  OrderVoidedByPrinter: "CANCELLED",

  // FAILED status events
  OrderFailed: "FAILED",
  OrderValidationFailed: "FAILED",
  PaymentFailure: "FAILED",

  // EXCEPTION status events
  OrderErrorAtPrinter: "EXCEPTION",
  OrderInExceptionState: "EXCEPTION"
}

export default defineComponent({
  name: "Update Print Order Status",
  version: "0.0.1",
  key: "update_print_order_status",
  description: "Updates the status of a print order in Supabase based on webhook events",
  type: "action",
  props: {
    supabase: {
      type: "app",
      app: "supabase"
    }
  },
  async run({ steps, $ }) {
    try {
      // Access the event source directly from the workflow data
      const event = steps?.update_status_switch?.$return_value

      // Log what we received
      console.log('Event received:', event)

      // Return the event data for debugging
      return {
        success: true,
        message: "Event data received",
        event: event
      }

    } catch (error) {
      console.error("Error in component:", error)
      return {
        success: false,
        message: error.message || "Failed to process webhook",
        error: error.stack
      }
    }
  }
})
