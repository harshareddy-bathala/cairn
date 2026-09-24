"use client";

import { useEffect } from "react";

/** the page ground in each theme — what the browser's own bar should match */
const GROUND = { dark: "#0c0e11", light: "#f7f6f3" } as const;

/**
 * Keeps the browser chrome on the app's theme rather than the device's.
 *
 * The viewport `themeColor` pair follows `prefers-color-scheme`, which is the
 * right answer only for "match system". Instrument on a light-mode phone got a
 * white status bar over a black page, and Daylight on a dark-mode phone the
 * reverse. This watches `data-theme` — whoever changes it: the head script, the
 * settings control, another tab — and points every theme-color tag at it.
 */
export function ThemeColorSync() {
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => {
      const color = root.dataset.theme === "light" ? GROUND.light : GROUND.dark;
      document
        .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
        .forEach((m) => m.setAttribute("content", color));
    };
    sync();
    const watch = new MutationObserver(sync);
    watch.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => watch.disconnect();
  }, []);

  return null;
}
