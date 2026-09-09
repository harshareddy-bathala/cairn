import type { MetadataRoute } from "next";

/**
 * Installable on the phone home screen, which is the point: the morning block
 * starts at 5:15 AM and an app you have to find in a browser tab is an app you
 * will not open.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cairn",
    short_name: "Cairn",
    description:
      "A stack of stones that marks a trail where there is no signposted path. One stone per active day.",
    start_url: "/today",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0c0e11",
    theme_color: "#0c0e11",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
