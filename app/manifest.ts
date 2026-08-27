import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TractusLab",
    short_name: "TractusLab",
    description: "Interactive, simulation-first learning for Tractus-X and dataspace concepts.",
    start_url: "/",
    display: "standalone",
    background_color: "#06100d",
    theme_color: "#06100d",
    categories: ["education", "developer tools"],
  };
}
