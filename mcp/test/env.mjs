// Tests exercise every tool and the full loop unless a test asks for the defaults (core tools, fast loop).
process.env.DRIP_TOOLS ??= "all";
process.env.DRIP_LOOP ??= "full";
