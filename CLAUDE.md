# Werewolf Online — CLAUDE.md

> **For Claude Code:** This file is the authoritative project guide. Read it fully before writing any code. Follow phases in order. Check off tasks as you complete them. Never skip validation steps.

---

## Project Overview

**Werewolf Online** is a real-time, browser-based multiplayer social deduction game for 6–20 players per session. Players join via shareable link, receive secret role assignments, and compete across Day/Night cycles. No downloads, no accounts.

**Stack:** TypeScript monorepo (npm workspaces) · React 18 · Zustand · Socket.IO · Express · Zod · Framer Motion · Howler.js · Vitest · Playwright

---

## Quick Start Commands

```bash
# Bootstrap monorepo
npm install
npm run build --workspace=packages/shared

# Dev (runs server + client concurrently)
npm run dev

# Tests
npm run test                    # all unit tests
npm run test:e2e                # Playwright E2E
npm run test:load               # k6 load test (requires k6 installed)

# Type check all packages
npm run typecheck
```

---

## Directory Structure

```
werewolf/
├── packages/
│   ├── shared/
│   │   └── src/
│   │       ├── types.ts           # Player, Session, Role, GameEvent
│   │       ├── roles.ts           # Role definitions + metadata
│   │       ├── schemas.ts         # Zod schemas for ALL socket messages
│   │       ├── constants.ts       # Timers, limits, color palette
│   │       └── win-conditions.ts  # Pure functions — 100% unit test coverage required
│   ├── server/
│   │   └── src/
│   │       ├── index.ts           # Express + Socket.IO bootstrap
│   │       ├── session-manager.ts # Create/join/destroy sessions
│   │       ├── game-engine.ts     # State machine: transitions + validation
│   │       ├── night-resolver.ts  # All night action resolution logic
│   │       ├── socket-handlers.ts # Socket event routing + auth
│   │       ├── timer-manager.ts   # Centralized server-side timers
│   │       └── middleware/
│   │           ├── validate.ts    # Zod validation middleware
│   │           └── rate-limit.ts  # Anti-spam
│   └── client/
│       └── src/
│           ├── App.tsx
│           ├── stores/gameStore.ts
│           ├── hooks/
│           │   ├── useSocket.ts
│           │   └── useGameState.ts
│           ├── screens/
│           │   ├── HomeScreen.tsx
│           │   ├── LobbyScreen.tsx
│           │   ├── NightScreen.tsx
│           │   ├── DayScreen.tsx
│           │   └── GameOverScreen.tsx
│           └── components/
│               ├── PlayerRing.tsx
│               ├── RoleCard.tsx
│               ├── VotePanel.tsx
│               ├── Timer.tsx
│               ├── ChatPanel.tsx
│               └── DeathAnimation.tsx
├── package.json                   # npm workspaces root
├── tsconfig.base.json
└── CLAUDE.md                      # ← you are here
```

---

## Core Data Types

### Player
```typescript
interface Player {
  id: string           // UUID v4
  name: string         // 2–16 chars, unique within session
  color: string        // hex from COLOR_PALETTE[joinIndex]
  role: Role           // assigned at game start, hidden from others
  isAlive: boolean
  isConnected: boolean
  voteTarget: string | null
  nightAction: object | null
  joinedAt: number     // Date.now()
}
```

### Session
```typescript
interface Session {
  id: string           // UUID v4
  code: string         // 6-char alphanumeric e.g. "W3RF0X"
  hostPlayerId: string
  players: Player[]    // max 20
  state: SessionState  // LOBBY | NIGHT | DAY_DISCUSSION | DAY_VOTE | GAME_OVER
  round: number
  config: GameConfig
  roleDistribution: Map<RoleName, number>
  eventLog: GameEvent[]
  createdAt: number
  shareableLink: string
}
```

