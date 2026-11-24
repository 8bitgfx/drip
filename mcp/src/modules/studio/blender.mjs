// blender_render (optional): the same scene JSON as scene_render, rendered by a Blender the user already has
// (Cycles, soft studio lights, HDRI world, shadow catcher). Drip runs `blender -b --python script -- spec out` with an
// argument array; the spec is data (JSON), never spliced into code. Without Blender the tool says where to get it.
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Jimp } from "jimp";
import { z } from "zod";
import { fetchImage, imageBlock, textBlock, toJpeg } from "../../core/images.mjs";
import { blocks, safe, text } from "../../core/result.mjs";
import { cleanDir, projectPath, saveFile, tempDir } from "./raster.mjs";
import { hdrBuffer } from "./assets3d.mjs";
import { findPbrMaps, MOCKUPS, mockupScene, sceneSchema } from "./scene.mjs";

/** Highest version folder first, for names like "Blender 4.2" / "Blender 5.1". */
const byVersionDesc = (a, b) => b.localeCompare(a, undefined, { numeric: true });

function listDir(dir) {
  try {
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}

/** Where a Blender executable might be on this machine, best first. Pure: the file system is read, nothing is run. */
export function blenderCandidates(env = process.env, platform = process.platform) {
  const out = [];
  if (env.DRIP_BLENDER) out.push(env.DRIP_BLENDER);
  const exe = platform === "win32" ? "blender.exe" : "blender";
  for (const dir of (env.PATH || "").split(path.delimiter).filter(Boolean)) out.push(path.join(dir, exe));
  if (platform === "win32") {
    for (const base of [env.ProgramFiles || "C:\\Program Files", env["ProgramFiles(x86)"] || "C:\\Program Files (x86)", env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, "Programs")].filter(Boolean)) {
      const root = path.join(base, "Blender Foundation");
      for (const d of listDir(root).filter((n) => /^Blender/i.test(n)).sort(byVersionDesc)) out.push(path.join(root, d, "blender.exe"));
    }
    out.push("C:\\Program Files (x86)\\Steam\\steamapps\\common\\Blender\\blender.exe");
  } else if (platform === "darwin") {
    out.push("/Applications/Blender.app/Contents/MacOS/Blender", path.join(os.homedir(), "Applications/Blender.app/Contents/MacOS/Blender"));
  } else {
    out.push("/usr/bin/blender", "/usr/local/bin/blender", "/snap/bin/blender", "/var/lib/flatpak/exports/bin/org.blender.Blender");
    for (const d of listDir("/opt").filter((n) => /^blender/i.test(n)).sort(byVersionDesc)) out.push(path.join("/opt", d, "blender"));
  }
  return out;
}

export function findBlender(config, env = process.env, platform = process.platform) {
  const configured = config?.blender?.path;
  const list = [...(configured ? [configured] : []), ...blenderCandidates(env, platform)];
  return list.find((p) => p && fs.existsSync(p)) || null;
}

