import type { Metadata, Viewport } from "next";
import "./globals.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "./vivid.css";
export const metadata: Metadata = {
  title: "UCSM BusTrack · Tu campus, más cerca",
  description:
    "Las cuatro rutas UCSM, horarios, favoritos y seguimiento en una sola aplicación. Proyecto universitario con demostración interactiva.",
  applicationName: "UCSM BusTrack",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "BusTrack" },
  icons: { icon: "/icon.svg", apple: "/icon-192.png" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#087b63",
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
