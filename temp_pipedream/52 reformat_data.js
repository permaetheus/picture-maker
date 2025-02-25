export default defineComponent({
    async run({ steps, $ }) {
      /* Example Input:
      {
        "created_at": "2025-02-07T14:59:31.832601+00:00",
        "customer_email": null,
        "metadata": null,
        "order_items": [
          {
            "book_id": 5,
            "books": {
              "cover_pdf_key": "https://prpkqhafexkujnxpgvaf.supabase.co/storage/v1/object/public/finalized_pdf_forprint/5_cover_pdfrest2ac2bff6d-5f63-49e2-9cbc-ab92ceb28ab0_1739901298110.pdf",
              "guts_pdf_key": "https://prpkqhafexkujnxpgvaf.supabase.co/storage/v1/object/public/finalized_pdf_forprint/5_guts_pdfrest24e309ca4-644c-4a3f-8d35-a83c89ffbc1c_1739901298110.pdf",
              "id": 5,
              "status": "R"
            },
            "created_at": "2025-02-07T14:59:38.256773+00:00",
            "id": 5,
            "order_id": 11,
            "quantity": 1
          }
        ],
        "shipping_addresses": [
          {
            "address_line1": "address line 1",
            "address_line2": null,
            "city": "city smple",
            "country_code": "US",
            "id": 6,
            "name": "EXAMPLE EXAMPLE",
            "postal_code": "94845",
            "state": "state"
          }
        ],
        "shopify_order_id": "2siZTmlJcWd7lcjAIzGe0PXYEze",
        "shopify_order_number": "1010",
        "shopify_orders_sb_id": 11,
        "status": "N"
      }
      */
  
      const inputData = steps.trigger.event;
      
      function transformToRPIPrintFormat(data) {
        const shippingAddress = data.shipping_addresses[0];
        
        // Create destination object with required fields
        const destination = {
          name: shippingAddress.name,
          address1: shippingAddress.address_line1,
          city: shippingAddress.city,
          state: shippingAddress.state,
          postal: shippingAddress.postal_code,
          country: shippingAddress.country_code,
        };
  
        // Only add optional fields if they have values
        if (shippingAddress.address_line2) {
          destination.address2 = shippingAddress.address_line2;
        }
        
        if (shippingAddress.company) {
          destination.company = shippingAddress.company;
        }
  
        if (data.customer_email) {
          destination.email = data.customer_email;
        }
  
        if (shippingAddress.phone) {
          destination.phone = shippingAddress.phone;
        }
        
        const transformedOrderItems = data.order_items.map(orderItem => ({
          sku: orderItem.sku,
          quantity: orderItem.quantity,
          retailPrice: orderItem.retail_price.toString(),
          itemDescription: `Order #${data.shopify_order_number}`,
          product: {
            coverUrl: orderItem.books.cover_pdf_key,
            gutsUrl: orderItem.books.guts_pdf_key
          }
        }));
        
        return {
          currency: "USD",
          shippingClassification: "priority",
          webhookUrl: process.env.RPI_WEBHOOK_URL,
          destination,
          orderItems: transformedOrderItems
        };
      }
  
      const transformedData = transformToRPIPrintFormat(inputData);
      return transformedData;
    }
  });
  
  /* Example Output:
  {
    "currency": "USD",
    "shippingClassification": "priority",
    "webhookUrl": "https://your-webhook-url.com",
    "destination": {
      "name": "EXAMPLE EXAMPLE",
      "address1": "address line 1",
      "city": "city smple",
      "state": "state",
      "postal": "94845",
      "country": "US"
    },
    "orderItems": [
      {
        "sku": "11x8.5 Imagewrap, Gloss Laminate, 100# Gloss Text",
        "quantity": 1,
        "retailPrice": "12.3",
        "itemDescription": "Order #1010",
        "product": {
          "coverUrl": "https://prpkqhafexkujnxpgvaf.supabase.co/storage/v1/object/public/finalized_pdf_forprint/5_cover_pdfrest2ac2bff6d-5f63-49e2-9cbc-ab92ceb28ab0_1739901298110.pdf",
          "gutsUrl": "https://prpkqhafexkujnxpgvaf.supabase.co/storage/v1/object/public/finalized_pdf_forprint/5_guts_pdfrest24e309ca4-644c-4a3f-8d35-a83c89ffbc1c_1739901298110.pdf"
        }
      }
    ]
  }
  */