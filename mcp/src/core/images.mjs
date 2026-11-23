// Images for Claude: fetch, return as MCP image content, and build contact sheets
// (a grid of numbered thumbnails, so Claude can scan many results in one look).
import fs from "node:fs";
import { Jimp } from "jimp";
import { get } from "./http.mjs";

/** MCP image content block from a buffer. */
export function imageBlock(buf, mimeType = "image/jpeg") {
  return { type: "image", data: Buffer.from(buf).toString("base64"), mimeType };
}

export function textBlock(text) {
  return { type: "text", text };
}

export async function fetchImage(url, opts = {}) {
  // Local files (site captures, renders) are read from disk.
  if (!/^https?:/i.test(url)) return { buf: fs.readFileSync(url.replace(/^file:\/\/\/?/i, "")), mime: /\.png$/i.test(url) ? "image/png" : "image/jpeg" };
  const { body, contentType } = await get(url, { as: "buffer", ttlMs: 7 * 24 * 3600e3, ...opts });
  const mime = contentType.split(";")[0] || "image/jpeg";
  return { buf: body, mime };
}

/** Re-encode any image Jimp can read as JPEG, fitting inside maxW x maxH. */
export async function toJpeg(buf, maxW = 1600, maxH = 1600, quality = 82) {
  const img = await Jimp.read(buf);
  const scale = Math.min(1, maxW / img.width, maxH / img.height);
  if (scale < 1) img.resize({ w: Math.round(img.width * scale), h: Math.round(img.height * scale) });
  return img.getBuffer("image/jpeg", { quality });
}

// ---- tiny 5x7 digit font, so labels need no font files ----
const DIGITS = {
  0: ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  1: ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  2: ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  3: ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  4: ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  5: ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  6: ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  7: ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  8: ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  9: ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
};

function fillRect(img, x0, y0, w, h, color) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (x >= 0 && y >= 0 && x < img.width && y < img.height) img.setPixelColor(color, x, y);
}

function drawLabel(img, x, y, label, scale = 3) {
  const s = String(label);
  const w = s.length * 6 * scale + 2 * scale;
  const h = 9 * scale;
  fillRect(img, x, y, w, h, 0x111111e6);
  [...s].forEach((ch, i) => {
    const rows = DIGITS[ch];
    if (!rows) return;
    rows.forEach((row, ry) =>
      [...row].forEach((bit, rx) => {
        if (bit === "1") fillRect(img, x + scale + (i * 6 + rx) * scale, y + scale + ry * scale, scale, scale, 0xffffffff);
      }),
    );
  });
}

/**
 * Contact sheet: thumbnails (buffers) in a grid, each labelled with its number (start at `first`).
 * Returns a JPEG buffer. Failed images become grey tiles so numbering stays right.
 */
export async function contactSheet(buffers, { cols = 6, tileW = 300, tileH = 225, gap = 8, first = 1 } = {}) {
  const rows = Math.ceil(buffers.length / cols);
  const sheet = new Jimp({ width: cols * tileW + (cols + 1) * gap, height: rows * tileH + (rows + 1) * gap, color: 0xf2f2f2ff });
  for (let i = 0; i < buffers.length; i++) {
    const x = gap + (i % cols) * (tileW + gap);
    const y = gap + Math.floor(i / cols) * (tileH + gap);
    try {
      const img = await Jimp.read(buffers[i]);
      img.cover({ w: tileW, h: tileH });
      sheet.composite(img, x, y);
    } catch {
      fillRect(sheet, x, y, tileW, tileH, 0xccccccff);
    }
    drawLabel(sheet, x + 6, y + 6, first + i);
  }
  return sheet.getBuffer("image/jpeg", { quality: 78 });
}
