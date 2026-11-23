// Google Gemini image generation. Key: GEMINI_API_KEY / GOOGLE_API_KEY or keys_open.
import { postJson } from "../../../core/http.mjs";

const RATIO = { landscape: "16:9", portrait: "9:16", square: "1:1" };

export default {
  id: "gemini",
  label: "Google Gemini (image)",
  key: "gemini",
  async generate({ prompt, aspect = "landscape", model, refs = [] }, key) {
    const m = model || "gemini-2.5-flash-image";
    const parts = [{ text: prompt }, ...refs.map((r) => ({ inlineData: { mimeType: r.mime, data: r.buf.toString("base64") } }))];
    const res = await postJson(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent`,
      { contents: [{ parts }], generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: RATIO[aspect] || "16:9" } } },
      { headers: { "x-goog-api-key": key } },
    );
    const out = [];
    for (const c of res.candidates || []) for (const p of c.content?.parts || []) if (p.inlineData?.data) out.push({ buf: Buffer.from(p.inlineData.data, "base64"), mime: p.inlineData.mimeType || "image/png" });
    if (!out.length) throw new Error(`Gemini returned no image${res.promptFeedback?.blockReason ? ` (blocked: ${res.promptFeedback.blockReason})` : ""}.`);
    return out;
  },
};
