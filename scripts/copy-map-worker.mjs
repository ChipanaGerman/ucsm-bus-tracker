import { copyFile, mkdir } from "node:fs/promises";
// Serve the exact installed worker locally: no CDN version drift or API key.
await mkdir("public/vendor", { recursive: true });
await copyFile(
  "node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs",
  "public/vendor/maplibre-worker.mjs",
);
