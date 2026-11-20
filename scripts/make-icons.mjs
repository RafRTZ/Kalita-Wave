// Draws the Home Screen icon and writes it as PNG files. No dependencies.
// Usage: node scripts/make-icons.mjs
// The drawing is original: a flat-bottomed dripper with two wave lines and a drop. No third-party logo.
// Colours come from the tokens in next/app/ui/styles.css so the icon always matches the app.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const root = new URL('..', import.meta.url);
const css = readFileSync(new URL('next/app/ui/styles.css', root), 'utf8');

function token(name) {
  const match = css.match(new RegExp(`--${name}:\\s*#([0-9a-fA-F]{6})`));
  if (!match) throw new Error(`Colour token --${name} not found in styles.css`);
  return [0, 2, 4].map((i) => parseInt(match[1].slice(i, i + 2), 16));
}

const CREAM = token('bg');
const BROWN = token('accent');

// ---- the drawing, in a 0..1 square ----

const BODY = { top: 0.25, bottom: 0.6, topHalf: 0.29, bottomHalf: 0.175 }; // a trapezoid, wide at the top
const WAVES = [0.365, 0.475]; // centre lines of the two wave bands
const WAVE = { height: 0.026, thickness: 0.03, length: 0.19 };
const BASE = { x0: 0.23, x1: 0.77, y0: 0.6, y1: 0.66, r: 0.03 };
const DROP = { cx: 0.5, cy: 0.81, r: 0.047, tip: 0.705 };

function inBody(x, y) {
  if (y < BODY.top || y > BODY.bottom) return false;
  const t = (y - BODY.top) / (BODY.bottom - BODY.top);
  const half = BODY.topHalf + (BODY.bottomHalf - BODY.topHalf) * t;
  return Math.abs(x - 0.5) <= half;
}

function inWave(x, y) {
  return WAVES.some((centre) => {
    const line = centre + WAVE.height * Math.sin(((x - 0.5) / WAVE.length) * 2 * Math.PI);
    return Math.abs(y - line) <= WAVE.thickness / 2;
  });
}

function inBase(x, y) {
  if (x < BASE.x0 || x > BASE.x1 || y < BASE.y0 || y > BASE.y1) return false;
  const cx = Math.min(Math.max(x, BASE.x0 + BASE.r), BASE.x1 - BASE.r);
  const cy = Math.min(Math.max(y, BASE.y0 + BASE.r), BASE.y1 - BASE.r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= BASE.r ** 2;
}

function inDrop(x, y) {
  if ((x - DROP.cx) ** 2 + (y - DROP.cy) ** 2 <= DROP.r ** 2) return true;
  // The pointed top: a triangle from the tip down to the widest part of the circle.
  const shoulder = DROP.cy - DROP.r * 0.45;
  if (y < DROP.tip || y > shoulder) return false;
  const half = (DROP.r * 0.9 * (y - DROP.tip)) / (shoulder - DROP.tip);
  return Math.abs(x - DROP.cx) <= half;
}

function colourAt(x, y) {
  if (inBody(x, y)) return inWave(x, y) ? CREAM : BROWN;
  if (inBase(x, y) || inDrop(x, y)) return BROWN;
  return CREAM;
}

// ---- rasterise with 4x4 supersampling ----

function render(size) {
  const SS = 4;
  const pixels = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const c = colourAt((px + (sx + 0.5) / SS) / size, (py + (sy + 0.5) / SS) / size);
          r += c[0];
          g += c[1];
          b += c[2];
        }
      }
      const i = (py * size + px) * 4;
      pixels[i] = Math.round(r / (SS * SS));
      pixels[i + 1] = Math.round(g / (SS * SS));
      pixels[i + 2] = Math.round(b / (SS * SS));
      pixels[i + 3] = 255; // fully opaque: iOS turns transparent icon pixels black
    }
  }
  return pixels;
}

// ---- PNG encoding ----

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function png(size, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // colour type: RGBA
  const rows = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    rows[y * (size * 4 + 1)] = 0; // no filter
    pixels.copy(rows, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(new URL('next/assets/', root), { recursive: true });
for (const size of [180, 192, 512]) {
  const file = new URL(`next/assets/icon-${size}.png`, root);
  writeFileSync(file, png(size, render(size)));
  console.log(`wrote next/assets/icon-${size}.png`);
}
