"use client";

// Gate for the 3D hero: decides whether the device/browser/user-preference
// combo can sustain a WebGL scene without janking or draining battery. SSR
// always returns false (no window) — the real check runs client-side after
// mount, and again on debounced resize so rotating a tablet or shrinking a
// window downgrades to the CSS fallback rather than leaving a stranded canvas.
import { useEffect, useState } from "react";

const MIN_WIDTH = 820;
const RESIZE_DEBOUNCE_MS = 250;

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function computeCan3D(): boolean {
  if (typeof window === "undefined") return false;

  const prefersReducedMotion = window.matchMedia?.(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  if (prefersReducedMotion) return false;

  if (window.innerWidth <= MIN_WIDTH) return false;

  if (!detectWebGL()) return false;

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    hardwareConcurrency?: number;
  };

  if (typeof nav.deviceMemory === "number" && nav.deviceMemory < 4) return false;
  if (
    typeof nav.hardwareConcurrency === "number" &&
    nav.hardwareConcurrency < 4
  ) {
    return false;
  }

  return true;
}

/**
 * Returns whether the current environment can sustain the 3D pipeline hero.
 * Starts `false` (SSR-safe), resolves once on mount, and re-resolves on
 * debounced resize so a viewport crossing the mobile breakpoint downgrades
 * live to the CSS fallback.
 */
export function useHeroCapability(): boolean {
  const [can3D, setCan3D] = useState(false);

  useEffect(() => {
    setCan3D(computeCan3D());

    let timeout: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => setCan3D(computeCan3D()), RESIZE_DEBOUNCE_MS);
    };

    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  return can3D;
}
