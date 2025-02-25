// This code is designed to run on Pipedream.com and processes proof status updates from the proofing software
// It receives an array of files with approval/rejection timestamps and updates the corresponding portraits in Supabase

import { createClient } from '@supabase/supabase-js'

export default defineComponent({
  // Define Supabase as a required prop for database connection
  props: {
    supabase: {
      type: "app",
      app: "supabase"
    }
  },

  async run({ steps, $ }) {
    // Log the raw input for debugging purposes
    console.log("Raw input:", steps.trigger.event);

    // Extract the files array from the trigger event
    // Expected format: { files: [{ filename, file_url, timestamp_approved, timestamp_rejected, customer_comment }] }
    const { files } = steps.trigger.event;
    
    // Validate that we received an array of files
    if (!Array.isArray(files)) {
      console.error('Invalid input: files array is missing');
      return {
        status: 'error',
        message: 'Missing files array in input',
        receivedData: steps.trigger.event
      };
    }

    try {
      // Initialize Supabase client with credentials from Pipedream environment
      const supabase = createClient(
        `https://${this.supabase.$auth.subdomain}.supabase.co`,
        this.supabase.$auth.service_key
      );

      // Array to store results of processing each file
      const results = [];

      // Process each file in the input array
      for (const file of files) {
        try {
          // Extract portrait ID from filename
          // Filename format: customer_batch_portraitId_version_timestamp_type.png
          // Example: 1014_10_119_4_1740091142423_wt.png
          const filenameParts = file.filename.split('_');
          if (filenameParts.length < 3) {
            throw new Error(`Invalid filename format: ${file.filename}`);
          }
          const portrait_id = parseInt(filenameParts[2]);

          // Determine proof status based on timestamps
          // A = Approved (has approval timestamp)
          // R = Rejected (has rejection timestamp)
          let proof_status;
          if (file.timestamp_approved) {
            proof_status = 'A';
          } else if (file.timestamp_rejected) {
            proof_status = 'R';
          } else {
            console.log(`Skipping file ${file.filename} - no approval/rejection timestamp`);
            continue;
          }

          // Prepare the data for updating the portrait
          // If proof_status is 'R' (rejected), also set status to 'P' to trigger regeneration in worker dashboard
          const updateData = {
            proof_status,
            ...(proof_status === 'R' && { status: 'P' })
          };

          // If there's a customer comment, include it as proof feedback
          if (file.customer_comment) {
            updateData.proof_feedback = file.customer_comment;
          }

          // Update the portrait in Supabase
          const { data, error } = await supabase
            .from('portraits')
            .update(updateData)
            .eq('id', portrait_id)
            .select();

          if (error) throw error;

          // Log success and store result
          console.log(`Successfully updated portrait ${portrait_id} to ${proof_status}${proof_status === 'R' ? ' and status to P' : ''}`);
          
          results.push({
            filename: file.filename,
            portrait_id,
            status: 'success',
            proof_status,
            data
          });

        } catch (fileError) {
          // Handle errors for individual files without stopping the entire process
          console.error(`Error processing file ${file.filename}:`, fileError);
          results.push({
            filename: file.filename,
            status: 'error',
            error: fileError.message
          });
        }
      }

      // Return summary of all processed files
      return {
        status: 'complete',
        results,
        totalProcessed: files.length,
        successCount: results.filter(r => r.status === 'success').length,
        errorCount: results.filter(r => r.status === 'error').length
      };

    } catch (error) {
      // Handle any unexpected errors in the main process
      console.error('Error:', error);
      
      return {
        status: 'error',
        message: error.message,
        debug: {
          receivedInput: steps.trigger.event,
          error: error.stack
        }
      };
    }
  }
});