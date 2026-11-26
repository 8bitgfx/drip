// Helpers to build MCP tool results.

export function text(body, isError = false) {
  return { content: [{ type: "text", text: body }], ...(isError ? { isError: true } : {}) };
}

export function blocks(content, isError = false) {
  return { content, ...(isError ? { isError: true } : {}) };
}

/**
 * Progress for a long call (a render, critic_prepare): MCP progress notifications when the host asked for them (the
 * host shows them, so the call never looks stuck), and the same line on stderr for the server log. Never throws.
 * Returns report(done, total, message) and tick(message) for a step with no count (elapsed seconds are added).
 */
export function progress(extra) {
  const token = extra?._meta?.progressToken;
  const t0 = Date.now();
  let n = 0;
  const report = (done, total, message) => {
    const msg = `${message} (${Math.round((Date.now() - t0) / 1000)}s)`;
    try {
      process.stderr.write(`[drip] ${msg}\n`);
    } catch {
      /* no log */
    }
    if (token == null || typeof extra?.sendNotification !== "function") return;
    n = Math.max(n + 0.001, done);
    extra.sendNotification({ method: "notifications/progress", params: { progressToken: token, progress: n, ...(total ? { total } : {}), message: msg } }).catch(() => {});
  };
  return { report, tick: (message) => report(n + 1, null, message) };
}

/** Wrap a handler so thrown errors come back to Claude as readable tool errors, not crashes. */
export function safe(handler) {
  return async (args, extra) => {
    try {
      return await handler(args, extra);
    } catch (err) {
      return text(`Error: ${err?.message || err}`, true);
    }
  };
}