// Python run inside Blender. Values come from the JSON spec only. Written without backslashes (embedded as text).
const BLENDER_SCRIPT = `
import bpy, bmesh, sys, json, math, os
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
spec = json.load(open(argv[0]))
out_path = argv[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
W, H = spec.get("width", 1600), spec.get("height", 1000)
rad = math.radians

def T(p):
    # three.js (Y up, +Z toward the viewer) -> Blender (Z up)
    return (p[0], -p[2], p[1])

def lin(c):
    c = c.lstrip("#")
    if len(c) == 3:
        c = "".join(ch * 2 for ch in c)
    v = [int(c[i:i + 2], 16) / 255.0 for i in (0, 2, 4)]
    return [((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in v] + [1.0]

def principled(m):
    mat = bpy.data.materials.new("m")
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    m = m or {}
    bsdf.inputs["Base Color"].default_value = lin(m.get("color", "#cfcfcf"))
    bsdf.inputs["Roughness"].default_value = m.get("roughness", 0.5)
    bsdf.inputs["Metallic"].default_value = m.get("metalness", 0.0)
    if m.get("clearcoat"):
        for name in ("Coat Weight", "Clearcoat"):
            if name in bsdf.inputs:
                bsdf.inputs[name].default_value = m["clearcoat"]
                break
    def tex(path, noncolor):
        t = nt.nodes.new("ShaderNodeTexImage")
        t.image = bpy.data.images.load(path)
        if noncolor:
            t.image.colorspace_settings.name = "Non-Color"
        return t
    if m.get("map"):
        nt.links.new(tex(m["map"], False).outputs["Color"], bsdf.inputs["Base Color"])
    if m.get("roughnessMap"):
        nt.links.new(tex(m["roughnessMap"], True).outputs["Color"], bsdf.inputs["Roughness"])
    if m.get("normalMap"):
        n = nt.nodes.new("ShaderNodeNormalMap")
        nt.links.new(tex(m["normalMap"], True).outputs["Color"], n.inputs["Color"])
        nt.links.new(n.outputs["Normal"], bsdf.inputs["Normal"])
    return mat

def emissive_image(path, aspect, fit, background):
    # a screen or print: the image drives the emission so it looks like itself under any light
    mat = bpy.data.materials.new("decal")
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (0, 0, 0, 1)
    t = nt.nodes.new("ShaderNodeTexImage")
    t.image = bpy.data.images.load(path)
    iw, ih = t.image.size[0] or 1, t.image.size[1] or 1
    ia = iw / ih
    sx = sy = 1.0
    ox = oy = 0.0
    if fit == "contain":
        if ia > aspect:
            sy = ia / aspect
        else:
            sx = aspect / ia
        t.extension = "CLIP"
    else:
        if ia > aspect:
            sx = aspect / ia
        else:
            sy = ia / aspect
    # mapping: uv' = (uv - 0.5) * scale + 0.5
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (sx, sy, 1)
    mp.inputs["Location"].default_value = (0.5 - 0.5 * sx, 0.5 - 0.5 * sy, 0)
    uv = nt.nodes.new("ShaderNodeTexCoord")
    nt.links.new(uv.outputs["UV"], mp.inputs["Vector"])
    nt.links.new(mp.outputs["Vector"], t.inputs["Vector"])
    nt.links.new(t.outputs["Color"], bsdf.inputs["Emission Color"])
    bsdf.inputs["Emission Strength"].default_value = 1.0
    bsdf.inputs["Roughness"].default_value = 0.4
    return mat

def finish(obj, mat, bevel=0.0):
    if mat:
        obj.data.materials.append(mat)
    if bevel:
        b = obj.modifiers.new("bevel", "BEVEL")
        b.width = bevel
        b.segments = 5
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj

def cube(name, size, pos, mat=None, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1)
    o = bpy.context.active_object
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    o.location = pos
    return finish(o, mat, bevel)

def plane(name, w, h, pos, mat=None):
    bpy.ops.mesh.primitive_plane_add(size=1)
    o = bpy.context.active_object
    o.name = name
    o.scale = (w, h, 1)
    bpy.ops.object.transform_apply(scale=True)
    o.location = pos
    if mat:
        o.data.materials.append(mat)
    return o

parts = []   # (object) built in the three.js frame; converted afterwards

def decal_mat(d, aspect):
    return emissive_image(d["image"], aspect, d.get("fit", "cover"), d.get("background")) if d else None

def build(o):
    t = o["type"]
    sz = o.get("size") or []
    mat = principled(o.get("material"))
    d = o.get("decal")
    objs = []
    if t == "phone":
        w, h, dp = (sz + [0.78, 1.6, 0.085][len(sz):])[:3]
        objs.append(cube("phone", (w, h, dp), (0, 0, 0), mat, 0.05))
        objs.append(plane("screen", w - 0.05, h - 0.05, (0, 0, dp / 2 + 0.002), decal_mat(d, (w - 0.05) / (h - 0.05)) or principled({"color": "#050507"})))
    elif t == "laptop":
        w, h, dp = (sz + [1.6, 1.04, 1.1][len(sz):])[:3]
        objs.append(cube("base", (w, 0.045, dp), (0, 0.0225, 0), mat, 0.012))
        hinge = bpy.data.objects.new("hinge", None)
        bpy.context.collection.objects.link(hinge)
        hinge.location = (0, 0.045, -dp / 2)
        hinge.rotation_euler = (-rad(15), 0, 0)
        shell = cube("lid", (w, h, 0.03), (0, h / 2, 0), mat, 0.01)
        screen = plane("lidscreen", w - 0.09, h - 0.1, (0, h / 2, 0.0165), decal_mat(d, (w - 0.09) / (h - 0.1)) or principled({"color": "#050507"}))
        for ch in (shell, screen):
            ch.parent = hinge
        objs.append(hinge)
    elif t == "box":
        w, h, dp = (sz + [1, 1.4, 0.35][len(sz):])[:3]
        objs.append(cube("box", (w, h, dp), (0, 0, 0), mat, min(w, h, dp) * 0.03))
        if d:
            objs.append(plane("front", w * 0.97, h * 0.97, (0, 0, dp / 2 + 0.002), decal_mat(d, w / h)))
    elif t == "card":
        w, h, dp = (sz + [1.7, 1.05, 0.012][len(sz):])[:3]
        objs.append(cube("card", (w, h, dp), (0, 0, 0), mat, 0.003))
        if d:
            objs.append(plane("face", w * 0.985, h * 0.985, (0, 0, dp / 2 + 0.001), decal_mat(d, w / h)))
    elif t == "plane":
        w, h = (sz + [1.2, 1.7][len(sz):])[:2]
        objs.append(plane("poster", w, h, (0, 0, 0), decal_mat(d, w / h) or mat))
    elif t == "sphere":
        bpy.ops.mesh.primitive_uv_sphere_add(radius=(sz or [0.6])[0], segments=64, ring_count=32)
        s = bpy.context.active_object
        objs.append(finish(s, mat))
    else:
        r, h = (sz + [0.42, 1.3][len(sz):])[:2]
        if t == "cylinder":
            bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, vertices=96)
            body = bpy.context.active_object
            body.rotation_euler = (rad(90), 0, 0)
            bpy.ops.object.transform_apply(rotation=True)
            objs.append(finish(body, mat))
            label_h, label_y = h * 0.62, 0.0
        else:
            prof = [(0, 0), (r * 0.92, 0), (r, 0.04 * h), (r, 0.58 * h), (r * 0.96, 0.64 * h), (r * 0.62, 0.74 * h), (r * 0.4, 0.8 * h), (r * 0.38, 0.94 * h), (r * 0.46, 0.955 * h), (r * 0.46, h), (r * 0.32, h), (0, h * 0.985)]
            me = bpy.data.meshes.new("bottle")
            me.from_pydata([(x, y - h / 2, 0) for x, y in prof], [(i, i + 1) for i in range(len(prof) - 1)], [])
            body = bpy.data.objects.new("bottle", me)
            bpy.context.collection.objects.link(body)
            s = body.modifiers.new("lathe", "SCREW")
            s.angle = rad(360)
            s.steps = 96
            s.render_steps = 96
            s.axis = "Y"
            s.use_merge_vertices = True
            body.data.materials.append(mat)
            bpy.context.view_layer.objects.active = body
            bpy.ops.object.select_all(action="DESELECT")
            body.select_set(True)
            bpy.ops.object.modifier_apply(modifier="lathe")
            bpy.ops.object.shade_smooth()
            objs.append(body)
            label_h, label_y = 0.4 * h, -0.12 * h
        if d:
            bpy.ops.mesh.primitive_cylinder_add(radius=r + 0.003, depth=label_h, vertices=96, end_fill_type="NOTHING")
            lab = bpy.context.active_object
            lab.rotation_euler = (0, 0, rad(-90))   # turn the seam to the back, around the cylinder axis
            bpy.ops.object.transform_apply(rotation=True)
            lab.rotation_euler = (rad(90), 0, 0)
            bpy.ops.object.transform_apply(rotation=True)
            lab.location = (0, label_y, 0)
            lab.data.materials.append(decal_mat(d, (2 * math.pi * (r + 0.003)) / label_h))
            for p in lab.data.polygons:
                p.use_smooth = True
            objs.append(lab)
    pos = o.get("position") or [0, 0, 0]
    rot = o.get("rotation") or [0, 0, 0]
    # group under an empty so position / rotation apply to the whole object
    grp = bpy.data.objects.new(t, None)
    bpy.context.collection.objects.link(grp)
    for ob in objs:
        ob.parent = grp
    grp.location = pos
    grp.rotation_euler = (rad(rot[0]), rad(rot[1]), rad(rot[2]))
    return grp

root = bpy.data.objects.new("root", None)
bpy.context.collection.objects.link(root)
root.rotation_euler = (rad(90), 0, 0)   # three.js Y-up frame -> Blender Z-up

groups = [build(o) for o in spec["objects"]]
for g in groups:
    g.parent = root
bpy.context.view_layer.update()

# stand everything on y = 0 and measure it
pts = []
for g in groups:
    for ob in [g] + list(g.children_recursive):
        if ob.type == "MESH":
            pts += [ob.matrix_world @ Vector(c) for c in ob.bound_box]
min_z = min(p.z for p in pts)
root.location.z -= min_z
bpy.context.view_layer.update()
pts = [Vector((p.x, p.y, p.z - min_z)) for p in pts]
cx = sum(p.x for p in pts) / len(pts)
cy = sum(p.y for p in pts) / len(pts)
cz = sum(p.z for p in pts) / len(pts)
center = Vector((cx, cy, cz))
radius = max((p - center).length for p in pts)

# ground (shadow catcher)
bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, 0))
ground = bpy.context.active_object
ground.is_shadow_catcher = True

# world: the background colour for camera rays, an HDRI (or a soft grey) for light
env = spec.get("environment") or {}
world = bpy.data.worlds.new("w")
world.use_nodes = True
scene.world = world
nt = world.node_tree
for n in list(nt.nodes):
    nt.nodes.remove(n)
outn = nt.nodes.new("ShaderNodeOutputWorld")
bg_light = nt.nodes.new("ShaderNodeBackground")
if env.get("hdriFile"):
    e = nt.nodes.new("ShaderNodeTexEnvironment")
    e.image = bpy.data.images.load(env["hdriFile"])
    nt.links.new(e.outputs["Color"], bg_light.inputs["Color"])
else:
    bg_light.inputs["Color"].default_value = (0.8, 0.8, 0.8, 1)
bg_light.inputs["Strength"].default_value = env.get("intensity", 1.0 if env.get("hdriFile") else 0.35)
nt.links.new(bg_light.outputs["Background"], outn.inputs["Surface"])

# lights
def aim(obj, target):
    c = obj.constraints.new("TRACK_TO")
    c.target = target
    c.track_axis = "TRACK_NEGATIVE_Z"
    c.up_axis = "UP_Y"

tgt = bpy.data.objects.new("target", None)
bpy.context.collection.objects.link(tgt)
tgt.location = center
lights = spec.get("lights", "studio")
presets = {
    "studio": [("directional", 2.4, (3, 5, 4), "#ffffff"), ("hemisphere", 0.6, (0, 6, 0), "#ffffff"), ("directional", 1.3, (-4, 3, -3), "#cfe4ff")],
    "soft": [("directional", 1.2, (2, 6, 3), "#ffffff"), ("hemisphere", 1.1, (0, 6, 0), "#ffffff")],
    "dramatic": [("directional", 3.6, (-4, 3, 2), "#ffffff"), ("directional", 0.8, (4, 2, -3), "#6f8cff")],
}
items = presets.get(lights, presets["studio"]) if isinstance(lights, str) else [(l["type"], l.get("intensity", 1.0), tuple(l.get("position", (3, 5, 4))), l.get("color", "#ffffff")) for l in lights]
for kind, power, pos, col in items:
    if kind in ("ambient",):
        continue
    ld = bpy.data.lights.new("l", "AREA")
    size = max(2.0, radius * 3.0) if kind != "hemisphere" else max(6.0, radius * 6.0)
    ld.size = size
    ld.energy = power * 260.0 * (size / 3.0) ** 2 * (0.5 if kind == "hemisphere" else 1.0)
    ld.color = lin(col)[:3]
    lo = bpy.data.objects.new("l", ld)
    bpy.context.collection.objects.link(lo)
    lo.location = Vector(T(pos)) * max(1.0, radius / 1.2) + Vector((0, 0, 0))
    aim(lo, tgt)

# camera
cam_spec = spec.get("camera") or {}
fov = cam_spec.get("fov", 30)
az = rad(cam_spec.get("azimuth", 0))
el = rad(cam_spec.get("elevation", 10))
cd = bpy.data.cameras.new("cam")
cd.sensor_fit = "VERTICAL"
cd.angle_y = rad(fov)
co = bpy.data.objects.new("cam", cd)
bpy.context.collection.objects.link(co)
scene.camera = co
hfov = 2 * math.atan(math.tan(rad(fov) / 2) * (W / H))
dist = cam_spec.get("distance") or radius / math.sin(min(rad(fov), hfov) / 2) * 1.08
co.location = center + Vector((dist * math.cos(el) * math.sin(az), -dist * math.cos(el) * math.cos(az), dist * math.sin(el)))
aim(co, tgt)

# render
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = spec.get("samples", 48)
scene.cycles.use_denoising = True
scene.render.resolution_x = W
scene.render.resolution_y = H
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
try:
    scene.view_settings.view_transform = "Standard"   # keeps a screen or label looking like its image
except Exception:
    pass
scene.view_settings.exposure = math.log2(max(0.1, (spec.get("render") or {}).get("exposure", 1.0)))
scene.render.filepath = out_path
bpy.ops.render.render(write_still=True)
print("DRIP_DONE", out_path)
`;

