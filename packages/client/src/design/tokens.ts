/**
 * Werewolf Online — Design System Tokens
 * ────────────────────────────────────────
 * Single source of truth for the "premium dark" visual language.
 * Import from here; never hardcode hex, px, or font strings in components.
 *
 * Discipline:
 * - Surfaces use the neutral ramp (bg.* / surface.*).
 * - Borders use `border.subtle` by default; never a bright white on dark.
 * - The `accent` crimson is ONLY for: critical CTAs, active/your-turn states,
 *   and "danger" confirmations. Do NOT use it for decoration.
 * - Team colors (team.village / werewolf / neutral) are GAME DATA. They tag
 *   identity and must stay legible on every surface. They are tuned dark-mode-safe
 *   hex values — slightly desaturated versus the previous palette.
 */

export const color = {
  // ── Base surfaces ──────────────────────────────────────────────────────
  bg: {
    app: "#121212",           // body background
    elevated: "#1A1A1A",      // panels, secondary screens
    tint: "#0E0E0E",          // vignettes, dialog backdrops beneath overlay
  },
  surface: {
    card: "#242424",          // primary card
    cardHover: "#2C2C2C",
    input: "#1E1E1E",         // form fields, chat bar
    raised: "#2A2A2A",        // popovers, tooltips
  },
  border: {
    subtle: "#333333",        // default 1px stroke
    default: "#3C3C3C",       // slightly stronger, for focus/selection
    strong: "#555555",        // only for high-emphasis separation
  },
  text: {
    primary: "#E0E0E0",       // body copy, headings
    secondary: "#B0B0B0",     // meta, labels
    muted: "#7A7A7A",          // hints, placeholders
    onAccent: "#FFFFFF",
    inverse: "#121212",
  },

  // ── Strategic single accent ────────────────────────────────────────────
  // Crimson — used for primary CTAs, active states, and danger confirmations.
  accent: {
    base: "#B22222",
    hover: "#C82828",
    pressed: "#8F1B1B",
    bg: "rgba(178, 34, 34, 0.12)",     // tinted surface
    border: "rgba(178, 34, 34, 0.35)",
    glow: "rgba(178, 34, 34, 0.5)",
  },

  // ── Moonlight secondary ────────────────────────────────────────────────
  // Used sparingly for calm/info moments: connected indicator, seer results,
  // share-link text. Never combined with accent in the same component.
  moonlight: {
    base: "#A0C4FF",
    bg: "rgba(160, 196, 255, 0.10)",
    border: "rgba(160, 196, 255, 0.28)",
  },

  // ── Semantic states ────────────────────────────────────────────────────
  state: {
    success: "#4CAF7A",        // ready badges, positive results
    successBg: "rgba(76, 175, 122, 0.12)",
    warning: "#D98E3A",        // elder punishment, warnings
    warningBg: "rgba(217, 142, 58, 0.12)",
    danger: "#B22222",         // same as accent (death, destructive)
    dangerBg: "rgba(178, 34, 34, 0.12)",
    neutral: "#6B6B6B",
  },

  // ── Team identity (semantic game data — keep legible) ──────────────────
  // Tuned darker/less saturated than before so they read correctly on #242424.
  team: {
    village: "#2A9D8F",        // teal
    villageBg: "rgba(42, 157, 143, 0.12)",
    villageBorder: "rgba(42, 157, 143, 0.35)",
    werewolf: "#B22222",       // now matches accent (wolves ARE the danger)
    werewolfBg: "rgba(178, 34, 34, 0.12)",
    werewolfBorder: "rgba(178, 34, 34, 0.35)",
    neutral: "#D98E3A",        // amber
    neutralBg: "rgba(217, 142, 58, 0.12)",
    neutralBorder: "rgba(217, 142, 58, 0.35)",
  },

  // ── Overlay scrims ─────────────────────────────────────────────────────
  scrim: {
    light: "rgba(0, 0, 0, 0.65)",
    heavy: "rgba(0, 0, 0, 0.85)",
    dialog: "rgba(10, 10, 15, 0.92)",
  },
} as const;

