import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Cairn", template: "%s · Cairn" },
  description:
    "A self-paced placement-prep trail. One stone per active day — no calendar, no overdue.",
  applicationName: "Cairn",
  appleWebApp: { capable: true, title: "Cairn", statusBarStyle: "black-translucent" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  // one per scheme, so the browser chrome matches the theme rather than
  // framing a light page in a dark bar
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0c0e11" },
    { media: "(prefers-color-scheme: light)", color: "#f7f6f3" },
  ],
  colorScheme: "dark light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // `data-theme` is stamped dark here and corrected before first paint by the
    // inline script below; suppressHydrationWarning covers exactly that edit.
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${plexMono.variable} ${plexSans.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
