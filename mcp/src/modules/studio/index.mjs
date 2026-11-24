// Studio: original artwork, shader backgrounds, 3D scenes and mockups, Blender renders, motion recording.
// Everything renders on the user's machine in the shared headless Chrome (or Blender when it is installed).
import * as art from "./art-tool.mjs";
import * as assets3d from "./assets3d.mjs";
import * as blender from "./blender.mjs";
import * as motion from "./motion.mjs";
import * as scene from "./scene.mjs";
import * as shader from "./shader.mjs";

export function register(server, ctx) {
  for (const m of [art, shader, scene, assets3d, blender, motion]) m.register(server, ctx);
}