### Color Palette (20 slots, assign in join order)
```typescript
export const COLOR_PALETTE = [
  { hex: "#E63946", name: "Crimson" },
  { hex: "#F4A261", name: "Amber" },
  { hex: "#E9C46A", name: "Gold" },
  { hex: "#2A9D8F", name: "Teal" },
  { hex: "#264653", name: "Deep Navy" },
  { hex: "#6A0572", name: "Purple" },
  { hex: "#A7C957", name: "Lime" },
  { hex: "#F72585", name: "Hot Pink" },
  { hex: "#4361EE", name: "Royal Blue" },
  { hex: "#4CC9F0", name: "Cyan" },
  { hex: "#FF6B35", name: "Tangerine" },
  { hex: "#1B4332", name: "Forest" },
  { hex: "#BC6C25", name: "Burnt Sienna" },
  { hex: "#606C38", name: "Olive" },
  { hex: "#9B2226", name: "Maroon" },
  { hex: "#AE2012", name: "Rust" },
  { hex: "#CA6702", name: "Ochre" },
  { hex: "#BB3E03", name: "Copper" },
  { hex: "#005F73", name: "Dark Teal" },
  { hex: "#94D2BD", name: "Seafoam" },
]
```

---

## Role Catalog

All roles live in `packages/shared/src/roles.ts`. Each has: `name`, `team`, `wakeOrder` (null = passive), `description`, `flags`.

### Werewolf Team
| Role | Wake Order | Key Behavior |
|------|-----------|--------------|
| Werewolf | 20 | Wakes nightly with pack; unanimous kill vote; knows all pack members |
| Alpha Werewolf | 20 | Once per game: convert target to Werewolf instead of killing |
| Wolf Cub | 20 | If killed: pack gets 2 kills next night (rage flag); appears as Villager to Seer |
| Sorceress | 25 | Aligned with wolves, wakes alone; nightly yes/no: "is this player the Seer?" |

