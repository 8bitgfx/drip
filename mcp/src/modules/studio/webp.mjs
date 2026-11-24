// Animated WebP without ffmpeg: Chrome encodes each frame as a still WebP; this wraps those stills in the animation
// container (RIFF "WEBP" with VP8X + ANIM + one ANMF per frame). Pure byte work, no dependencies.

const u24 = (n) => Buffer.from([n & 255, (n >> 8) & 255, (n >> 16) & 255]);
const u32 = (n) => {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n >>> 0);
  return b;
};
const chunk = (fourcc, data) => Buffer.concat([Buffer.from(fourcc, "ascii"), u32(data.length), data, data.length % 2 ? Buffer.alloc(1) : Buffer.alloc(0)]);

/** The image-data chunks of a still WebP ("VP8 ", "VP8L" or "ALPH"+"VP8 "), plus its size. */
export function readStill(buf) {
  if (buf.length < 20 || buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") throw new Error("Not a WebP file");
  const parts = [];
  let width = 0;
  let height = 0;
  let alpha = false;
  for (let p = 12; p + 8 <= buf.length; ) {
    const id = buf.toString("ascii", p, p + 4);
    const len = buf.readUInt32LE(p + 4);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (id === "VP8X") {
      alpha = !!(data[0] & 0x10);
      width = 1 + (data[4] | (data[5] << 8) | (data[6] << 16));
      height = 1 + (data[7] | (data[8] << 8) | (data[9] << 16));
    } else if (id === "VP8 ") {
      parts.push(chunk(id, data));
      width = width || (data.readUInt16LE(6) & 0x3fff);
      height = height || (data.readUInt16LE(8) & 0x3fff);
    } else if (id === "VP8L") {
      parts.push(chunk(id, data));
      const bits = data.readUInt32LE(1);
      width = width || (bits & 0x3fff) + 1;
      height = height || ((bits >> 14) & 0x3fff) + 1;
      alpha = alpha || !!((bits >> 28) & 1);
    } else if (id === "ALPH") {
      parts.push(chunk(id, data));
      alpha = true;
    }
    p += 8 + len + (len % 2);
  }
  if (!parts.length) throw new Error("No image data in the WebP");
  return { data: Buffer.concat(parts), width, height, alpha };
}

/**
 * Build an animated WebP from still WebP buffers. frames: Buffer[] (all the same size); fps or per-frame durationMs.
 * loop 0 = forever. Returns a Buffer.
 */
export function animatedWebp(frames, { fps = 24, durationMs, loop = 0, background = [0, 0, 0, 0] } = {}) {
  if (!frames.length) throw new Error("No frames");
  const stills = frames.map(readStill);
  const { width, height } = stills[0];
  if (stills.some((s) => s.width !== width || s.height !== height)) throw new Error("Frames must all have the same size");
  const alpha = stills.some((s) => s.alpha);
  const dur = Math.max(1, Math.round(durationMs ?? 1000 / fps));
  const vp8x = chunk("VP8X", Buffer.concat([Buffer.from([0x02 | (alpha ? 0x10 : 0), 0, 0, 0]), u24(width - 1), u24(height - 1)]));
  const anim = chunk("ANIM", Buffer.concat([Buffer.from([background[2], background[1], background[0], background[3]]), Buffer.from([loop & 255, (loop >> 8) & 255])]));
  const anmf = stills.map((s) => chunk("ANMF", Buffer.concat([u24(0), u24(0), u24(width - 1), u24(height - 1), u24(dur), Buffer.from([0x00]), s.data])));
  const body = Buffer.concat([Buffer.from("WEBP", "ascii"), vp8x, anim, ...anmf]);
  return Buffer.concat([Buffer.from("RIFF", "ascii"), u32(body.length), body]);
}

/** Frame count, size and loop count of an animated WebP (for checks and reports), or null for a still. */
export function inspectWebp(buf) {
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") return null;
  let frames = 0;
  let width = 0;
  let height = 0;
  let animated = false;
  let loop = null;
  for (let p = 12; p + 8 <= buf.length; ) {
    const id = buf.toString("ascii", p, p + 4);
    const len = buf.readUInt32LE(p + 4);
    const d = buf.subarray(p + 8, p + 8 + len);
    if (id === "VP8X") {
      animated = !!(d[0] & 0x02);
      width = 1 + (d[4] | (d[5] << 8) | (d[6] << 16));
      height = 1 + (d[7] | (d[8] << 8) | (d[9] << 16));
    } else if (id === "ANIM") loop = d.readUInt16LE(4);
    else if (id === "ANMF") frames++;
    p += 8 + len + (len % 2);
  }
  return { animated, frames, width, height, loop };
}
