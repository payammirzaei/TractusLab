import type { Metadata } from "next";
import { DataJourney } from "@/components/journey/DataJourney";

export const metadata: Metadata = {
  title: "Data Journey · TractusLab",
  description: "Experience how two companies discover, agree and exchange data in an interactive neural dataspace.",
};

export default function JourneyPage() { return <DataJourney />; }