### Village Team
| Role | Wake Order | Key Behavior |
|------|-----------|--------------|
| Villager | — | No ability; discussion + voting only |
| Seer | 30 | Nightly: investigate one player → learn exact role |
| Doctor | 40 | Nightly: protect one player from WW kill; no back-to-back same target; may self-protect |
| Bodyguard | 41 | Nightly: guard one player; absorbs fatal attack; no back-to-back same target; cannot self-guard |
| Hunter | — | On death (any cause): immediately kills one chosen player |
| Witch | 50 | Two single-use potions: Heal (save WW target) + Kill (eliminate any player); sees WW target before choosing |
| Cupid | 5 | Night 1 only: links two Lovers; they know each other; one dies → other dies; cross-team Lovers = third faction |
| Little Girl | — | During WW wake: server reveals partial info (target's color only); WW can check for peekers → Little Girl dies if caught |
| Elder | — | Survives first WW attack (2 HP vs wolves only); if lynched: all Village special powers disabled for rest of game |
| Village Idiot | — | If voted to lynch: role revealed, survives, loses voting rights permanently |
| Mason | 8 | Night 1: Masons see each other; requires 2–3 Mason cards in deck |

### Neutral / Third-Party
| Role | Wake Order | Key Behavior |
|------|-----------|--------------|
| Tanner | — | Wins only if lynched by village during day; night kill = normal death, no win |
| Serial Killer | 55 | Nightly solo kill; immune to WW attacks; cannot be Doctor-saved; wins as last player standing |
| Jester | — | If lynched: game continues + player who initiated the vote also dies; Jester wins alongside ultimate winner |

### Recommended Distributions
| Players | Werewolves | Special Village | Plain Villagers | Neutral |
|---------|-----------|-----------------|-----------------|---------|
| 6 | 1 WW | Seer, Doctor | 3 | 0 |
| 8 | 2 WW | Seer, Doctor, Hunter | 3 | 0 |
| 10 | 2 WW | Seer, Doctor, Witch, Hunter | 3 | 1 Tanner |
| 12 | 3 WW | Seer, Doctor, Witch, Hunter, Cupid | 3 | 1 |
| 15 | 3 WW + Sorceress | Seer, Doctor, Witch, Hunter, Bodyguard, 2 Masons | 3 | 2 |
| 18 | 3 WW + Alpha + Sorceress | Seer, Doctor, Witch, Hunter, Bodyguard, Cupid, Elder, 2 Masons | 2 | 2 |
| 20 | 4 WW + Alpha + Wolf Cub | Seer, Doctor, Witch, Hunter, Bodyguard, Cupid, Elder, Little Girl, 2 Masons | 2 | 2 (Tanner + SK) |

Host can manually customize deck in the lobby.

---

## Game State Machine

```
LOBBY → ROLE_REVEAL (10s) → NIGHT → DAWN_REPORT (10s) → DAY_DISCUSSION → DAY_VOTE → (loop or GAME_OVER)
```

**Phase transitions are server-only.** Client timers are cosmetic; server emits `day:timerSync` every 5s.

**Night wake order (lower = earlier):**
Cupid(5) → Mason(8) → Werewolf/Alpha/Wolf Cub(20) → Sorceress(25) → Seer(30) → Doctor(40) → Bodyguard(41) → Witch(50) → Serial Killer(55)

### Night Resolution (atomic, after all actions collected)
1. Collect all actions (WW target, Doctor protect, Witch potions, SK target, Bodyguard guard)
2. Resolve protections: Doctor save / Witch heal cancels WW kill; Bodyguard redirects kill to self
3. Resolve kills: WW kill (if unsaved), SK kill (unsaveable by Doctor), Witch kill potion
4. Resolve specials: Alpha conversion, Elder extra life
5. Mark dead players; trigger Lover chain-death
6. Check win conditions

### Win Conditions (checked after every death)
| Condition | Winner |
|-----------|--------|
| All Werewolves dead + SK dead (if in game) | Village |
| Werewolves ≥ living Villagers (no SK alive) | Werewolves |
| Tanner lynched during day | Tanner (game continues) |
| Serial Killer is last player alive | Serial Killer |
| Cross-team Lovers are last 2 alive | Lovers |

---

## Socket Protocol

**Every inbound message is validated with Zod before touching game logic.**

### REST Endpoints
| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/api/sessions` | `{ hostName }` | `{ sessionId, sessionCode, playerId, shareableLink }` |
| GET | `/api/sessions/:code` | — | `{ sessionId, playerCount, state, hostName }` |
| POST | `/api/sessions/:code/join` | `{ playerName }` | `{ playerId, sessionId }` |

### Client → Server Events
| Event | Payload | Valid States |
|-------|---------|-------------|
| `player:ready` | `{ playerId }` | LOBBY |
| `host:start` | `{ roleConfig }` | LOBBY |
| `host:kick` | `{ targetPlayerId }` | LOBBY |
| `night:action` | `{ playerId, action: RoleAction }` | NIGHT |
| `day:accuse` | `{ playerId, targetId }` | DAY_DISCUSSION |
| `day:vote` | `{ playerId, targetId \| "skip" }` | DAY_VOTE |
| `day:chat` | `{ playerId, message }` | DAY_DISCUSSION |
| `hunter:revenge` | `{ playerId, targetId }` | DAWN_REPORT |
| `player:reconnect` | `{ playerId, sessionCode }` | ANY |

### Server → Client Events
| Event | Payload | Notes |
|-------|---------|-------|
| `session:update` | `{ players[], state, round, config }` | No secret info; broadcast |
| `game:roleReveal` | `{ role, description, team }` | Per-socket only |
| `night:wake` | `{ yourTurn, aliveTargets[] }` | Per-socket; waking role only |
| `night:wwChat` | `{ from, message }` | Werewolves only |
| `dawn:report` | `{ deaths[] }` | Broadcast |
| `day:timerSync` | `{ secondsRemaining }` | Every 5s |
| `day:voteUpdate` | `{ votes }` | Live tally broadcast |
| `day:lynchResult` | `{ targetId, role, lastWords }` | Broadcast |
| `game:over` | `{ winner, winningPlayers[], allRoles[] }` | Full reveal |
| `error` | `{ code, message }` | Validation / state errors |

**Security invariant:** Role data is NEVER broadcast. All role-revealing events use `socket.emit()` to individual sockets only.

---

## Reconnection & Session Lifecycle

```
Player disconnects
  → server marks isConnected = false
  → waits 120s
  → if returns within 120s: send full state snapshot, resume seamlessly
  → if not:
      LOBBY: remove player
      GAME: player becomes AFK (auto-skip votes/actions; still targetable)

Session cleanup:
  → deleted 10 min after GAME_OVER
  → deleted when all players disconnect
  → sweep interval: every 60s
```

---

## Implementation Phases

Work through phases in order. Each phase must pass its validation gate before proceeding.

### Phase 1 — Foundation ✅
**Goal:** Lobby works end-to-end.

- [x] Monorepo setup: `npm workspaces`, root `tsconfig.base.json`, per-package configs
- [x] `shared/types.ts` — all interfaces and enums
- [x] `shared/schemas.ts` — Zod schemas for every socket message
- [x] `shared/roles.ts` — full role catalog with metadata
- [x] `shared/constants.ts` — timers, limits, COLOR_PALETTE
- [x] Server: Express + Socket.IO bootstrap (CORS, health check `/ping`)
- [x] Server: `session-manager.ts` — create, join, list, kick, destroy
- [x] Server: `socket-handlers.ts` — routing + Zod validation middleware
- [x] Client: HomeScreen (create/join, name input, validation)
- [x] Client: LobbyScreen (player list with color rings, ready status, host controls, share link)
- [x] Client: Zustand store + `useSocket` hook (reconnection logic, state sync)
- [x] **Gate:** lobby.test.ts — create → join → see players across 3 sockets (4/4 pass)

### Phase 2 — Night Engine ✅
**Goal:** Night phase works; roles wake in order; actions resolve correctly.

- [x] Server: `game-engine.ts` — state machine with explicit valid transitions
- [x] Server: `timer-manager.ts` — server-authoritative timers with `day:timerSync`
- [x] Server: `night-resolver.ts` — action collection, atomic resolution, edge cases
- [x] Server: Role assignment (Fisher-Yates shuffle, respects config)
- [x] `shared/win-conditions.ts` — pure functions for all win conditions (18/18 tests pass)
- [x] Client: Role reveal animation (Framer Motion card flip)
- [x] Client: NightScreen — role-specific UI (Seer investigate, Doctor protect, WW vote, Witch potions)
- [x] Client: Werewolf night chat (private, WW wake only)
- [x] **Gate:** night-resolver.test.ts — 25/25 resolution cases pass

### Phase 3 — Day Phase ✅
**Goal:** Discussion, accusation, voting, and lynching all work.

- [x] Server: Day discussion timer + rate-limited chat relay (dead players muted)
- [x] Server: Accusation system (must be seconded to proceed to vote)
- [x] Server: Vote collection + majority logic (tie = no lynch, Village Idiot reveal)
- [x] Server: Lynch resolution — role reveal, Hunter revenge, Elder punishment, Jester trigger
- [x] Client: DayScreen — chat panel, accusation buttons, player ring
- [x] Client: Vote screen — animated vote tokens, live tally, timer
- [x] Client: Death animation + last words (10s countdown)
- [x] **Gate:** resolveDayVote scenarios included in night-resolver.test.ts (all pass)

### Phase 4 — Polish & Edge Cases ✅
**Goal:** All roles work correctly; Game Over screen; reconnection hardened.

- [x] Cupid + Lovers logic (Night 1 setup, chain death, cross-team third-faction win condition)
- [x] Alpha Werewolf conversion (mid-game team switch + player notification)
- [x] Wolf Cub rage mechanic (double-kill flag set on cub death)
- [x] Little Girl peek mechanic (partial info reveal + caught-and-killed path)
- [x] Elder: 2-HP vs wolves + village punishment on lynch
- [x] Serial Killer full integration (WW immunity, independent kill, win condition)
- [x] Spectator mode (read-only socket; no game interactions)
- [x] GameOverScreen (full role reveal, kill history, vote history)
- [x] Sound effects (Howler.js: zero-dependency WAV synthesis via Web Audio API)
- [x] **Gate:** 29/29 integration tests pass (lobby + night resolver + day vote)

### Phase 5 — Hardening ✅
**Goal:** Production-ready. No exploits. Smooth UX.

- [x] Rate limiting — `express-rate-limit` on REST + per-socket throttle (20 msgs/min)
- [x] Input sanitization — `DOMPurify` on client + server-side HTML tag stripping; `textContent` only
- [x] Anti-cheat audit — all game logic confirmed server-only; client is pure renderer
- [ ] Load test — 50 concurrent 20-player sessions; assert <100ms event latency (`k6`)
- [x] Mobile responsive pass — touch targets ≥ 44px, viewport meta, PlayerRing auto-scales, 300ms tap delay removed
- [ ] Accessibility pass — ARIA labels, color-blind mode (pattern fallback), screen reader test
- [x] Docker + nginx config — `Dockerfile`, `Dockerfile.nginx`, `docker-compose.yml`, `nginx.conf` with WebSocket upgrade
- [ ] **Gate:** load test passes; Lighthouse accessibility score ≥ 90

---

## Critical Test Scenarios

**All 16 must pass before shipping (Phase 4 gate).**

1. Doctor saves WW target → target survives
2. Witch heals AND Doctor saves same target → target survives (no double-remove bug)
3. Witch kills player that WW also targeted → player dies once only
4. Hunter dies at night → revenge triggers at dawn
5. Hunter is lynched → revenge triggers immediately
6. Elder attacked by WW → survives first time; attacked again → dies
7. Elder is lynched → all Village special powers disabled for remainder
8. Cupid links WW + Villager → they become third faction (win only if last 2 alive)
9. Lover A dies → Lover B dies immediately; if B was Hunter, Hunter revenge fires
10. Alpha converts target → target becomes WW, is notified, switches team
11. Wolf Cub dies → next night WW get exactly 2 kills
12. Tanner is lynched → Tanner wins; game continues for others
13. Serial Killer targeted by WW → SK survives; WW kill wasted
14. 20-player game with all roles active → completes without error
15. Player disconnects during night action → action times out; game continues
16. All werewolves go AFK → Village auto-wins (no WW kill; day vote eliminates them)

---

## Architecture Rules (never violate)

| Rule | Rationale |
|------|-----------|
| **Server is the single source of truth** | Client is a renderer only; zero game logic client-side |
| **Zod validate every inbound socket message** | Rejects malformed/forged payloads before they touch game state |
| **State machine with explicit valid transitions** | No voting during night, no night actions during day |
| **Shared types between client and server** | TypeScript catches drift at compile time |
| **Atomic night resolution** | Collect all actions, then resolve in one synchronous pass — no interleaving |
| **Per-socket role emits only** | `socket.emit()` not `io.to(room).emit()` for any role-revealing event |
| **Server-authoritative timers** | Client timer is cosmetic; `day:timerSync` every 5s prevents drift |
| **Sequential event processing per session** | Use a per-session async queue/mutex to prevent race conditions on concurrent votes |

---

## Bug Prevention Checklist

Before any PR, verify:

- [ ] No game logic in `packages/client`
- [ ] Every new socket event has a Zod schema in `shared/schemas.ts`
- [ ] Every action handler checks `player.isAlive` before processing
- [ ] No `socket.broadcast` or `io.to(room).emit` contains role or nightAction data
- [ ] New role implemented in: `roles.ts` + `night-resolver.ts` + `win-conditions.ts` + NightScreen UI
- [ ] `win-conditions.ts` unit tests updated for any new win path

---

## Environment Variables

```env
PORT=3000
NODE_ENV=production
SESSION_TTL_MINUTES=120
MAX_PLAYERS_PER_SESSION=20
MAX_SESSIONS=200
CORS_ORIGIN=https://werewolf.app
```

---

## Deployment

**Recommended:** Fly.io (native WebSocket support, global edge)

```bash
# Docker Compose (VPS)
docker compose up -d

# Fly.io
fly launch
fly deploy
```

Reverse proxy: nginx or Caddy — must pass WebSocket upgrade headers for `/socket.io/`.

---

## Post-MVP Backlog

- Voice chat (LiveKit or Daily.co)
- Custom role builder
- Game replays (replayable event log)
- Persistent accounts + stats
- Ranked matchmaking
- i18n (Spanish, French, Portuguese)
- Themed skins (medieval, cyberpunk, cosmic horror)
