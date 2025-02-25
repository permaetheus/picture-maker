import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Connecting to Supabase with:');
console.log('URL:', supabaseUrl);
console.log('Using Service Role Key:', !!supabaseKey);

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false
    }
});

async function listFilesWithPrefix(prefix) {
    const { data: files, error } = await supabase
        .storage
        .from('hires-portraits')
        .list('', {
            limit: 100,
            search: prefix
        });
    
    if (error) {
        console.error(`Error listing files with prefix ${prefix}:`, error);
        return [];
    }
    
    return files || [];
}

async function deleteFiles() {
    console.log('Starting file deletion process...');
    
    try {
        // Get files starting with 'undefined'
        console.log('Checking for files starting with "undefined"...');
        const undefinedFiles = await listFilesWithPrefix('undefined');
        
        // Get files starting with '4'
        console.log('Checking for files starting with "4"...');
        const fourFiles = await listFilesWithPrefix('4');
        
        const filesToDelete = [...undefinedFiles, ...fourFiles];

        console.log(`Found ${filesToDelete.length} files to delete`);
        if (filesToDelete.length > 0) {
            console.log('Files to delete:', filesToDelete.map(f => f.name));
        }

        for (const file of filesToDelete) {
            const { error: deleteError } = await supabase
                .storage
                .from('hires-portraits')
                .remove([file.name]);

            if (deleteError) {
                console.error(`Error deleting file ${file.name}:`, deleteError);
            } else {
                console.log(`Deleted file: ${file.name}`);
            }
        }
        
        console.log('File deletion process complete');
    } catch (error) {
        console.error('Unexpected error:', error);
        process.exit(1);
    }
}

deleteFiles().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
});