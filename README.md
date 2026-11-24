# Drip brand files

The logo, its sources and the README art for [Drip](https://github.com/8bitgfx/drip). Kept off `main` so a Drip install stays small.

- `assets/brand/`: icon, mark, wordmarks, social preview, and `src/` (the geometry and render scripts). Rules: [BRAND.md](assets/brand/BRAND.md).
- `assets/readme/`: the images main's README loads by URL.

```
node assets/brand/src/render.mjs   # icon, mark, wordmarks
node assets/brand/src/social.mjs   # social preview
node assets/brand/src/readme.mjs   # README art
```

Needs Node 22+ and Chrome or Edge.
