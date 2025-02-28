// local_image_processor.js
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Parse command line arguments
const args = process.argv.slice(2);
const usage = 'Usage: node local_image_processor.js <input_file> <output_file> <width> <height> [dpi=300]';

if (args.length < 4) {
  console.error(usage);
  process.exit(1);
}

const inputFile = args[0];
const outputFile = args[1];
const width = parseInt(args[2]);
const height = parseInt(args[3]);
const dpi = args[4] ? parseInt(args[4]) : 300;

// Validate arguments
if (!fs.existsSync(inputFile)) {
  console.error(`Error: Input file "${inputFile}" does not exist.`);
  process.exit(1);
}

if (isNaN(width) || width <= 0 || isNaN(height) || height <= 0 || isNaN(dpi) || dpi <= 0) {
  console.error('Error: Width, height, and DPI must be positive numbers.');
  process.exit(1);
}

async function processImage() {
  try {
    console.log('Processing image...');
    console.log(`Input: ${inputFile}`);
    console.log(`Output: ${outputFile}`);
    console.log(`Dimensions: ${width}x${height}`);
    console.log(`DPI: ${dpi}`);

    // Create output directory if it doesn't exist
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Process image with sharp
    await sharp(inputFile)
      .resize(width, height, {
        fit: 'fill',
        withoutEnlargement: false
      })
      .withMetadata({
        density: dpi // Set DPI
      })
      .png()
      .toFile(outputFile);

    console.log('Image processed successfully!');
    
    // Get file size
    const stats = fs.statSync(outputFile);
    console.log(`Output file size: ${(stats.size / 1024 / 1024).toFixed(2)}MB`);
  } catch (error) {
    console.error('Error processing image:', error.message);
    process.exit(1);
  }
}

processImage();