// OpenAI image generation (GPT Image). Key: OPENAI_API_KEY or keys_open.
import { postJson } from "../../../core/http.mjs";

const SIZES = { landscape: "1536x1024", portrait: "1024x1536", square: "1024x1024" };

export default {
  id: "openai",
  label: "OpenAI (GPT Image)",
  key: "openai",
  async generate({ prompt, aspect = "landscape", model, quality = "medium" }, key) {
    const res = await postJson(
      "https://api.openai.com/v1/images/generations",
      { model: model || "gpt-image-1", prompt, size: SIZES[aspect] || SIZES.landscape, quality, n: 1 },
      { headers: { Authorization: `Bearer ${key}` } },
    );
    return (res.data || []).map((d) => ({ buf: Buffer.from(d.b64_json, "base64"), mime: "image/png" }));
  },
};
