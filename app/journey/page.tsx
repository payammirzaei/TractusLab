import type { Metadata } from "next";
import { IBM_Plex_Sans, Syne } from "next/font/google";
import { DataJourney } from "@/components/journey/DataJourney";

const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-journey",
  display: "swap",
});

const syne = Syne({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-journey-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Data Journey · TractusLab",
  description: "Experience how two companies discover, agree and exchange data in an interactive neural dataspace.",
};

export default function JourneyPage() {
  return (
    <div className={`${plex.variable} ${syne.variable}`}>
      <DataJourney />
    </div>
  );
}
