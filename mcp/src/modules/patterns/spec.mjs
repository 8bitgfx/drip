// Readable form of a spec, and numeric deltas between two specs (reference vs implementation).

const list = (a) => (a && a.length ? a : []);
const kv = (o) => Object.entries(o || {}).map(([k, v]) => `${k} ${v}`).join(", ");

export function specToMarkdown(spec, { name, notes } = {}) {
  const L = [];
  const src = spec.source || {};
  L.push(`# ${name || spec.root?.tag || "Pattern"}`);
  L.push("");
  L.push(`Source: ${src.url || src.file || "unknown"}${src.title ? ` (${src.title})` : ""}${src.author ? ` by ${src.author}` : ""}. Captured ${src.capturedAt || "?"}. Kind: ${spec.kind}${spec.inferred ? ", INFERRED from pixels" : ", measured from the live page"}.`);
  if (spec.note) L.push("", `> ${spec.note}`);
  if (notes) L.push("", notes);
  if (spec.root?.rect) L.push("", `Root: ${spec.root.tag || ""} ${spec.root.rect.w}x${spec.root.rect.h}px, background ${spec.root.background}.`);
  if (spec.colors) {
    L.push("", "## Colour roles", kv(spec.colors.roles) || "none");
    L.push(`Palette: ${list(spec.colors.palette).map((c) => c.hex).join(" ")}`);
  }
  if (spec.type) {
    L.push("", "## Type", ...list(spec.type.scale).slice(0, 8).map((t) => `- ${t.px}px / ${t.lineHeight} w${t.weight} ${t.family}${t.letterSpacingEm ? ` ls ${t.letterSpacingEm}em` : ""}${t.textTransform ? ` ${t.textTransform}` : ""}: "${t.sample}"`));
  }
  if (spec.hierarchy?.length) L.push("", "Hierarchy: " + spec.hierarchy.map((h) => `${h.size}px/${h.weight} "${h.text}"`).join(" > "));
  if (spec.spacing) L.push("", "## Spacing", `Padding: ${list(spec.spacing.padding).map((p) => `${p.value}px x${p.count}`).join(", ") || "none"}; gaps: ${list(spec.spacing.gaps).map((p) => `${p.value}px x${p.count}`).join(", ") || "none"}${spec.spacing.unit ? `; on a ${spec.spacing.unit}px grid` : ""}.`);
  if (spec.radii?.length) L.push(`Radii: ${spec.radii.map((r) => `${r.value} x${r.count}`).join(", ")}.`);
  if (spec.shadows?.length) L.push(`Shadows: ${spec.shadows.map((r) => r.value).join(" | ")}.`);
  if (spec.structure?.length) {
    L.push("", "## Structure (x, y, w x h relative to the root)");
    for (const n of spec.structure.slice(0, 30)) L.push(`${"  ".repeat(Math.min(n.depth, 5))}- ${n.tag} ${n.rect.x},${n.rect.y} ${n.rect.w}x${n.rect.h}${n.layout && n.layout !== "block" ? ` [${n.layout}]` : ""}${n.type ? ` ${n.type}` : ""}${n.color ? ` ${n.color}` : ""}${n.bg ? ` on ${n.bg}` : ""}${n.radius ? ` r${n.radius}` : ""}${n.border ? ` border ${n.border}` : ""}${n.text ? ` "${n.text}"` : ""}`);
  }
  if (spec.states?.length) {
    L.push("", "## States");
    for (const s of spec.states) {
      L.push(`- ${s.label}${s.error ? ` (step failed: ${s.error})` : ""}`);
      for (const c of list(s.changes).slice(0, 6)) L.push(`  - ${c.target}: ${Object.entries(c.props).map(([k, v]) => `${k} ${v[0]} -> ${v[1]}`).join("; ")}`);
      for (const a of list(s.appeared).slice(0, 4)) L.push(`  - appears: ${a.target} ${a.rect.w}x${a.rect.h}`);
      for (const a of list(s.disappeared).slice(0, 3)) L.push(`  - disappears: ${a.target}`);
    }
  }
  if (spec.motion) {
    L.push("", "## Motion");
    for (const m of list(spec.motion.declared).slice(0, 10)) L.push(`- ${m.target}: ${list(m.transitions).map((t) => `transition ${t.property} ${t.duration}ms ${t.easing}${t.delay ? ` +${t.delay}ms` : ""}`).concat(list(m.animations).map((a) => `animation ${a.name} ${a.duration}ms ${a.easing} x${a.iterations}`)).join("; ")}`);
    for (const o of list(spec.motion.observed)) {
      L.push(`- observed on "${o.state}": ${list(o.animations).map((a) => `${a.kind} ${a.name} on ${a.target} ${a.durationMs}ms ${a.easing}`).join("; ") || "none"}${o.settleMs ? `; settled after ${o.settleMs}ms` : ""}`);
      for (const t of list(o.traces).slice(0, 3)) L.push(`  - ${t.target}: opacity ${t.from.opacity}->${t.to.opacity}, transform ${t.from.transform || "none"} -> ${t.to.transform || "none"}, size ${t.from.w}x${t.from.h} -> ${t.to.w}x${t.to.h}`);
    }
    if (spec.motion.reducedMotionRules !== undefined) L.push(`prefers-reduced-motion rules: ${spec.motion.reducedMotionRules ? "yes" : "none found"}.`);
  }
  if (spec.responsive) {
    L.push("", "## Responsive");
    for (const [w, r] of Object.entries(spec.responsive)) L.push(`- ${w}px: root ${r.rect.w}x${r.rect.h}, ${r.layout}, ${r.visibleChildren} visible children${r.hiddenChildren ? `, ${r.hiddenChildren} hidden` : ""}, text ${r.minFontPx}-${r.maxFontPx}px${r.overflowX ? ", OVERFLOWS X" : ""}${r.minTarget !== null ? `, smallest target ${r.minTarget}px` : ""}`);
  }
  if (spec.keyboard) {
    const k = spec.keyboard;
    L.push("", "## Keyboard", `Tab stops: ${k.tabStops} (${list(k.tabOrder).map((t) => t.element).join(" > ") || "none"}); focus ring on every stop: ${k.allFocusVisible ? "yes" : "no"}.`);
    if (k.popup) L.push(`Popup trigger ${k.popup.trigger}: opens with keyboard ${k.popup.opensWithKeyboard ? "yes" : "no"}, Escape closes ${k.popup.closesWithEscape ? "yes" : "no"}, focus after Escape ${k.popup.focusAfterEscape}.`);
  }
  if (spec.aria) L.push("", "## ARIA", `Roles: ${list(spec.aria.roles).map((r) => `${r.value} x${r.count}`).join(", ") || "none"}; attributes: ${list(spec.aria.attrs).map((r) => `${r.value} x${r.count}`).join(", ") || "none"}; ${spec.aria.interactive} interactive, ${spec.aria.tabbable} tabbable.`, ...list(spec.aria.issues).map((i) => `- issue: ${i}`));
  if (spec.layoutBands) L.push("", "## Layout bands (inferred)", ...spec.layoutBands.map((b) => `- y ${b.y}, ${b.h}px tall`));
  return L.join("\n") + "\n";
}

