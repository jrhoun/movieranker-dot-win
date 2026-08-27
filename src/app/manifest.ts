import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MovieRanker – Premiere Night",
    short_name: "MovieRanker",
    description: "Rank movies head-to-head with pairwise voting and discover community consensus.",
    start_url: "/",
    display: "standalone",
    background_color: "#0d0d10",
    theme_color: "#f5c518",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
