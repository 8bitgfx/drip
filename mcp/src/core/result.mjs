// Helpers to build MCP tool results.

export function text(body, isError = false) {
  return { content: [{ type: "text", text: body }], ...(isError ? { isError: true } : {}) };
}

export function blocks(content, isError = false) {
  return { content, ...(isError ? { isError: true } : {}) };
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
