import type { Metadata, Viewport } from "next";
import "./globals.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "./vivid.css";
import "./ucsm-theme.css";
export const metadata: Metadata = {
  title: "UCSM BusTrack · Tu campus, más cerca",
  description:
    "Las cuatro rutas UCSM, horarios, favoritos y seguimiento en una sola aplicación. Proyecto universitario con recorridos interactivos.",
  applicationName: "UCSM BusTrack",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "BusTrack" },
  icons: { icon: "/icon.svg?v=3", apple: "/icon-192.png?v=3" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#00422d",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
