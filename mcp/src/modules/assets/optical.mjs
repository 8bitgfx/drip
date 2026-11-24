// optical_center: where a viewer puts the centre of a shape, which is rarely where maths puts it.
// A box with drips hanging off it is centred on the BOX; a play triangle on its mass; a logo with a
// tail or a sparkle on its body. Used for centring marks in containers, lockups and icons, and for
// the pivot (transform-origin) of anything that rotates, scales or swings.
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { opticalCenter } from "../../core/imaging.mjs";
import { projectDir } from "../../core/paths.mjs";
import { fetchImage, imageBlock, textBlock } from "../../core/images.mjs";
import { blocks, safe, text } from "../../core/result.mjs";

const pct = (v) => `${(v * 100).toFixed(1)}%`;

export function register(server, ctx) {
  server.registerTool(
    "optical_center",
    {
      title: "Find the optical centre and pivot",
      description:
        "Finds where the eye puts the centre of a mark, icon, illustration or object (SVG, PNG, WebP, JPG on a plain or transparent background), versus the bounding-box centre maths gives. " +
        "It strips thin details (drips, antennae, tails, sparkles, strokes sticking out) to find the BODY, and returns: the box centre, the ink centroid, the body centre and box, " +
        "the CSS to centre it optically in a container, and the transform-origin for rotating, scaling or swinging it. Returns an overlay (red dashed = bounding box, green = body). " +
        'Use it before centring a logo in a lockup, an icon in a button, a product cut-out in a hero, or animating anything around a pivot. Example: optical_center({ file: "public/logo.svg" })',
      inputSchema: {
        file: z.string().optional().describe("Project path or URL of the image"),
        svg: z.string().optional().describe("Inline SVG markup instead of a file"),
        detail: z.number().min(0.01).max(0.2).optional().describe("How thick a part must be to count as body, as a share of the image's short side (default 0.06). Raise it to ignore thicker drips/limbs"),
        width: z.number().optional().describe("Rendered width in px of the element on the page, to get px offsets"),
      },
    },
    safe(async ({ file, svg, detail, width }) => {
      let buf;
      if (svg) buf = Buffer.from(svg);
      else if (file) buf = /^https?:/.test(file) ? (await fetchImage(file)).buf : fs.readFileSync(path.resolve(projectDir(), file));
      else return text("Pass file or svg.", true);
      const o = await opticalCenter(buf, { detail, config: ctx.config() });
      if (o.empty) return text("No shape found (the image is one flat colour?).", true);
      const W = width || o.size.w;
      const H = (W * o.size.h) / o.size.w;
      const dx = (o.box.x - o.body.x) * W;
      const dy = (o.box.y - o.body.y) * H;
      const small = Math.abs(dx) < W * 0.01 && Math.abs(dy) < H * 0.01;
      const lines = [
        `Bounding box centre (maths): ${pct(o.box.x)} ${pct(o.box.y)}`,
        `Ink centroid (all of it):    ${pct(o.mass.x)} ${pct(o.mass.y)}`,
        `BODY centre (what the eye calls the centre): ${pct(o.body.x)} ${pct(o.body.y)} · body box x ${pct(o.bodyBox.x0)}-${pct(o.bodyBox.x1)}, y ${pct(o.bodyBox.y0)}-${pct(o.bodyBox.y1)} (${Math.round((o.bodyArea / o.inkArea) * 100)}% of the ink)`,
        "",
        small
          ? "The body sits on the box centre: centre it normally."
          : `To centre it optically in a container: centre the element, then nudge it by translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) at ${Math.round(W)}px wide (= translate(${pct(o.box.x - o.body.x)}, ${pct(o.box.y - o.body.y)}) of its own size). Align lockup text to the body box, not the drips.`,
        `Pivot for rotate / scale / swing: transform-origin: ${pct(o.body.x)} ${pct(o.body.y)};  (a hanging or swinging thing pivots at its top attachment instead: transform-origin: 50% ${pct(o.bodyBox.y0)})`,
        "Then trust your eye over the numbers: a centred circle or triangle still reads low, so lift the body ~1-3% above the container's centre.",
      ];
      return blocks([textBlock(lines.join("\n")), imageBlock(o.overlay, "image/png")]);
    }),
  );
}