async function localFile(src, dir, name) {
  if (!src) return undefined;
  const ext = (path.extname(src.split("?")[0]) || ".png").toLowerCase();
  const target = path.join(dir, `${name}${ext}`);
  if (/^data:/.test(src)) {
    fs.writeFileSync(target, Buffer.from(src.split(",")[1], "base64"));
    return target;
  }
  if (/^https?:/i.test(src)) {
    fs.writeFileSync(target, (await fetchImage(src)).buf);
    return target;
  }
  return projectPath(src);
}

/** The spec Blender reads: every image is an absolute file path, the HDRI a downloaded .hdr. */
export async function blenderSpec(spec, dir, { samples = 48 } = {}) {
  const out = structuredClone(spec);
  let n = 0;
  for (const o of out.objects) {
    const m = (o.material ||= {});
    if (m.pbrFolder) {
      for (const [k, v] of Object.entries(findPbrMaps(m.pbrFolder))) if (!m[k]) m[k] = v;
    }
    for (const k of ["map", "normalMap", "roughnessMap", "aoMap"]) if (m[k]) m[k] = await localFile(m[k], dir, `tex${n++}`);
    if (o.decal) o.decal.image = await localFile(o.decal.image, dir, `decal${n++}`);
  }
  if (out.environment?.hdri) {
    const file = path.join(dir, "env.hdr");
    fs.writeFileSync(file, await hdrBuffer(out.environment.hdri, out.environment.resolution || "1k"));
    out.environment.hdriFile = file;
  }
  out.samples = samples;
  return out;
}

