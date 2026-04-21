# Werewolf Online — Design System Assets

This folder is the asset handoff bay for the "premium dark" redesign. Drop generated images here and they'll be served from `/assets/design-system/…` at runtime (Vite copies `public/` verbatim).

## Visual language, at a glance

| Token | Value | Use |
|---|---|---|
| `bg.app` | `#121212` | Body background |
| `bg.elevated` | `#1A1A1A` | Panels |
| `surface.card` | `#242424` | Primary cards |
| `surface.input` | `#1E1E1E` | Form fields, chat bubbles |
| `border.subtle` | `#333333` | Default 1px stroke |
| `text.primary` | `#E0E0E0` | Body copy |
| `text.secondary` | `#B0B0B0` | Meta, labels |
| **`accent.base`** | **`#B22222`** | **Crimson — primary CTAs, active/your-turn, danger. Never decorative.** |
| `moonlight.base` | `#A0C4FF` | Calm informational moments (Seer, share-link text) |

Full token source: `packages/client/src/design/tokens.ts`.

## Typography

- **Poppins** geometric sans (400/500/600/700/800), loaded from Google Fonts in `index.html`
- Minimum input font size is 16px to prevent iOS zoom-on-focus

## Directory layout

```
assets/design-system/
├── images/
│   ├── backgrounds/     # Full-bleed phase and home backdrops (mobile + desktop)
│   ├── cards/           # Card chrome frames, vote tokens, panel backplates
│   ├── roles/           # 17 role portraits (1:1 square, 512px+ recommended)
│   └── icons/           # UI glyphs, phase markers, sigils
```

## Naming convention

`kind-variant-breakpoint[-state].ext`

Examples:
- `bg-main-mobile.jpg`, `bg-main-desktop.jpg`
- `bg-texture-darkgrain.png` (referenced by `index.html` desktop overlay at `≥1024px`)
- `card-player-default.png`, `card-role-reveal.png`, `card-vote-button.png`
- `role-werewolf.png`, `role-seer.png`, `role-doctor.png`, …
- `icon-moon.svg`, `icon-sun.svg`, `icon-vote.svg`, `icon-dead.svg`

## Breakpoints

Art should be delivered at both scales where layout differs:

| Name | Width | Max content |
|---|---|---|
| mobile | default | 480px |
| tablet | ≥ 768px | 760px |
| desktop | ≥ 1024px | 1200px |
| wide | ≥ 1440px | 1440px |

## Style anchors (for image-gen prompts)

- Moody, cinematic, minimal. No high-saturation colors outside the crimson/teal/amber triad
- Grainy film texture, soft shadows, not glossy
- Faces stylized, non-photoreal, never screen-accurate to real actors
- Negative space — cards breathe

See `ART_PROMPTS.md` at the repo root for the full prompt pack.

## Adding new assets

1. Drop the file into the correct subdirectory following the naming convention above
2. Reference it from a token-aware component via absolute path: `/assets/design-system/images/…`
3. Prefer `.webp` or `.png` with alpha for UI chrome; `.jpg` for photographic backdrops
4. Keep individual file sizes under 200 KB where possible; backgrounds under 400 KB

## What's still a placeholder

These paths are referenced in code but not yet filled:

- `images/backgrounds/bg-texture-darkgrain.png` — desktop-only grain overlay (body::before, 2.5% opacity)

The build logs a harmless "didn't resolve at build time" warning for missing placeholders; the overlay is hidden gracefully when the file is absent.
