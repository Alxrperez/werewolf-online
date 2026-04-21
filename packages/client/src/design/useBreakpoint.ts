import { useEffect, useState } from "react";
import { breakpoint } from "./tokens.js";

export type Breakpoint = "mobile" | "tablet" | "desktop" | "wide";

function resolve(width: number): Breakpoint {
  if (width >= breakpoint.wide) return "wide";
  if (width >= breakpoint.desktop) return "desktop";
  if (width >= breakpoint.tablet) return "tablet";
  return "mobile";
}

/**
 * Responsive hook — returns the current breakpoint name and boolean helpers.
 * Use `isDesktop` to switch between mobile stacked layouts and desktop
 * multi-column layouts. SSR-safe (returns "mobile" on the server).
 */
export function useBreakpoint() {
  const [bp, setBp] = useState<Breakpoint>(() => {
    if (typeof window === "undefined") return "mobile";
    return resolve(window.innerWidth);
  });

  useEffect(() => {
    function onResize() {
      setBp(resolve(window.innerWidth));
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return {
    bp,
    isMobile: bp === "mobile",
    isTablet: bp === "tablet",
    isDesktop: bp === "desktop" || bp === "wide",
    isWide: bp === "wide",
    // Combined: desktop-or-wider. Most layouts only care about this split.
    isDesktopUp: bp === "desktop" || bp === "wide",
  };
}
