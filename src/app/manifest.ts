import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return { name: "UCSM BusTrack", short_name: "BusTrack", description: "Tu campus, más cerca. Rutas del transporte UCSM.", start_url: "/", scope: "/", display: "standalone", background_color: "#f7f8fa", theme_color: "#087b63", lang: "es-PE", icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" }, { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }] };
}
