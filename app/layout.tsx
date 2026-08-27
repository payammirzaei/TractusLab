import type { Metadata } from "next";
import { NetworkStatus } from "@/components/NetworkStatus";
import "./globals.css";

export const metadata: Metadata = {
  title: "TractusLab",
  description: "Learn Tractus-X by seeing, touching, and breaking a dataspace.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <div id="main-content" tabIndex={-1}>{children}</div>
        <NetworkStatus />
      </body>
    </html>
  );
}
