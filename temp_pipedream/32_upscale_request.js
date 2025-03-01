import { fal } from "@fal-ai/client"

export default defineComponent({
  props: {
    fal_ai: {
      type: "app",
      app: "fal_ai",
    }
  },
  async run({ steps, $ }) {
    // Configure fal client with API key
    fal.config({
      credentials: `${this.fal_ai.$auth.api_key}`,
    });

    try {
      console.log('Starting image upscaling...');
      console.log('Full trigger event:', JSON.stringify(steps.trigger.event, null, 2));
      console.log('Input image URL:', steps.trigger.event.image_key);
      
      if (!steps.trigger.event.image_key) {
        throw new Error('No image_key provided in trigger event');
      }

      const requestPayload = {
        input: {
          image_url: steps.trigger.event.image_key,
          prompt: "masterpiece, best quality, highres",
          upscale_factor: 2,
          negative_prompt: "(worst quality, low quality, normal quality:2)",
          creativity: 0.35,
          resemblance: 0.6,
          guidance_scale: 4,
          num_inference_steps: 18,
          enable_safety_checker: true
        },
        webhookUrl: "https://eocasz7dqern2yz.m.pipedream.net"
      };

      console.log('Sending request payload:', JSON.stringify(requestPayload, null, 2));
      
      const { request_id } = await fal.queue.submit("fal-ai/clarity-upscaler", requestPayload);

      console.log('Upscaling request submitted with ID:', request_id);

      return {
        status: 'submitted',
        requestId: request_id,
        message: 'Upscaling request submitted successfully. Results will be sent to webhook.'
      };

    } catch (error) {
      console.error('Error submitting upscaling request:', error);
      return {
        status: 'error',
        message: error.message,
        debug: {
          receivedInput: steps.trigger.event,
          error: error.stack
        }
      };
    }
  },
})