import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function generateIcons() {
  const publicDir = path.resolve('public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const svgIconPath = path.join(publicDir, 'icon.svg');
  const svgMaskablePath = path.join(publicDir, 'icon-maskable.svg');

  console.log('Generating PNG icons from SVG...');

  // 180x180 for iOS apple-touch-icon
  await sharp(svgIconPath)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // 192x192 for Android & PWA manifest
  await sharp(svgIconPath)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));

  // 512x512 for PWA manifest splash & high-res
  await sharp(svgIconPath)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));

  // 512x512 maskable for Android adaptive icon
  await sharp(svgMaskablePath)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  // 32x32 favicon
  await sharp(svgIconPath)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon.ico'));

  console.log('Successfully generated all PWA icons:');
  console.log(fs.readdirSync(publicDir));
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