const run = (file, args, timeout) =>
  new Promise((resolve, reject) => {
    execFile(file, args, { timeout, maxBuffer: 16 * 1024 * 1024, windowsHide: true }, (err, stdout, stderr) => (err && !stdout?.includes("DRIP_DONE") ? reject(Object.assign(err, { stdout, stderr })) : resolve({ stdout, stderr })));
  });

export function register(server, ctx) {
  server.registerTool(
    "blender_render",
    {
      title: "Render a scene with Blender (optional)",
      description:
        "Renders the same scene JSON as scene_render with Blender's Cycles path tracer (soft studio lights, an HDRI world, real shadows) when the user wants Blender's renderer. It draws the built-in shapes only (no glTF models): for devices use mockup_render, for products scene_render with a real model. Needs Blender installed (found on PATH, Program Files, /Applications, /usr/bin, or DRIP_BLENDER); without it the tool says how to get it and scene_render still works. " +
        "Runs headless in the background, CPU, 48 samples by default (a few seconds to a few minutes). Differences from scene_render: label decals wrap the full cylinder, bottles and phones are simpler shapes. " +
        'Example: blender_render({ mockup: "bottle", image: "public/img/label.png", environment: { hdri: "studio_small_09" }, samples: 64, out: "public/img/bottle.png" })',
      inputSchema: {
        mockup: z.enum(MOCKUPS).optional(),
        image: z.string().optional(),
        color: z.string().optional(),
        background: z.string().optional().describe("Hex colour or transparent (default #e9e6df)"),
        scene: sceneSchema.optional(),
        environment: z.object({ hdri: z.string().optional(), resolution: z.enum(["1k", "2k"]).optional(), intensity: z.number().optional() }).optional(),
        width: z.number().int().min(200).max(3000).optional(),
        height: z.number().int().min(200).max(3000).optional(),
        samples: z.number().int().min(4).max(512).optional(),
        out: z.string().optional().describe("Project path ending .png"),
        timeoutSeconds: z.number().int().min(10).max(1800).optional(),
      },
    },
    safe(async (args) => {
      const exe = findBlender(ctx.config());
      if (!exe) return text("Blender was not found. Install it from https://www.blender.org/download/ (free), or set DRIP_BLENDER to the executable, or \"blender\": { \"path\": \"...\" } in .drip/config.json. scene_render renders mockups without it.", true);
      const spec = args.scene ? { ...sceneSchema.parse(args.scene) } : mockupScene(args.mockup || "phone", { image: args.image, color: args.color, background: args.background, width: args.width, height: args.height });
      if (args.environment) spec.environment = { ...(spec.environment || {}), ...args.environment };
      if (args.scene && args.width) spec.width = args.width;
      if (args.scene && args.height) spec.height = args.height;
      if (!args.scene && !args.mockup && !args.image) throw new Error("Pass mockup (and image), or a full scene.");
      const dir = tempDir("drip-blender-");
      try {
        const prepared = await blenderSpec(spec, dir, { samples: args.samples || 48 });
        fs.writeFileSync(path.join(dir, "spec.json"), JSON.stringify(prepared));
        fs.writeFileSync(path.join(dir, "render.py"), BLENDER_SCRIPT);
        const png = path.join(dir, "out.png");
        const t0 = Date.now();
        let res;
        try {
          res = await run(exe, ["-b", "--factory-startup", "-noaudio", "--python", path.join(dir, "render.py"), "--", path.join(dir, "spec.json"), png], (args.timeoutSeconds || 600) * 1000);
        } catch (err) {
          const tail = `${err.stdout || ""}\n${err.stderr || ""}`.split("\n").filter((l) => /Error|Traceback|File "|Exception/i.test(l)).slice(-8).join("\n");
          throw new Error(`Blender failed (${err.killed ? "timed out" : `exit ${err.code}`}).${tail ? `\n${tail}` : ""}`);
        }
        if (!fs.existsSync(png)) throw new Error(`Blender finished without writing an image.\n${res.stdout.split("\n").slice(-6).join("\n")}`);
        let buf = fs.readFileSync(png);
        const bg = spec.background;
        if (bg && bg !== "transparent") {
          const img = await Jimp.read(buf);
          const flat = new Jimp({ width: img.width, height: img.height, color: Number.parseInt(`${bg.replace("#", "").padEnd(6, "0").slice(0, 6)}ff`, 16) });
          flat.composite(img, 0, 0);
          buf = await flat.getBuffer("image/png");
        }
        const files = [];
        if (args.out) {
          if (!/\.png$/i.test(args.out)) throw new Error("out must end in .png");
          files.push(saveFile(args.out, buf));
          files.push(saveFile(args.out.replace(/\.png$/i, ".scene.json"), JSON.stringify(spec, null, 2)));
        }
        return blocks([textBlock(`Blender render ${prepared.width || 1600}x${prepared.height || 1000}, ${prepared.samples} samples, ${((Date.now() - t0) / 1000).toFixed(1)}s (${path.basename(path.dirname(exe)) || exe}).${files.length ? `\nSaved: ${files.map((f) => `${f.rel} (${f.kb} KB)`).join(", ")}.` : ""}`), imageBlock(await toJpeg(buf, 1280, 900, 86))]);
      } finally {
        cleanDir(dir);
      }
    }),
  );
}
