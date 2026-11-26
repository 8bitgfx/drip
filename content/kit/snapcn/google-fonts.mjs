// Stand-in for @remotion/google-fonts/<Family>: loads the family from Google Fonts and returns its CSS name.
// One module per family is generated from this template by motion_piece (FAMILY is replaced).
const FAMILY = "__FAMILY__";

export function loadFont(_style, options = {}) {
  const weights = options.weights || ["400", "500", "600", "700"];
  const id = `drip-gf-${FAMILY.replace(/\s+/g, "-")}`;
  if (typeof document !== "undefined" && !document.getElementById(id)) {
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(FAMILY)}:wght@${[...weights].sort().join(";")}&display=block`;
    document.head.appendChild(link);
  }
  return { fontFamily: `"${FAMILY}"`, fonts: {}, unicodeRanges: {}, waitUntilDone: () => (typeof document !== "undefined" && document.fonts ? document.fonts.ready : Promise.resolve()) };
}

export const getInfo = () => ({ fontFamily: FAMILY });
