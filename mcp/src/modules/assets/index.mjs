// Assets: palettes, gradients, icons, fonts, photos. Each file registers its own tools.
import * as palette from "./palette.mjs";
import * as gradient from "./gradient.mjs";
import * as icons from "./icons.mjs";
import * as fonts from "./fonts.mjs";
import * as images from "./images.mjs";

export function register(server, ctx) {
  for (const m of [palette, gradient, icons, fonts, images]) m.register(server, ctx);
}