// ---- deltas ---------------------------------------------------------------------------------------
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const dist = (a, b) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i]));
const pct = (a, b) => (a === 0 ? (b === 0 ? 0 : 100) : Math.round((Math.abs(b - a) / a) * 100));
const nearest = (arr, v) => [...arr].sort((a, b) => Math.abs(a - v) - Math.abs(b - v))[0];

/** Numeric differences between a reference spec and an implementation's spec. Severity: high / medium / low. */
export function compareSpecs(ref, impl) {
  const out = [];
  const add = (area, what, refV, implV, severity = "medium") => out.push({ area, what, reference: refV, implementation: implV, severity });
  if (ref.inferred) {
    // Only colours and size are known for a screenshot.
    for (const [role, hex] of Object.entries(ref.colors?.roles || {})) {
      const near = (impl.colors?.palette || []).map((c) => dist(hex, c.hex)).sort((a, b) => a - b)[0];
      if (near === undefined || near > 24) add("colour", `${role} ${hex}: nearest colour in the implementation`, hex, near === undefined ? "none" : `ΔRGB ${Math.round(near)}`, near > 60 ? "high" : "medium");
    }
    return out;
  }
  for (const [w, r] of Object.entries(ref.responsive || {})) {
    const i = impl.responsive?.[w];
    if (!i) continue;
    const dw = pct(r.rect.w, i.rect.w);
    const dh = pct(r.rect.h, i.rect.h);
    if (dw > 8 || dh > 8) add("geometry", `root size at ${w}px`, `${r.rect.w}x${r.rect.h}`, `${i.rect.w}x${i.rect.h}`, dw > 25 || dh > 25 ? "high" : "medium");
    if (r.layout !== i.layout) add("layout", `root layout at ${w}px`, r.layout, i.layout, "low");
    if (r.overflowX !== i.overflowX && i.overflowX) add("responsive", `horizontal overflow at ${w}px`, "no", "yes", "high");
    if (r.visibleChildren !== i.visibleChildren) add("responsive", `visible children at ${w}px`, r.visibleChildren, i.visibleChildren, "low");
  }
  const implSizes = (impl.type?.scale || []).map((t) => t.px);
  for (const t of (ref.type?.scale || []).slice(0, 6)) if (!implSizes.some((p) => Math.abs(p - t.px) <= 1)) add("type", `size ${t.px}px w${t.weight} ("${t.sample}")`, `${t.px}px`, `nearest ${nearest(implSizes, t.px) ?? "none"}px`, t.count > 4 ? "medium" : "low");
  const rf = (ref.type?.families?.[0] || {}).value;
  const imf = (impl.type?.families?.[0] || {}).value;
  if (rf && imf && rf !== imf) add("type", "main font family", rf, imf, "low");
  for (const [role, hex] of Object.entries(ref.colors?.roles || {})) {
    const o = impl.colors?.roles?.[role];
    if (!o) add("colour", `${role} role missing`, hex, "none", role === "accent" ? "low" : "medium");
    else if (dist(hex, o) > 30) add("colour", role, hex, `${o} (ΔRGB ${Math.round(dist(hex, o))})`, dist(hex, o) > 90 ? "high" : "medium");
  }
  const rr = (ref.radii || []).map((r) => r.value).join(" ");
  const ir = (impl.radii || []).map((r) => r.value).join(" ");
  if (rr !== ir) add("shape", "corner radii", rr || "none", ir || "none", "low");
  if ((ref.shadows || []).length !== (impl.shadows || []).length) add("shape", "shadow count", (ref.shadows || []).length, (impl.shadows || []).length, "low");
  const ip = (impl.spacing?.padding || []).map((p) => p.value);
  for (const p of (ref.spacing?.padding || []).slice(0, 4)) if (!ip.some((v) => Math.abs(v - p.value) <= 1)) add("spacing", `padding ${p.value}px (used ${p.count}x)`, `${p.value}px`, `nearest ${nearest(ip, p.value) ?? "none"}px`, "low");
  const anims = (s) => [...(s.motion?.observed || []).flatMap((o) => o.animations || []), ...(s.motion?.declared || []).flatMap((d) => (d.transitions || []).map((t) => ({ name: t.property, durationMs: t.duration, easing: t.easing })))];
  const refAnims = anims(ref);
  const implAnims = anims(impl);
  const longest = (a) => {
    const v = a.map((x) => x.durationMs).filter((x) => x > 0);
    return v.length ? Math.max(...v) : null;
  };
  const rm = longest(refAnims);
  const im = longest(implAnims);
  if (rm !== null && im === null) add("motion", "implementation has no transitions or animations", `~${rm}ms`, "none", "high");
  else if (rm !== null && Math.abs(im - rm) > Math.max(30, rm * 0.2)) add("motion", "longest transition or animation", `${rm}ms`, `${im}ms`, "medium");
  const rEase = new Set(refAnims.map((a) => a.easing));
  const iEase = new Set(implAnims.map((a) => a.easing));
  if (rEase.size && iEase.size && ![...rEase].some((e) => iEase.has(e))) add("motion", "easing", [...rEase].slice(0, 2).join(" | "), [...iEase].slice(0, 2).join(" | "), "low");
  for (const s of ref.states || []) {
    const m = (impl.states || []).find((x) => x.label === s.label);
    if (!m) continue;
    const rc = (s.changes?.length || 0) + (s.appeared?.length || 0);
    const ic = (m.changes?.length || 0) + (m.appeared?.length || 0);
    if (rc > 0 && ic === 0) add("state", `"${s.label}" changes nothing in the implementation`, `${rc} change(s)`, "0", "high");
    else if ((s.appeared?.length || 0) !== (m.appeared?.length || 0)) add("state", `"${s.label}": elements that appear`, s.appeared?.length || 0, m.appeared?.length || 0, "medium");
  }
  const rk = ref.keyboard;
  const ik = impl.keyboard;
  if (rk && ik) {
    if (rk.tabStops !== ik.tabStops) add("keyboard", "tab stops", rk.tabStops, ik.tabStops, ik.tabStops < rk.tabStops ? "high" : "low");
    if (rk.allFocusVisible && !ik.allFocusVisible) add("keyboard", "visible focus ring on every stop", "yes", "no", "high");
    if (rk.popup && !ik.popup) add("keyboard", "popup trigger", rk.popup.trigger, "none found", "medium");
    if (rk.popup && ik.popup) {
      if (rk.popup.opensWithKeyboard && !ik.popup.opensWithKeyboard) add("keyboard", "opens from the keyboard", "yes", "no", "high");
      if (rk.popup.closesWithEscape && !ik.popup.closesWithEscape) add("keyboard", "Escape closes", "yes", "no", "high");
    }
  }
  const rRoles = new Set((ref.aria?.roles || []).map((r) => r.value));
  const iRoles = new Set((impl.aria?.roles || []).map((r) => r.value));
  for (const r of rRoles) if (!iRoles.has(r)) add("aria", `role ${r}`, "present", "missing", "medium");
  for (const a of (ref.aria?.attrs || []).slice(0, 8)) if (!(impl.aria?.attrs || []).some((x) => x.value === a.value)) add("aria", a.value, `x${a.count}`, "missing", "low");
  return out;
}
