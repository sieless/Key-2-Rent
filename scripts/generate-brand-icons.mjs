import { ImageResponse } from 'next/dist/esm/server/og/image-response.js';
import { createElement } from 'react';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(process.cwd());
const logoPath = resolve(projectRoot, 'public/logos/timelaine-logo-icon.png');
const logoDataUrl = `data:image/png;base64,${readFileSync(logoPath).toString('base64')}`;

async function generatePng(size, outputRelativePath, options = {}) {
  const { background = 'transparent', padding = 0.12 } = options;
  const containerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background,
    width: '100%',
    height: '100%',
  };

  const logoStyle = {
    width: `${Math.max(0, 1 - padding) * 100}%`,
    height: `${Math.max(0, 1 - padding) * 100}%`,
    objectFit: 'contain',
  };

  const element = createElement(
    'div',
    { style: containerStyle },
    createElement('img', { src: logoDataUrl, style: logoStyle, alt: 'Timelaine logo' }),
  );

  const response = new ImageResponse(element, {
    width: size,
    height: size,
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(resolve(projectRoot, outputRelativePath), buffer);
  return buffer;
}

function writeIcoFromPng(pngBuffer, size, outputRelativePath) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // image type (icon)
  header.writeUInt16LE(1, 4); // number of images

  const entry = Buffer.alloc(16);
  entry.writeUInt8(size === 256 ? 0 : size, 0); // width
  entry.writeUInt8(size === 256 ? 0 : size, 1); // height
  entry.writeUInt8(0, 2); // color palette
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(pngBuffer.length, 8); // image size
  entry.writeUInt32LE(header.length + entry.length, 12); // offset

  const icoBuffer = Buffer.concat([header, entry, pngBuffer]);
  writeFileSync(resolve(projectRoot, outputRelativePath), icoBuffer);
}

async function main() {
  const faviconBuffer = await generatePng(64, 'public/favicon-64.png', {
    background: 'transparent',
    padding: 0.18,
  });

  await generatePng(32, 'public/favicon-32.png', {
    background: 'transparent',
    padding: 0.18,
  });

  await generatePng(180, 'public/apple-icon.png', {
    background: '#ffffff',
    padding: 0.1,
  });

  await generatePng(192, 'public/icon-192.png', {
    background: '#ffffff',
    padding: 0.1,
  });

  const icon512Buffer = await generatePng(512, 'public/icon-512.png', {
    background: '#ffffff',
    padding: 0.1,
  });

  writeIcoFromPng(faviconBuffer, 64, 'public/favicon.ico');

  // Also provide an SVG-friendly PNG export for embedding if required
  writeFileSync(resolve(projectRoot, 'public/favicon-512.png'), icon512Buffer);

  const icon512Base64 = icon512Buffer.toString('base64');
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">\n  <rect width="512" height="512" fill="transparent"/>\n  <image href="data:image/png;base64,${icon512Base64}" x="0" y="0" width="512" height="512" preserveAspectRatio="xMidYMid meet"/>\n</svg>\n`;
  writeFileSync(resolve(projectRoot, 'public/favicon.svg'), svg);
}

main().catch((error) => {
  console.error('Failed to generate brand icons:', error);
  process.exitCode = 1;
});
