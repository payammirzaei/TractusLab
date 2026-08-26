import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "TractusLab",
    template: "%s · TractusLab",
  },
  description: "Learn Tractus-X by seeing, touching, breaking, and fixing a dataspace.",
  applicationName: "TractusLab",
  keywords: ["Tractus-X", "dataspace", "Catena-X", "learning", "simulation"],
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#06100d",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <div id="main-content">{children}</div>
      </body>
    </html>
  );
}
