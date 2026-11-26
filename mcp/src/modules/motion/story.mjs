// The storyboard: the film's plan, checked before any composition is written. Pure functions (tested).

// Copy that reads as a corporate AI assistant. Each entry: the words, and why.
export const SLOP_COPY = [
  [/\b(unlock|unleash)(ing)? (the )?(power|potential)\b/i, "\"unlock the power\" says nothing; name the specific thing it does"],
  [/\brevolutioni[sz](e|ing|ary)\b/i, "\"revolutionary\" is a claim, not a benefit"],
  [/\b(seamless(ly)?|effortless(ly)?)\b/i, "\"seamless\" is filler; show the step that disappeared"],
  [/\bnext[- ]gen(eration)?\b/i, "\"next-generation\" is filler"],
  [/\b(game[- ]chang(er|ing)|cutting[- ]edge|state[- ]of[- ]the[- ]art|transformative|supercharge|elevate your|empower(s|ing)? (you|teams))\b/i, "a stock buzzword: say what changes for the viewer"],
  [/\b(ai[- ]powered|ai[- ]driven)\b/i, "\"AI-powered\" describes the plumbing; show what the viewer gets"],
  [/\bin today'?s (fast[- ]paced )?world\b/i, "a stock opener"],
  [/\b(welcome to the future|the future of [a-z]+ is here)\b/i, "a stock opener"],
];

export const ROLES = ["moves", "look", "story", "sound"];

/** Words a beat's copy uses that read as AI slop: [{ beat, word, why }]. */
export function slopIn(beats = []) {
  const out = [];
  for (const [i, b] of beats.entries())
    for (const field of [b.text, b.voice])
      for (const [re, why] of SLOP_COPY) {
        const m = String(field || "").match(re);
        if (m) out.push({ beat: i + 1, word: m[0], why });
      }
  return out;
}

/**
 * Check a storyboard. Returns { errors, warnings }. Errors stop it being recorded; warnings are told to the
 * director (rest, hooks and transitions are judgement calls, never hard rules).
 */
export function checkStoryboard(sb, { studied = [] } = {}) {
  const errors = [];
  const warnings = [];
  const beats = [...(sb.beats || [])].sort((a, b) => a.at - b.at);
  const D = sb.format?.duration || (beats.length ? Math.max(...beats.map((b) => b.at + b.len)) : 0);
  if (!beats.length) errors.push("no beats: the film needs a timed beat list (at, len, action)");
  const refs = sb.references || [];
  const seen = new Set(studied.map((s) => String(s.source)));
  const backed = refs.filter((r) => seen.has(String(r.source)) || r.given);
  if (!backed.length)
    errors.push("no studied reference: motion_refs, then motion_study on 1-3 films (a MOVES reference at least), and name each in references with what you take from it. A reference the user gave counts: mark it given: true");
  for (const r of refs) if (!String(r.take || "").trim() || String(r.take).trim().split(/\s+/).length < 4) errors.push(`reference ${r.source}: say what you take from it (\"take\", a concrete technique: \"the trailing edge springs later than the leading edge\")`);
  for (const s of slopIn(beats)) errors.push(`beat ${s.beat}: "${s.word}": ${s.why}`);
  // Timing: gaps and overlaps are usually typos; an intentional overlap is a crossfade and says so.
  for (let i = 1; i < beats.length; i++) {
    const prevEnd = beats[i - 1].at + beats[i - 1].len;
    if (beats[i].at - prevEnd > 0.05) warnings.push(`gap ${prevEnd.toFixed(2)}-${beats[i].at.toFixed(2)}s between beats ${i} and ${i + 1}: what is on screen?`);
    if (prevEnd - beats[i].at > 0.6 && !/cross|overlap|dissolve|blend/i.test(beats[i].transition || "")) warnings.push(`beats ${i} and ${i + 1} overlap by ${(prevEnd - beats[i].at).toFixed(1)}s`);
  }
  if (beats.length && D && beats.at(-1).at + beats.at(-1).len < D - 0.1) warnings.push(`the beats end at ${(beats.at(-1).at + beats.at(-1).len).toFixed(1)}s but the film is ${D}s`);
  if (beats.length && beats[0].at > 0.05) warnings.push("the first beat doesn't start at 0");
  // The hook: something worth watching inside the first two seconds.
  if (beats.length && D > 8 && beats[0].len > 3 && !/\b(hook|reveal|snap|burst|appear|drop|cut|crash|morph|split|open|ignite|hit)\b/i.test(beats[0].action)) warnings.push("the opening beat runs past 3s without a clear hook: what makes someone keep watching in the first 2 seconds?");
  // Rhythm: rest between peaks.
  const energies = beats.map((b) => b.energy).filter((e) => typeof e === "number");
  if (energies.length >= 4 && energies.every((e) => e >= 4)) warnings.push("every beat is high energy: give the film a breath (a hold, a slow move) before the big moment");
  if (energies.length >= 4 && new Set(energies).size === 1) warnings.push("every beat has the same energy: vary it (build, rest, peak, resolve)");
  // Transitions: the default for a brand film is a transformation, not a deck of slides.
  const tr = beats.slice(1).map((b) => String(b.transition || "").toLowerCase());
  if (tr.length >= 3 && tr.every((t) => /^(cut|hard cut|fade|crossfade|dissolve|)$/.test(t.trim())))
    warnings.push("every transition is a cut or a fade: carry something across instead (a shape that becomes the next frame, a match on position, a push of the camera)");
  // One idea per beat: long on-screen copy can't be read while things move.
  for (const [i, b] of beats.entries()) {
    const words = String(b.text || "").trim().split(/\s+/).filter(Boolean).length;
    const secs = b.len || 1;
    if (words > 3 + secs * 3.2) warnings.push(`beat ${i + 1}: ${words} words in ${secs}s is more than anyone reads while it moves (about 3 words a second plus a beat to settle)`);
  }
  // Something to look at, and something happening: every beat names its visual (the eye candy: light, depth, a 3D
  // plane, particles, a data moment, the product as an object), and long beats name the smaller moments inside them.
  const bare = beats.filter((b) => !String(b.visual || "").trim());
  if (bare.length) warnings.push(`beat${bare.length > 1 ? "s" : ""} ${bare.map((b) => beats.indexOf(b) + 1).join(", ")} name no visual: what is cool to look at there (a glow behind the subject, UI on a tilted plane, particles forming a shape, a number rolling, a light sweep)? A flat shape on a flat ground is not enough`);
  const thin = beats.filter((b) => b.len / ((b.moments || []).length + 1) > 1.6 && (b.energy ?? 3) >= 2);
  if (thin.length) warnings.push(`beat${thin.length > 1 ? "s" : ""} ${thin.map((b) => beats.indexOf(b) + 1).join(", ")}: one move over more than 1.6 s; add moments inside (a second element reacting, the camera moving, a light sweep, a chip, a number) so something new starts every ~0.8-1.5 s`);
  const kinds = beats.map((b) => String(b.visual || "").toLowerCase().split(/[,;]/)[0].trim()).filter(Boolean);
  if (kinds.length >= 4 && new Set(kinds).size <= Math.ceil(kinds.length / 3)) warnings.push("most beats use the same visual: vary what is cool to look at from beat to beat");
  if (!String(sb.motif || "").trim()) warnings.push("no motif: name the object or shape that survives from beat to beat (it is what makes the film continuous)");
  return { errors: [...new Set(errors)], warnings: [...new Set(warnings)], duration: D, beats };
}

/** The storyboard as Markdown (written next to the task, shown to builders and the critic). */
export function storyboardMd(sb) {
  const f = sb.format || {};
  const lines = [
    `# Storyboard`,
    "",
    `**Concept:** ${sb.concept}`,
    `**Hook (first 2s):** ${sb.hook}`,
    `**Motif:** ${sb.motif || "-"}`,
    `**Format:** ${f.width || 1920}x${f.height || 1080}, ${f.fps || 30} fps, ${f.duration || "?"}s`,
    `**Look:** ${sb.look}`,
    `**Moves:** ${sb.moves}`,
    sb.layers ? `**Layers (always alive):** ${sb.layers}` : "",
    sb.sound ? `**Sound:** ${sb.sound}` : "",
    "",
    "| # | at | len | action | visual | moments | on screen | transition in | energy | sound |",
    "|---|---|---|---|---|---|---|---|---|---|",
    ...(sb.beats || []).map((b, i) => `| ${i + 1} | ${b.at}s | ${b.len}s | ${b.action} | ${b.visual || ""} | ${(b.moments || []).join("; ")} | ${b.text || ""} | ${b.transition || ""} | ${b.energy ?? ""} | ${b.sound || ""} |`),
    "",
    "## References",
    ...(sb.references || []).map((r) => `- **${r.role}** ${r.source}: ${r.take}`),
  ];
  return lines.filter((l) => l !== "").join("\n") + "\n";
}

/** A short version for the critic's brief. */
export function storyboardBrief(sb) {
  if (!sb) return "";
  return [
    `Concept: ${sb.concept}`,
    `Hook: ${sb.hook}`,
    sb.motif ? `Motif: ${sb.motif}` : "",
    `Look: ${sb.look}`,
    `Moves: ${sb.moves}`,
    "Beats:",
    ...(sb.beats || []).map((b, i) => `  ${i + 1}. ${b.at}s +${b.len}s: ${b.action}${b.text ? ` · text "${b.text}"` : ""}${b.transition ? ` · in: ${b.transition}` : ""}`),
  ]
    .filter(Boolean)
    .join("\n");
}