/**
 * Typography — Poppins (primary), with system fallbacks. Loaded via
 * <link> in index.html. Sizes follow a 4-px modular scale.
 */
export const font = {
  family: {
    sans: `'Poppins', 'Segoe UI', system-ui, -apple-system, sans-serif`,
    mono: `'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace`,
  },
  size: {
    xs: "11px",
    sm: "13px",
    base: "15px",
    md: "16px",       // minimum for chat input → prevents iOS zoom
    lg: "18px",
    xl: "22px",
    "2xl": "28px",
    "3xl": "36px",
    "4xl": "44px",
  },
  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    black: 800,
  },
  lineHeight: {
    tight: 1.2,
    snug: 1.35,
    normal: 1.55,
    relaxed: 1.7,
  },
  letterSpacing: {
    tight: "-0.02em",
    normal: "0em",
    wide: "0.05em",
    wider: "0.1em",
  },
} as const;

/**
 * Spacing — 4px base unit. Use these instead of arbitrary px values.
 */
export const space = {
  0: "0px",
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  7: "32px",
  8: "40px",
  9: "56px",
  10: "72px",
} as const;

/**
 * Border radius — consistent corners. 8px for inputs/small, 12px default,
 * 16px for primary cards, 24px for dialogs. No hard right angles anywhere.
 */
export const radius = {
  sm: "6px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  "2xl": "20px",
  "3xl": "24px",
  pill: "9999px",
} as const;

/**
 * Shadows — soft ambient light, never "muddy". One downward key, one lateral
 * fill. Depth = elevation, not weight.
 */
export const shadow = {
  none: "none",
  sm: "0 1px 2px rgba(0, 0, 0, 0.4)",
  md: "0 4px 12px rgba(0, 0, 0, 0.45), 0 1px 2px rgba(0, 0, 0, 0.3)",
  lg: "0 12px 32px rgba(0, 0, 0, 0.55), 0 2px 6px rgba(0, 0, 0, 0.35)",
  xl: "0 24px 60px rgba(0, 0, 0, 0.65), 0 4px 12px rgba(0, 0, 0, 0.4)",
  // Ambient accent glow — used sparingly for your-turn prompts + Hunter shot.
  accentGlow: "0 0 24px rgba(178, 34, 34, 0.35)",
  moonGlow: "0 0 24px rgba(160, 196, 255, 0.25)",
} as const;

/**
 * Responsive breakpoints (mobile-first).
 * - Mobile: default (single column, bottom-safe padding)
 * - Tablet: ≥ 768px (wider centered column)
 * - Desktop: ≥ 1024px (true multi-column layouts)
 * - Wide: ≥ 1440px (max content width)
 */
export const breakpoint = {
  tablet: 768,
  desktop: 1024,
  wide: 1440,
} as const;

export const mq = {
  tablet: `@media (min-width: ${breakpoint.tablet}px)`,
  desktop: `@media (min-width: ${breakpoint.desktop}px)`,
  wide: `@media (min-width: ${breakpoint.wide}px)`,
  touch: `@media (hover: none) and (pointer: coarse)`,
  reducedMotion: `@media (prefers-reduced-motion: reduce)`,
} as const;

/**
 * Layout tokens — container widths and gutters.
 */
export const layout = {
  maxWidthMobile: "480px",
  maxWidthTablet: "760px",
  maxWidthDesktop: "1200px",
  maxWidthWide: "1440px",
  gutterMobile: space[4],
  gutterDesktop: space[6],
  minTapTarget: "44px",       // accessibility floor
} as const;

/**
 * Z-index scale — keep overlays layered predictably.
 */
export const z = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  chrome: 500,         // mute toggle, connection indicator
  overlay: 1000,       // dawn death modal
  dialog: 2000,        // lynch result, game over inner cards
  critical: 3000,      // Hunter revenge — must sit above everything
} as const;

/**
 * Motion — respect reduced-motion preference at call sites.
 */
export const motion = {
  fast: 150,
  normal: 250,
  slow: 400,
  spring: { type: "spring", stiffness: 180, damping: 22 },
  springSoft: { type: "spring", stiffness: 120, damping: 18 },
} as const;
