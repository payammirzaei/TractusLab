import type { Metadata } from "next";
import { I18nProvider } from "@/components/I18nProvider";
import { NetworkStatus } from "@/components/NetworkStatus";
import "./globals.css";
import "./contrast-fixes.css";

export const metadata: Metadata = {
  title: "TractusLab",
  description: "Learn Tractus-X by seeing, touching, and breaking a dataspace.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <I18nProvider>
          <a href="#main-content" className="skip-link">Skip to main content</a>
          <div id="main-content" tabIndex={-1}>{children}</div>
          <NetworkStatus />
        </I18nProvider>
      </body>
    </html>
  );
}
