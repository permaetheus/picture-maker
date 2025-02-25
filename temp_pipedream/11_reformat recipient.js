// To use any npm package, just import it
// import axios from "axios"
// This code runs on the Pipedream platform. Everything you write will be executed in the cloud - on pipedream.com, not on your local machine.

import { axios } from "@pipedream/platform"

export default defineComponent({
  async run({steps, $}) {
    const lineItems = steps.trigger.event.line_items
    
    const formattedData = lineItems.map(item => {
      const includeMessage = item.properties.find(p => p.name === "Custom Message?")?.value?.toLowerCase() === "yes"
      const photoUrl = item.properties.find(p => p.name.toLowerCase().includes("direct link"))?.value || "error_finding_url"
      
      return {
        shopify_photo_url: photoUrl,
        photo_key: photoUrl,
        name: item.properties.find(p => p.name === "First Name")?.value || "",
        age: item.properties.find(p => p.name === "Age")?.value || "",
        gender: (item.properties.find(p => p.name === "Gender")?.value || "").toLowerCase(),
        message: includeMessage ? item.properties.find(p => p.name === "Custom Message:")?.value : null
      }
    })

    return formattedData
  }
})