# Camera: 2.5D and 3D

A camera adds scale, depth and attention. It also adds risk: a constant drift reads as "cinematic" and means nothing.
Move the camera only for a reason (reveal, emphasise, connect), and design where it ends before how it gets there.

## Destination first

1. Design the final frame (the camera's resting frame) as a composition: focal point, margins, what is cropped.
2. Design the start frame the same way.
3. Then design the path: how long, what curve, what passes through the frame on the way.
4. Check the frames between with `motion_frames` and `from`, `to`, `step`.

A camera move that ends on an accidental frame (a half-cropped word, a focal point on the edge) is the most common
fault. Fix the destination, not the path.

## A 2D camera in the DOM

Put the world in a group, and move the group opposite to the camera.

```js
const cam = { x: 0, y: 0, z: 1, r: 0 };                 // centre of view, zoom, roll
const world = S("#world");
function applyCam() {
  gsap.set(world, { transformOrigin: "0 0", x: W / 2 - cam.x * cam.z, y: H / 2 - cam.y * cam.z, scale: cam.z, rotation: cam.r });
}
applyCam();
tl.to(cam, { x: 1400, y: 600, z: 1.8, duration: 1.4, ease: "expo.inOut", onUpdate: applyCam }, "move");
```

Everything inside `#world` is positioned in world coordinates, so the camera can go anywhere.

## Parallax layers

Depth comes from layers moving at different speeds when the camera moves.

| Layer | Speed factor | Blur | Example |
|---|---|---|---|
| Far background | 0.2-0.4 | slight | gradient, large soft shapes |
| Mid background | 0.5-0.7 | none | secondary shapes |
| Subject | 1.0 | none | the motif and the lead |
| Foreground | 1.3-1.8 | 2-6px, slightly out of focus | a corner of a shape sliding past |

```js
const layers = [{ el: "#far", k: 0.3 }, { el: "#mid", k: 0.65 }, { el: "#main", k: 1 }, { el: "#near", k: 1.5 }];
function applyParallax() { for (const l of layers) gsap.set(l.el, { x: -cam.x * l.k, y: -cam.y * l.k }); }
```

Add a small scale difference (far layers scale less with zoom) to make zooms feel three-dimensional.

## Moves and what they say

| Move | Meaning | Numbers |
|---|---|---|
| Push in (dolly in) | focus, intimacy, importance | scale 1 to 1.3-1.6 over 1.2-2.0s, `power3.inOut` |
| Pull back (dolly out) | reveal scale, context, "this was part of something bigger" | 1.6 to 1 or 3 to 0.5, `expo.out`; start on a detail |
| Pan | follow, connect two places | 0.8-1.4s, `power3.inOut`; match the speed of the object it follows |
| Orbit | show a form from all sides | 20-60 degrees over 2-4s, slow, linear or `power1.inOut` |
| Crane or tilt | reveal height | 0.8-1.4s |
| Roll | disorientation, energy | 3-10 degrees, brief; use sparingly |
| Handheld drift | liveliness during a hold | 2-6px noise, seeded, 0.2-0.5Hz |

A pull-back reveal is the film's strongest scale move: start tight on a detail (a letter, a single pixel row), then
pull back to show the whole (the whole page, the whole city). Start the pull-back after a hold.

## Depth of field, sparingly

- Blur the background and foreground when the camera focuses on one element; sharpen at the destination.
- Use `filter: blur(Npx)` on layers: N 2-8px; blur is expensive per frame, so apply to few layers, and prefer
  pre-blurred images over live filters at 4K.
- Do not blur text that must be read; focus pulls take 0.4-0.8s.

## Isometric and 2.5D

- Isometric: rotate a flat group `rotateX(60deg) rotateZ(-45deg)` and animate children with `z` (`translateZ`) to make
  stacks and layers.
- Put `transform-style: preserve-3d` on the parent and `perspective: 1600px` on the stage or world.
- Animate the height of elements to build things up: a flat grid raising into a skyline.
- Keep the angle fixed; move the subject, not the camera, unless the move is the point.

## three.js on the master clock

The camera is another object animated on `tl`. Never use the render loop's clock.

```js
const renderer = new THREE.WebGLRenderer({ canvas: S("#gl"), antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H, false);
const camera = new THREE.PerspectiveCamera(35, W / H, 0.1, 200);
const cam = { x: 0, y: 2, z: 14, lx: 0, ly: 0, lz: 0 };           // position and look-at target
function render() {
  camera.position.set(cam.x, cam.y, cam.z);
  camera.lookAt(cam.lx, cam.ly, cam.lz);
  renderer.render(scene, camera);
}
tl.to(cam, { x: 6, z: 7, y: 1.2, lx: 0, ly: 0.4, duration: 2.2, ease: "power3.inOut", onUpdate: render }, "orbit");
tl.eventCallback("onUpdate", render);          // render on every seek, including no-op ones
```

Rules for three.js:

- Everything in the scene (rotation, position, material uniforms) is driven from `tl` through plain objects with
  `onUpdate`, not through `mesh.rotation.y += 0.01` in a loop.
- Use `preserveDrawingBuffer: true` so captures are not blank.
- Load models and textures before frame 0; wait for them before the first seek.
- Make a local copy of three.js for the final render.
- A fixed light setup, and shadows only on the key object (shadow maps are expensive).
- Prefer a lower pixel ratio (1) in a render; the size is already the film's size.

## Checks

- [ ] The camera's end frame is a designed still.
- [ ] Each move has a reason (reveal, focus, connect) written in the storyboard.
- [ ] No constant slow zoom under every scene.
- [ ] Parallax speeds differ per layer; the foreground is not sharper than the subject.
- [ ] Blur is used on at most two layers at once.
- [ ] Sequences of moves keep direction and speed (`drip_guide video/continuity`).
