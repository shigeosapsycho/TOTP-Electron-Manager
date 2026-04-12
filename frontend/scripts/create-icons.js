/**
 * Create lock icon files for Electron app using 🔐 emoji
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const buildDir = path.join(__dirname, '..', 'build');
const pngPath = path.join(buildDir, 'icon.png');
const icoPath = path.join(buildDir, 'icon.ico');

// Ensure build directory exists
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

// Download high-quality 🔐 emoji image from GitHub's emoji collection
const emojiUrl = 'https://github.githubassets.com/images/icons/emoji/unicode/1f510.png?v8';

async function downloadEmoji() {
  return new Promise((resolve, reject) => {
    https.get(emojiUrl, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        https.get(response.headers.location, (redirectResponse) => {
          const chunks = [];
          redirectResponse.on('data', (chunk) => chunks.push(chunk));
          redirectResponse.on('end', () => resolve(Buffer.concat(chunks)));
          redirectResponse.on('error', reject);
        }).on('error', reject);
      } else {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', reject);
      }
    }).on('error', reject);
  });
}

async function createIcons() {
  console.log('Creating 🔐 emoji icon files...');

  try {
    const sharp = require('sharp');
    const toIco = require('to-ico');

    console.log('Downloading 🔐 emoji...');
    const emojiBuffer = await downloadEmoji();

    // Create PNG at 512x512 for Linux/general use
    await sharp(emojiBuffer)
      .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(pngPath);

    console.log('✓ Created icon.png (512x512) with 🔐 emoji');

    // Create multiple PNG sizes for ICO
    const sizes = [16, 32, 48, 256];
    const pngBuffers = [];

    for (const size of sizes) {
      const buffer = await sharp(emojiBuffer)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
      pngBuffers.push(buffer);
      console.log(`✓ Created ${size}x${size} PNG for ICO`);
    }

    // Create ICO file using to-ico
    const icoBuffer = await toIco(pngBuffers);
    fs.writeFileSync(icoPath, icoBuffer);

    console.log('✓ Created icon.ico');
    console.log('\n🔐 Emoji icon files created successfully!');
    console.log('- PNG:', pngPath);
    console.log('- ICO:', icoPath);

  } catch (error) {
    console.error('Error creating icons:', error.message);
    console.log('\nFalling back to manual SVG...');
    console.log('Please download a 🔐 emoji image and convert it to icon files.');
    console.log('Sources:');
    console.log('  - https://github.githubassets.com/images/icons/emoji/unicode/1f510.png?v8');
    console.log('  - https://emojipedia.org/key/');
  }
}

createIcons();
