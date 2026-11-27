#!/usr/bin/env node
/**
 * Render all platform icons from the same vector source.
 * Requires sharp (installed by the Windows and Android build workflows).
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SVG = path.join(ROOT, 'public', 'mealpha.svg');
const source = await fs.readFile(SVG);
const target = process.argv[2] || 'all';

async function render(size) {
  return sharp(source, { density: 768 })
    .resize(size, size, { fit: 'cover', position: 'centre' })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

async function generateWindows() {
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const images = await Promise.all(sizes.map(async (size) => ({ size, bytes: await render(size) })));
  const headerSize = 6 + images.length * 16;
  let offset = headerSize;
  const directory = Buffer.alloc(headerSize);
  directory.writeUInt16LE(0, 0);
  directory.writeUInt16LE(1, 2);
  directory.writeUInt16LE(images.length, 4);
  images.forEach(({ size, bytes }, index) => {
    const at = 6 + index * 16;
    directory.writeUInt8(size === 256 ? 0 : size, at);
    directory.writeUInt8(size === 256 ? 0 : size, at + 1);
    directory.writeUInt8(0, at + 2);
    directory.writeUInt8(0, at + 3);
    directory.writeUInt16LE(1, at + 4);
    directory.writeUInt16LE(32, at + 6);
    directory.writeUInt32LE(bytes.length, at + 8);
    directory.writeUInt32LE(offset, at + 12);
    offset += bytes.length;
  });
  const output = path.join(ROOT, 'build', 'mealpha.ico');
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, Buffer.concat([directory, ...images.map((image) => image.bytes)]));
  console.log('Generated ' + images.length + ' vector-derived Windows icon sizes: ' + output);
}

async function generateAndroid() {
  const resources = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');
  const densitySizes = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
  for (const [density, size] of Object.entries(densitySizes)) {
    const folder = path.join(resources, 'mipmap-' + density);
    await fs.mkdir(folder, { recursive: true });
    await fs.writeFile(path.join(folder, 'ic_launcher.png'), await render(size));
  }
  const xxxhdpi = path.join(resources, 'mipmap-xxxhdpi');
  await fs.mkdir(xxxhdpi, { recursive: true });
  await fs.writeFile(path.join(xxxhdpi, 'ic_launcher_foreground.png'), await render(432));

  const drawable = path.join(resources, 'drawable');
  await fs.mkdir(drawable, { recursive: true });
  await fs.writeFile(
    path.join(drawable, 'ic_launcher_background.xml'),
    '<?xml version="1.0" encoding="utf-8"?>\n' +
    '<color xmlns:android="http://schemas.android.com/apk/res/android" android:color="#17112f" />\n',
  );
  const adaptive = path.join(resources, 'mipmap-anydpi-v26');
  await fs.mkdir(adaptive, { recursive: true });
  await fs.writeFile(
    path.join(adaptive, 'ic_launcher.xml'),
    '<?xml version="1.0" encoding="utf-8"?>\n' +
    '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n' +
    '    <background android:drawable="@drawable/ic_launcher_background" />\n' +
    '    <foreground android:drawable="@mipmap/ic_launcher_foreground" />\n' +
    '</adaptive-icon>\n',
  );
  console.log('Generated full-resolution vector Android launcher icons.');
}

if (target === '--windows' || target === 'all') await generateWindows();
if (target === '--android' || target === 'all') await generateAndroid();
if (!['--windows', '--android', 'all'].includes(target)) {
  throw new Error('Unknown target ' + target + '. Use --windows, --android, or all.');
}
