import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TractusLab",
  description: "Learn Tractus-X by seeing, touching, and breaking a dataspace.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
