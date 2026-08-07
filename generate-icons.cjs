const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const svgPath = path.join(publicDir, 'sana-logo.svg');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Target standard dimensions
const sizes = [72, 96, 128, 144, 152, 180, 192, 256, 384, 512, 1024, 2048];

async function generateIcons() {
  console.log('Generating PWA JPG App Icon Pack from SANA logo...');

  // Generate standard dimension icons in multiple filename conventions
  for (const size of sizes) {
    const buffer = await sharp(svgPath)
      .resize(size, size, { fit: 'fill' })
      .jpeg({ quality: 100, chromaSubsampling: '4:4:4' })
      .toBuffer();

    const fileNames = [
      `icon-${size}x${size}.jpg`,
      `icon-${size}.jpg`,
      `${size}x${size}.jpg`,
      `${size}.jpg`
    ];

    for (const name of fileNames) {
      fs.writeFileSync(path.join(publicDir, name), buffer);
    }
    console.log(`✓ Generated ${size}x${size} JPG icon variants`);
  }

  // Favicons
  const fav16 = await sharp(svgPath)
    .resize(16, 16, { fit: 'fill' })
    .jpeg({ quality: 100 })
    .toBuffer();
  fs.writeFileSync(path.join(publicDir, 'favicon-16.jpg'), fav16);

  const fav32 = await sharp(svgPath)
    .resize(32, 32, { fit: 'fill' })
    .jpeg({ quality: 100 })
    .toBuffer();
  fs.writeFileSync(path.join(publicDir, 'favicon-32.jpg'), fav32);

  // Apple Touch Icon (180x180)
  const appleTouch = await sharp(svgPath)
    .resize(180, 180, { fit: 'fill' })
    .jpeg({ quality: 100, chromaSubsampling: '4:4:4' })
    .toBuffer();
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.jpg'), appleTouch);

  // Adaptive Icon (512x512)
  const adaptiveIcon = await sharp(svgPath)
    .resize(512, 512, { fit: 'fill' })
    .jpeg({ quality: 100, chromaSubsampling: '4:4:4' })
    .toBuffer();
  fs.writeFileSync(path.join(publicDir, 'adaptive-icon.jpg'), adaptiveIcon);

  // Splash Icon (512x512)
  const splashIcon = await sharp(svgPath)
    .resize(512, 512, { fit: 'fill' })
    .jpeg({ quality: 100, chromaSubsampling: '4:4:4' })
    .toBuffer();
  fs.writeFileSync(path.join(publicDir, 'splash-icon.jpg'), splashIcon);

  // Maskable Icon (512x512 with safe area padding of 10%)
  const maskableIcon = await sharp(svgPath)
    .resize(410, 410, { fit: 'contain' })
    .extend({
      top: 51,
      bottom: 51,
      left: 51,
      right: 51,
      background: { r: 17, g: 22, b: 37, alpha: 1 }
    })
    .jpeg({ quality: 100, chromaSubsampling: '4:4:4' })
    .toBuffer();
  fs.writeFileSync(path.join(publicDir, 'maskable-icon.jpg'), maskableIcon);

  console.log('✓ All PWA JPG icons generated successfully!');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
