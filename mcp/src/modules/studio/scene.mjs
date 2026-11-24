// scene_render: three.js in headless Chrome. Device and packaging mockups with your screenshot or artwork as the decal,
// simple product forms, camera, light, materials (colour or PBR texture folders), a Poly Haven HDRI for lighting, and a
// turntable. three.js loads from a pinned jsDelivr URL; WebGL runs in software (SwiftShader / WARP) when there is no GPU.
// The scene is plain JSON: the tool returns it so you can change one thing and render again.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { openPage, withTab } from "../../core/browser.mjs";
import { contactSheet, fetchImage, imageBlock, textBlock, toJpeg } from "../../core/images.mjs";
import { processImage } from "../../core/imaging.mjs";
import { safe } from "../../core/result.mjs";
import { hdrBuffer } from "./assets3d.mjs";
import { cleanDir, projectPath, saveFile, tempDir } from "./raster.mjs";
import { dataUrl, registerViewer, studioResult, studioToolMeta } from "./viewer.mjs";
import { animatedWebp } from "./webp.mjs";

export const THREE_VERSION = "0.170.0";
export const THREE_BASE = `https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}`;

const vec3 = z.tuple([z.number(), z.number(), z.number()]);
const color = z.string().regex(/^#[0-9a-fA-F]{3,8}$|^transparent$/, "a hex colour such as #1a1a1d");

const materialSchema = z.object({
  color: color.optional(),
  roughness: z.number().min(0).max(1).optional(),
  metalness: z.number().min(0).max(1).optional(),
  clearcoat: z.number().min(0).max(1).optional(),
  map: z.string().optional().describe("Texture image (project path or URL)"),
  normalMap: z.string().optional(),
  roughnessMap: z.string().optional(),
  aoMap: z.string().optional(),
  pbrFolder: z.string().optional().describe("A folder from assets_3d_save (ambientCG / Poly Haven texture set): colour, normal, roughness and AO maps are picked up by name"),
  repeat: z.tuple([z.number(), z.number()]).optional(),
});

const objectSchema = z.object({
  type: z.enum(["phone", "laptop", "box", "cylinder", "bottle", "sphere", "card", "plane"]),
  size: z.array(z.number().positive()).min(1).max(3).optional().describe("phone/laptop/box/card/plane: [w, h, d]; cylinder/bottle/sphere: [radius, height]"),
  position: vec3.optional(),
  rotation: vec3.optional().describe("Degrees"),
  material: materialSchema.optional(),
  decal: z.object({ image: z.string().describe("Project path or URL (your screenshot or artwork)"), fit: z.enum(["cover", "contain"]).optional(), background: color.optional(), arc: z.number().min(20).max(360).optional().describe("Label arc in degrees on cylinders and bottles") }).optional(),
});

const lightSchema = z.object({ type: z.enum(["directional", "point", "ambient", "hemisphere"]), color: color.optional(), intensity: z.number().min(0).max(20).optional(), position: vec3.optional(), shadow: z.boolean().optional() });

export const sceneSchema = z.object({
  width: z.number().int().min(200).max(3000).optional(),
  height: z.number().int().min(200).max(3000).optional(),
  background: color.optional().describe("A hex colour or transparent"),
  camera: z.object({ azimuth: z.number().optional(), elevation: z.number().optional(), distance: z.number().positive().optional(), fov: z.number().min(10).max(90).optional(), target: vec3.optional() }).optional(),
  environment: z.object({ hdri: z.string().optional().describe("A Poly Haven HDRI id (studio_small_09), or a project .hdr path"), resolution: z.enum(["1k", "2k"]).optional(), intensity: z.number().min(0).max(5).optional(), rotation: z.number().optional(), showBackground: z.boolean().optional() }).optional(),
  lights: z.union([z.enum(["studio", "soft", "dramatic"]), z.array(lightSchema).max(8)]).optional(),
  objects: z.array(objectSchema).min(1).max(12),
  ground: z.object({ shadow: z.boolean().optional(), opacity: z.number().min(0).max(1).optional() }).optional(),
  render: z.object({ exposure: z.number().min(0.1).max(4).optional(), toneMapping: z.enum(["aces", "neutral", "linear"]).optional() }).optional(),
});

// ---- quick mockup presets ------------------------------------------------------------------------------------

export const MOCKUPS = ["phone", "laptop", "box", "can", "bottle", "card", "poster"];

/** A complete scene for a named mockup around one image. */
export function mockupScene(kind, { image, color: base, background = "#e9e6df", width = 1600, height = 1000 } = {}) {
  const decal = image ? { image, fit: "cover" } : undefined;
  const common = { width, height, background, ground: { shadow: true, opacity: 0.3 }, lights: "studio" };
  switch (kind) {
    case "phone":
      return { ...common, camera: { azimuth: 24, elevation: 8, fov: 30 }, objects: [{ type: "phone", rotation: [0, 0, 0], material: { color: base || "#1b1b1f", metalness: 0.85, roughness: 0.3 }, decal }] };
    case "laptop":
      return { ...common, camera: { azimuth: 22, elevation: 14, fov: 30 }, objects: [{ type: "laptop", material: { color: base || "#c9ccd1", metalness: 0.9, roughness: 0.35 }, decal }] };
    case "box":
      return { ...common, camera: { azimuth: 28, elevation: 10, fov: 30 }, objects: [{ type: "box", size: [1, 1.4, 0.38], material: { color: base || "#f4f1ea", roughness: 0.55 }, decal }] };
    case "can":
      return { ...common, camera: { azimuth: 0, elevation: 8, fov: 28 }, objects: [{ type: "cylinder", size: [0.42, 1.3], material: { color: base || "#d5d8dc", metalness: 0.9, roughness: 0.28 }, decal: decal && { ...decal, arc: 360 } }] };
    case "bottle":
      return { ...common, camera: { azimuth: 0, elevation: 6, fov: 28 }, objects: [{ type: "bottle", size: [0.4, 1.7], material: { color: base || "#2f6b4f", roughness: 0.12, clearcoat: 0.8, metalness: 0.0 }, decal: decal && { ...decal, arc: 200 } }] };
    case "card":
      return { ...common, camera: { azimuth: 18, elevation: 30, fov: 30 }, objects: [{ type: "card", size: [1.7, 1.05, 0.012], rotation: [-62, 0, 0], material: { color: base || "#ffffff", roughness: 0.5 }, decal }] };
    case "poster":
      return { ...common, camera: { azimuth: 14, elevation: 4, fov: 30 }, objects: [{ type: "plane", size: [1.2, 1.7], material: { color: base || "#ffffff", roughness: 0.8 }, decal }] };
    default:
      throw new Error(`Unknown mockup "${kind}". Use one of: ${MOCKUPS.join(", ")}.`);
  }
}

// ---- preparing a scene for the page (inline every image and the HDRI) ---------------------------------------

async function inlineImage(src, maxSide = 2048) {
  if (!src) return undefined;
  if (src.startsWith("data:")) return src;
  const local = !/^https?:/i.test(src);
  const buf = local ? fs.readFileSync(projectPath(src)) : (await fetchImage(src)).buf;
  const jpeg = await toJpeg(buf, maxSide, maxSide, 90).catch(() => null);
  return jpeg ? dataUrl(jpeg) : dataUrl(buf, "image/png");
}

const PBR_NAMES = { map: /(color|diff|albedo|basecolor)/i, normalMap: /(normalgl|nor_gl|normal)/i, roughnessMap: /(rough)/i, aoMap: /(ambientocclusion|_ao|ao_)/i };

/** The map files in a texture folder, by role. */
export function findPbrMaps(folder) {
  const abs = projectPath(folder);
  const files = fs.readdirSync(abs).filter((f) => /\.(jpe?g|png)$/i.test(f));
  const out = {};
  for (const [role, re] of Object.entries(PBR_NAMES)) {
    const hit = files.filter((f) => re.test(f) && !(role === "map" && /normal/i.test(f)) && !(role === "normalMap" && /dx|directx/i.test(f)));
    if (hit.length) out[role] = path.join(folder, hit[0]);
  }
  return out;
}

/** Everything the page needs as plain data: images as data URLs, the HDRI as base64. */
export async function prepareScene(spec) {
  const scene = structuredClone(spec);
  for (const o of scene.objects) {
    const m = (o.material ||= {});
    if (m.pbrFolder) Object.assign(m, Object.fromEntries(Object.entries(findPbrMaps(m.pbrFolder)).filter(([k]) => !m[k])));
    for (const k of ["map", "normalMap", "roughnessMap", "aoMap"]) if (m[k]) m[k] = await inlineImage(m[k], 2048);
    if (o.decal) o.decal = { ...o.decal, image: await inlineImage(o.decal.image, 2048) };
  }
  const env = scene.environment;
  if (env?.hdri) {
    env.hdrBase64 = (await hdrBuffer(env.hdri, env.resolution || "1k")).toString("base64");
  }
  return scene;
}

// ---- the page ---------------------------------------------------------------------------------------------

// Written without backslashes or template placeholders on purpose: it is embedded as text.
const PAGE_SCRIPT = `
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
const S = window.__SCENE;
const W = S.width || 1600, H = S.height || 1000;
const rad = (d) => (d * Math.PI) / 180;
window.__ready = (async () => {
  try {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1); renderer.setSize(W, H, false);
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const tm = (S.render && S.render.toneMapping) || "aces";
    renderer.toneMapping = tm === "linear" ? THREE.NoToneMapping : tm === "neutral" ? THREE.NeutralToneMapping : THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = (S.render && S.render.exposure) || 1;
    document.getElementById("c").appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const transparent = !S.background || S.background === "transparent";
    if (transparent) renderer.setClearColor(0x000000, 0); else scene.background = new THREE.Color(S.background);

    const loader = new THREE.TextureLoader();
    const loadTex = async (url, srgb) => { const t = await loader.loadAsync(url); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };

    // a decal as a canvas texture of the target's aspect ratio, covered or contained
    const decalTexture = async (d, aspect) => {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("decal image failed to load")); i.src = d.image; });
      const cw = aspect >= 1 ? 2048 : Math.round(2048 * aspect), ch = aspect >= 1 ? Math.round(2048 / aspect) : 2048;
      const c = document.createElement("canvas"); c.width = cw; c.height = ch;
      const g = c.getContext("2d"); g.fillStyle = d.background && d.background !== "transparent" ? d.background : "#000000"; g.fillRect(0, 0, cw, ch);
      const ia = img.width / img.height;
      const contain = d.fit === "contain";
      let dw = cw, dh = cw / ia;
      if (contain ? dh > ch : dh < ch) { dh = ch; dw = ch * ia; }
      g.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
    };

    const material = async (m) => {
      m = m || {};
      const p = { color: m.color || "#cfcfcf", roughness: m.roughness ?? 0.5, metalness: m.metalness ?? 0, clearcoat: m.clearcoat ?? 0, clearcoatRoughness: 0.15 };
      if (m.map) p.map = await loadTex(m.map, true);
      if (m.normalMap) p.normalMap = await loadTex(m.normalMap, false);
      if (m.roughnessMap) p.roughnessMap = await loadTex(m.roughnessMap, false);
      if (m.aoMap) p.aoMap = await loadTex(m.aoMap, false);
      const mat = new THREE.MeshPhysicalMaterial(p);
      if (m.repeat) for (const t of [mat.map, mat.normalMap, mat.roughnessMap, mat.aoMap]) if (t) t.repeat.set(m.repeat[0], m.repeat[1]);
      if (m.map && m.color === undefined) mat.color.set(0xffffff);
      return mat;
    };

    const rrShape = (w, h, r) => { const s = new THREE.Shape(); const x = -w / 2, y = -h / 2; r = Math.min(r, w / 2, h / 2);
      s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; };
    const rrPlane = (w, h, r) => { const g = new THREE.ShapeGeometry(rrShape(w, h, r), 16); const pos = g.attributes.position, uv = g.attributes.uv;
      for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5); return g; };
    const mesh = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; return m; };

    const build = async (o) => {
      const g = new THREE.Group(); const sz = o.size || [];
      const mat = await material(o.material);
      const screenMat = async (aspect) => o.decal ? new THREE.MeshBasicMaterial({ map: await decalTexture(o.decal, aspect), toneMapped: false }) : new THREE.MeshBasicMaterial({ color: 0x0a0a0c, toneMapped: false });
      if (o.type === "phone") {
        const w = sz[0] || 0.78, h = sz[1] || 1.6, d = sz[2] || 0.085, r = w * 0.15;
        const geo = new THREE.ExtrudeGeometry(rrShape(w, h, r), { depth: d, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 4, curveSegments: 24 }); geo.translate(0, 0, -d / 2);
        g.add(mesh(geo, mat));
        const sw = w - 0.05, sh = h - 0.05;
        const screen = new THREE.Mesh(rrPlane(sw, sh, r - 0.02), await screenMat(sw / sh)); screen.position.z = d / 2 + 0.0135; g.add(screen);
        const isl = new THREE.Mesh(rrPlane(w * 0.27, 0.05, 0.025), new THREE.MeshBasicMaterial({ color: 0x000000 })); isl.position.set(0, h / 2 - 0.075, d / 2 + 0.0145); g.add(isl);
      } else if (o.type === "laptop") {
        const w = sz[0] || 1.6, h = sz[1] || 1.04, d = sz[2] || 1.1, open = 105;
        const base = mesh(new RoundedBoxGeometry(w, 0.045, d, 4, 0.018), mat); base.position.y = 0.0225; g.add(base);
        const deck = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.86, d * 0.5), new THREE.MeshStandardMaterial({ color: 0x1b1c1f, roughness: 0.8 })); deck.rotation.x = -Math.PI / 2; deck.position.set(0, 0.0465, -d * 0.12); g.add(deck);
        const pad = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.3, d * 0.2), new THREE.MeshStandardMaterial({ color: 0xaeb1b6, roughness: 0.4, metalness: 0.6 })); pad.rotation.x = -Math.PI / 2; pad.position.set(0, 0.0465, d * 0.3); g.add(pad);
        const lid = new THREE.Group(); lid.position.set(0, 0.045, -d / 2); lid.rotation.x = -rad(open - 90);
        const shell = mesh(new RoundedBoxGeometry(w, h, 0.03, 4, 0.014), mat); shell.position.y = h / 2; lid.add(shell);
        const sw = w - 0.09, sh = h - 0.1;
        const screen = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), await screenMat(sw / sh)); screen.position.set(0, h / 2 - 0.005, 0.0155); lid.add(screen);
        g.add(lid);
      } else if (o.type === "box") {
        const w = sz[0] || 1, h = sz[1] || 1.4, d = sz[2] || 0.35;
        g.add(mesh(new RoundedBoxGeometry(w, h, d, 4, Math.min(w, h, d) * 0.04), mat));
        if (o.decal) { const p = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.97, h * 0.97), await screenMat((w * 0.97) / (h * 0.97))); p.material.toneMapped = true; p.position.z = d / 2 + 0.0015; g.add(p); }
      } else if (o.type === "card") {
        const w = sz[0] || 1.7, h = sz[1] || 1.05, d = sz[2] || 0.012;
        g.add(mesh(new RoundedBoxGeometry(w, h, d, 3, 0.004), mat));
        if (o.decal) { const p = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.985, h * 0.985), await screenMat(w / h)); p.material.toneMapped = true; p.position.z = d / 2 + 0.0008; g.add(p); }
      } else if (o.type === "plane") {
        const w = sz[0] || 1.2, h = sz[1] || 1.7;
        const front = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 });
        if (o.decal) front.map = await decalTexture(o.decal, w / h);
        const p = mesh(new THREE.PlaneGeometry(w, h), front); p.material.side = THREE.DoubleSide; g.add(p);
      } else if (o.type === "sphere") {
        g.add(mesh(new THREE.SphereGeometry(sz[0] || 0.6, 64, 48), mat));
      } else if (o.type === "cylinder" || o.type === "bottle") {
        const r = sz[0] || 0.42, h = sz[1] || 1.3;
        let body, bodyR = r, labelY = 0, labelH = h * 0.62;
        if (o.type === "cylinder") { body = new THREE.CylinderGeometry(r, r, h, 72, 1); }
        else {
          const pts = [[0, 0], [r * 0.92, 0], [r, 0.04 * h], [r, 0.58 * h], [r * 0.96, 0.64 * h], [r * 0.62, 0.74 * h], [r * 0.4, 0.8 * h], [r * 0.38, 0.94 * h], [r * 0.46, 0.955 * h], [r * 0.46, h], [r * 0.32, h], [0, h * 0.985]].map((p) => new THREE.Vector2(p[0], p[1] - h / 2));
          body = new THREE.LatheGeometry(pts, 72); labelY = -0.12 * h; labelH = 0.4 * h;
        }
        g.add(mesh(body, mat));
        if (o.decal) {
          const arc = rad(o.decal.arc || 360);
          const aspect = (bodyR * arc) / labelH;
          const t = await decalTexture(o.decal, aspect);
          const lab = new THREE.Mesh(new THREE.CylinderGeometry(bodyR + 0.003, bodyR + 0.003, labelH, 72, 1, true, -arc / 2, arc), new THREE.MeshStandardMaterial({ map: t, roughness: 0.55, side: THREE.FrontSide }));
          lab.position.y = labelY; lab.rotation.y = 0; lab.castShadow = false; g.add(lab);
        }
      }
      const p = o.position || [0, 0, 0], r = o.rotation || [0, 0, 0];
      g.position.set(p[0], p[1], p[2]); g.rotation.set(rad(r[0]), rad(r[1]), rad(r[2]));
      return g;
    };

    const root = new THREE.Group(); scene.add(root);
    for (const o of S.objects) root.add(await build(o));
    // stand the group on the ground plane y = 0
    const box = new THREE.Box3().setFromObject(root); root.position.y -= box.min.y; box.setFromObject(root);
    const sphere = box.getBoundingSphere(new THREE.Sphere());

    // environment light
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = S.environment || {};
    if (env.hdrBase64) {
      const bin = atob(env.hdrBase64); const bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([bytes]));
      const hdr = await new RGBELoader().loadAsync(url); hdr.mapping = THREE.EquirectangularReflectionMapping;
      const tex = pmrem.fromEquirectangular(hdr).texture; scene.environment = tex;
      if (env.showBackground) scene.background = tex;
      if (env.intensity !== undefined) scene.environmentIntensity = env.intensity;
      if (env.rotation) scene.environmentRotation.y = rad(env.rotation);
    } else {
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = (env.intensity !== undefined ? env.intensity : 0.55);
    }

    // lights
    const lightsSpec = S.lights || "studio";
    const addLight = (l) => {
      const c = l.color || "#ffffff", i = l.intensity ?? 1, p = l.position || [3, 5, 4];
      let L;
      if (l.type === "ambient") L = new THREE.AmbientLight(c, i);
      else if (l.type === "hemisphere") L = new THREE.HemisphereLight(c, "#6b6f78", i);
      else if (l.type === "point") L = new THREE.PointLight(c, i * 30, 0, 2);
      else L = new THREE.DirectionalLight(c, i);
      L.position.set(p[0], p[1], p[2]);
      if (l.shadow && L.shadow) { L.castShadow = true; L.shadow.mapSize.set(2048, 2048); const r = Math.max(2.5, sphere.radius * 2); Object.assign(L.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: 0.1, far: 30 }); L.shadow.bias = -0.0006; L.shadow.normalBias = 0.02; L.shadow.radius = 5; }
      scene.add(L);
    };
    const preset = { studio: [{ type: "directional", intensity: 2.4, position: [3, 5, 4], shadow: true }, { type: "hemisphere", intensity: 0.6 }, { type: "directional", color: "#cfe4ff", intensity: 1.3, position: [-4, 3, -3] }],
      soft: [{ type: "directional", intensity: 1.2, position: [2, 6, 3], shadow: true }, { type: "hemisphere", intensity: 1.1 }],
      dramatic: [{ type: "directional", intensity: 3.6, position: [-4, 3, 2], shadow: true }, { type: "directional", color: "#6f8cff", intensity: 0.8, position: [4, 2, -3] }] };
    (Array.isArray(lightsSpec) ? lightsSpec : preset[lightsSpec] || preset.studio).forEach(addLight);
    if (lightsSpec === "dramatic" && scene.environmentIntensity !== undefined && !env.intensity) scene.environmentIntensity = 0.18;

    // shadow catcher
    if (!S.ground || S.ground.shadow !== false) {
      const gr = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: (S.ground && S.ground.opacity) ?? 0.3 }));
      gr.rotation.x = -Math.PI / 2; gr.position.y = 0.0005; gr.receiveShadow = true; scene.add(gr);
    }

    // camera
    const cam = S.camera || {};
    const camera = new THREE.PerspectiveCamera(cam.fov || 30, W / H, 0.05, 200);
    const target = new THREE.Vector3(...(cam.target || [sphere.center.x, sphere.center.y, sphere.center.z]));
    const vfov = rad(camera.fov), hfov = 2 * Math.atan(Math.tan(vfov / 2) * (W / H));
    const dist = cam.distance || (sphere.radius / Math.sin(Math.min(vfov, hfov) / 2)) * 0.92;
    const place = (az) => { const a = rad(az), e = rad(cam.elevation ?? 10); camera.position.set(target.x + dist * Math.cos(e) * Math.sin(a), target.y + dist * Math.sin(e), target.z + dist * Math.cos(e) * Math.cos(a)); camera.lookAt(target); };
    window.__render = (az, mime) => { place(az === undefined ? (cam.azimuth || 0) : az); renderer.render(scene, camera); return renderer.domElement.toDataURL(mime || "image/png", 0.9); };
    window.__info = { radius: sphere.radius, distance: dist, renderer: (renderer.getContext().getExtension("WEBGL_debug_renderer_info") ? renderer.getContext().getParameter(renderer.getContext().getExtension("WEBGL_debug_renderer_info").UNMASKED_RENDERER_WEBGL) : "webgl") };
    return true;
  } catch (e) { window.__error = String((e && e.message) || e); return false; }
})();
`;

/** The page for a prepared scene (images inlined). */
export function scenePage(prepared, { base = THREE_BASE } = {}) {
  const importMap = { imports: { three: `${base}/build/three.module.js`, "three/addons/": `${base}/examples/jsm/` } };
  const json = JSON.stringify(prepared).replace(/</g, "\\u003c");
  return `<!doctype html><meta charset=utf-8><style>html,body{margin:0;background:#000}#c{width:${prepared.width || 1600}px;height:${prepared.height || 1000}px}canvas{display:block}</style>
<div id=c></div>
<script type=importmap>${JSON.stringify(importMap)}</script>
<script>window.__SCENE = ${json};</script>
<script type=module>${PAGE_SCRIPT}</script>`;
}

/** Render a scene spec to PNG buffers: one still, plus turntable frames when asked. Returns { still, frames, info }. */
export async function renderScene(spec, { turntable, config, timeout = 60000 } = {}) {
  const prepared = await prepareScene(spec);
  const width = prepared.width || 1600;
  const height = prepared.height || 1000;
  const dir = tempDir("drip-scene-");
  const file = path.join(dir, "scene.html");
  fs.writeFileSync(file, scenePage(prepared));
  const toBuf = (u) => Buffer.from(u.split(",")[1], "base64");
  try {
    return await withTab(config, async (tab) => {
      await openPage(tab, pathToFileURL(file).href, { width, height, settleMs: 200, timeout });
      const ok = await tab.s("Runtime.evaluate", { expression: "window.__ready", awaitPromise: true, returnByValue: true });
      if (!ok.result.value) {
        const { result } = await tab.s("Runtime.evaluate", { expression: "window.__error || 'unknown error'", returnByValue: true });
        throw new Error(`The scene did not render: ${result.value}. It needs WebGL in the browser and internet for the pinned three.js (${THREE_BASE}).`);
      }
      const ev = async (expr) => (await tab.s("Runtime.evaluate", { expression: expr, returnByValue: true })).result.value;
      const still = toBuf(await ev("window.__render()"));
      const info = await ev("window.__info");
      const frames = [];
      if (turntable?.frames > 1) {
        const start = prepared.camera?.azimuth || 0;
        for (let i = 0; i < turntable.frames; i++) frames.push(toBuf(await ev(`window.__render(${start + (i * (turntable.sweep || 360)) / turntable.frames}, "image/webp")`)));
      }
      return { still, frames, info, width, height };
    });
  } finally {
    cleanDir(dir);
  }
}

export function register(server, ctx) {
  registerViewer(server);
  server.registerTool(
    "scene_render",
    {
      title: "Render a 3D mockup or product scene",
      description:
        "Renders a three.js scene in headless Chrome: device and packaging mockups with your screenshot or artwork on the screen / front / label, simple product forms, camera, lights, PBR materials, an optional Poly Haven HDRI (see assets_3d_search), a turntable. PNG (transparent background possible) or WebP, plus the scene JSON. " +
        "Quick start: mockup + image (phone, laptop, box, can, bottle, card, poster). Full control: scene (objects, materials, camera azimuth/elevation/fov, lights studio|soft|dramatic, environment.hdri, render.exposure); the result returns the full scene so you can change one value and render again. " +
        "The decal image is your real screenshot (fitcheck_shot output, a project image): never an invented UI. Software WebGL is slower than a GPU but gives the same picture; three.js loads from a pinned jsDelivr URL (internet needed the first time). " +
        'Example: scene_render({ mockup: "phone", image: "public/shots/home-mobile.png", background: "#e9e6df", out: "public/img/phone-mockup.webp" })',
      inputSchema: {
        mockup: z.enum(MOCKUPS).optional().describe("A ready-made scene around one image"),
        image: z.string().optional().describe("The screenshot or artwork (project path or URL) for the mockup"),
        color: z.string().optional().describe("Body or material colour for the mockup"),
        background: z.string().optional().describe("Hex colour or transparent (default #e9e6df)"),
        scene: sceneSchema.optional().describe("A full scene spec (replaces mockup)"),
        width: z.number().int().min(200).max(3000).optional(),
        height: z.number().int().min(200).max(3000).optional(),
        turntable: z.object({ frames: z.number().int().min(4).max(72), sweep: z.number().min(30).max(360).optional() }).optional().describe("Orbit the camera: N frames, written as an animated WebP"),
        out: z.string().optional().describe("Project path: .png (keeps transparency) or .webp. The scene JSON is written next to it"),
      },
      _meta: studioToolMeta(),
    },
    safe(async (args) => {
      const spec = args.scene ? sceneSchema.parse(args.scene) : mockupScene(args.mockup || "phone", { image: args.image, color: args.color, background: args.background, width: args.width, height: args.height });
      if (args.scene) {
        if (args.width) spec.width = args.width;
        if (args.height) spec.height = args.height;
        if (args.background) spec.background = args.background;
      }
      if (!args.scene && !args.mockup && !args.image) throw new Error("Pass mockup (and image), or a full scene.");
      sceneSchema.parse(spec);
      const t0 = Date.now();
      const r = await renderScene(spec, { turntable: args.turntable, config: ctx.config() });
      const seconds = ((Date.now() - t0) / 1000).toFixed(1);
      const files = [];
      if (args.out) {
        const ext = path.extname(args.out).slice(1).toLowerCase();
        if (!["png", "webp"].includes(ext)) throw new Error("out must end in .png or .webp");
        const buf = ext === "png" ? r.still : (await processImage(r.still, { outputs: [{ name: "", width: r.width, format: "webp" }], focus: { x: 0.5, y: 0.5 }, maxKB: 600, config: ctx.config() })).files[0].buf;
        files.push(saveFile(args.out, buf));
        const stem = args.out.replace(/\.[a-z]+$/i, "");
        files.push(saveFile(`${stem}.scene.json`, JSON.stringify(spec, null, 2)));
        if (r.frames.length) files.push(saveFile(`${stem}-turntable.webp`, animatedWebp(r.frames, { fps: 24 })));
      }
      const flat = await toJpeg(r.still, 1280, 900, 85);
      const content = [
        textBlock(
          `Scene ${r.width}x${r.height} rendered in ${seconds}s (${r.info?.renderer || "webgl"}), camera ${JSON.stringify(spec.camera || {})}.${files.length ? `\nSaved: ${files.map((f) => `${f.rel} (${f.kb} KB)`).join(", ")}.` : ""}\n` +
            `Scene (edit and pass back as scene): ${JSON.stringify({ ...spec, objects: spec.objects.map((o) => ({ ...o, decal: o.decal && { ...o.decal, image: o.decal.image.slice(0, 80) } })) })}`,
        ),
        imageBlock(flat),
      ];
      if (r.frames.length) {
        const pick = Array.from({ length: Math.min(8, r.frames.length) }, (_, i) => r.frames[Math.round((i * (r.frames.length - 1)) / Math.max(1, Math.min(8, r.frames.length) - 1))]);
        const sheet = await contactSheet(pick, { cols: 4, tileW: 320, tileH: Math.round((320 * r.height) / r.width) }).catch(() => null);
        if (sheet) content.push(imageBlock(sheet));
      }
      const camera = spec.camera || {};
      const controls = [
        { key: "scene.camera.azimuth", label: "Azimuth", type: "range", min: -180, max: 180, step: 1, value: camera.azimuth ?? 0 },
        { key: "scene.camera.elevation", label: "Elevation", type: "range", min: 0, max: 70, step: 1, value: camera.elevation ?? 10 },
        { key: "scene.render.exposure", label: "Exposure", type: "range", min: 0.4, max: 2, step: 0.05, value: spec.render?.exposure ?? 1 },
      ];
      const viewScene = { ...spec, render: { exposure: 1, ...(spec.render || {}) }, camera: { azimuth: 0, elevation: 10, ...camera } };
      return studioResult(server, { content }, { tool: "scene_render", args: { ...args, scene: viewScene, mockup: undefined, image: undefined }, title: `Scene: ${args.mockup || "custom"}`, summary: `${spec.objects.map((o) => o.type).join(" + ")}, ${seconds}s`, image: dataUrl(flat), controls });
    }),
  );
}

