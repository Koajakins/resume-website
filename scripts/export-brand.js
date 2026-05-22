const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const BRAND = path.join(ROOT, 'assets/brand');
const ASSETS = path.join(ROOT, 'assets');

// Read and base64-encode the font (raw base64, not the CSS string)
const fontB64 = fs.readFileSync(path.join(ROOT, 'fonts/inter-latin.woff2')).toString('base64');

// Read and base64-encode the profile photo
const photoB64 = 'data:image/webp;base64,' +
  fs.readFileSync(path.join(ASSETS, 'profile.webp')).toString('base64');

function loadSvg(filename) {
  let svg = fs.readFileSync(path.join(BRAND, filename), 'utf8');
  svg = svg.replace('FONT_B64_PLACEHOLDER', fontB64);
  svg = svg.replace('PHOTO_B64_PLACEHOLDER', photoB64);
  return Buffer.from(svg);
}

// Minimal ICO encoder: header + directory + PNG data for each size
function buildIco(pngBuffers, sizes) {
  const count = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = dirEntrySize * count;
  let offset = headerSize + dirSize;

  // ICONDIR header
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);     // reserved
  header.writeUInt16LE(1, 2);     // type: ICO
  header.writeUInt16LE(count, 4); // image count

  const dirEntries = [];
  for (let i = 0; i < count; i++) {
    const entry = Buffer.alloc(16);
    const sz = sizes[i] >= 256 ? 0 : sizes[i];
    entry.writeUInt8(sz, 0);                          // width
    entry.writeUInt8(sz, 1);                          // height
    entry.writeUInt8(0, 2);                            // color count
    entry.writeUInt8(0, 3);                            // reserved
    entry.writeUInt16LE(1, 4);                         // planes
    entry.writeUInt16LE(32, 6);                        // bit count
    entry.writeUInt32LE(pngBuffers[i].length, 8);      // size
    entry.writeUInt32LE(offset, 12);                   // offset
    offset += pngBuffers[i].length;
    dirEntries.push(entry);
  }

  return Buffer.concat([header, ...dirEntries, ...pngBuffers]);
}

async function run() {
  const initialsBuffer = loadSvg('wordmark-initials.svg');

  // favicon.ico (16, 32, 48)
  console.log('Exporting favicon.ico...');
  const icoSizes = [16, 32, 48];
  const icoPngs = await Promise.all(
    icoSizes.map(sz => sharp(initialsBuffer).resize(sz, sz).png().toBuffer())
  );
  fs.writeFileSync(path.join(ROOT, 'favicon.ico'), buildIco(icoPngs, icoSizes));

  // PWA / touch icons
  console.log('Exporting icon-192.png...');
  await sharp(initialsBuffer).resize(192, 192).png()
    .toFile(path.join(ASSETS, 'icon-192.png'));

  console.log('Exporting icon-512.png...');
  await sharp(initialsBuffer).resize(512, 512).png()
    .toFile(path.join(ASSETS, 'icon-512.png'));

  console.log('Exporting apple-touch-icon.png...');
  await sharp(initialsBuffer).resize(180, 180).png()
    .toFile(path.join(ASSETS, 'apple-touch-icon.png'));

  // OG card
  console.log('Exporting og-card.jpg...');
  await sharp(loadSvg('og-card.svg'))
    .resize(1200, 630)
    .jpeg({ quality: 85 })
    .toFile(path.join(ASSETS, 'og-card.jpg'));

  // LinkedIn banner — flatten alpha to white so LinkedIn accepts it
  console.log('Exporting linkedin-banner.png...');
  await sharp(loadSvg('linkedin-banner.svg'))
    .resize(1584, 396)
    .flatten({ background: '#0f172a' })
    .png()
    .toFile(path.join(ASSETS, 'linkedin-banner.png'));

  console.log('Done. Exported:');
  console.log('  favicon.ico');
  console.log('  assets/icon-192.png');
  console.log('  assets/icon-512.png');
  console.log('  assets/apple-touch-icon.png');
  console.log('  assets/og-card.jpg');
  console.log('  assets/linkedin-banner.png');
}

run().catch(err => { console.error(err); process.exit(1); });
