# Werewolf Online

A real-time, browser-based multiplayer social deduction game for **6–20 players** per session. Players join via a shareable link, receive secret role assignments, and compete through tension-filled Day/Night cycles. No downloads, no accounts — open a URL and play.

Built as a TypeScript monorepo with a React front-end and a Socket.IO game server. The server is the single source of truth for game state; the client is a pure renderer.

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Quick Start](#quick-start)
4. [Project Structure](#project-structure)
5. [How the Game Works](#how-the-game-works)
6. [Role Catalog](#role-catalog)
7. [Game State Machine](#game-state-machine)
8. [Socket Protocol](#socket-protocol)
9. [Architecture & Security](#architecture--security)
10. [Testing](#testing)
11. [Deployment](#deployment)
12. [Contributing](#contributing)
13. [License](#license)

---

## Features

- 🎭 **17 roles** across Village, Werewolf, and Neutral factions — Seer, Doctor, Witch, Cupid, Hunter, Bodyguard, Tanner, Serial Killer, Jester, and more.
- 🌗 **Full day/night cycle** with atomic night resolution and role-ordered waking.
- 🔗 **Shareable session links** — a 6-character code joins you into any lobby.
- 📱 **Mobile-responsive** UI with 44 px touch targets, animated transitions, and ambient sound effects.
- 🔒 **Server-authoritative** state machine with Zod-validated socket messages — no game logic on the client.
- 🔌 **Reconnection-safe** — 120 s grace window, session snapshot replay, AFK auto-skip.
- 👥 **Spectator mode** — read-only observers for eliminated or curious players.
- 🧪 **Tested** — 29 server-side unit/integration tests cover night resolution, day voting, and every role's win path.

## Tech Stack

| Layer            | Technology                                               |
| ---------------- | -------------------------------------------------------- |
| Language         | TypeScript 5.3 (strict)                                  |
| Monorepo         | npm workspaces                                           |
| Front-end        | React 18 + Vite, Zustand (state), Framer Motion, Howler  |
| Back-end         | Node.js + Express + Socket.IO v4                         |
| Validation       | Zod                                                      |
| Tests            | Vitest (unit/integration), Playwright (E2E), k6 (load)   |
| Security         | DOMPurify (client), server-side HTML stripping, rate-limit |
| Deploy           | Docker + nginx (WebSocket upgrade), Fly.io-compatible     |

---

## Quick Start

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9

### Install & run

```bash
# Install all workspaces
npm install

# Build the shared package (types + schemas) once
npm run build --workspace=packages/shared

# Start server (3000) + client (5173) concurrently
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in multiple browser windows or devices to simulate a lobby.

### Environment variables

Copy `.env.example` to `.env` and adjust:

```env
PORT=3000
NODE_ENV=development
SESSION_TTL_MINUTES=120
MAX_PLAYERS_PER_SESSION=20
MAX_SESSIONS=200
CORS_ORIGIN=http://localhost:5173
```

### Useful scripts

| Script                | What it does                                          |
| --------------------- | ----------------------------------------------------- |
| `npm run dev`         | Start server + client in watch mode                   |
| `npm run build`       | Production build of all three packages                |
| `npm run typecheck`   | Strict TypeScript check across every package          |
| `npm run test`        | Vitest unit + integration tests (shared + server)     |
| `npm run test:e2e`    | Playwright end-to-end browser tests                   |
| `npm run test:load`   | k6 load test (requires k6 installed)                  |
| `npm run lint`        | ESLint over all source files                          |

---

## Project Structure

```
werewolf/
├── packages/
│   ├── shared/                 # Types, Zod schemas, role catalog, pure win-condition fns
│   │   └── src/
│   │       ├── types.ts
│   │       ├── schemas.ts
│   │       ├── roles.ts
│   │       ├── constants.ts
│   │       └── win-conditions.ts
│   ├── server/                 # Express + Socket.IO game server
│   │   └── src/
│   │       ├── index.ts
│   │       ├── session-manager.ts
│   │       ├── game-engine.ts         # state transitions, role assignment, day vote
│   │       ├── night-resolver.ts      # atomic night action resolution
│   │       ├── socket-handlers.ts     # event routing + phase orchestration
│   │       ├── timer-manager.ts       # server-authoritative phase timers
│   │       └── middleware/            # Zod validation + rate-limit
│   └── client/                 # React SPA
│       └── src/
│           ├── App.tsx
│           ├── stores/gameStore.ts    # Zustand store
│           ├── hooks/                 # useSocket, useGameState
│           ├── screens/               # Home, Lobby, Night, Day, GameOver
│           └── components/            # PlayerRing, RoleCard, VotePanel, Timer, ChatPanel
├── Dockerfile                  # Server image
├── Dockerfile.nginx            # Client image (served by nginx)
├── docker-compose.yml
├── nginx.conf                  # WebSocket upgrade + static assets
├── tsconfig.base.json
├── CLAUDE.md                   # Deep project guide (phase plan, bug checklist)
└── README.md                   # ← you are here
```

---

## How the Game Works

1. **Create a session** from the home screen; you become the host and receive a shareable link.
2. **Players join** via the link, pick a name, and appear in the lobby with an auto-assigned color.
3. **Host configures the deck** (defaults provided for every player count from 6 to 20), then starts.
4. **Role reveal** — each player privately sees their role, team, and role description for 10 s.
5. **Night phase** — roles wake in a fixed order (Cupid → Masons → Werewolves → Sorceress → Seer → Doctor → Bodyguard → Witch → Serial Killer). Each waking role submits a single action.
6. **Dawn report** — the server atomically resolves all night actions and broadcasts deaths.
7. **Day discussion** — chat, accusations, and defenses. Accusations must be seconded to call a vote.
8. **Day vote** — majority lynches. Ties are no-lynch. Village Idiot, Jester, and Tanner all have special lynch outcomes.
9. **Loop** back to night until a win condition fires, then everyone sees the full role reveal and can replay.

## Role Catalog

### Werewolf Team
| Role            | Key Behavior                                                     |
| --------------- | ---------------------------------------------------------------- |
| Werewolf        | Wakes with pack; unanimous kill vote; knows pack members         |
| Alpha Werewolf  | Once per game: convert target into a Werewolf instead of killing |
| Wolf Cub        | If killed, pack gets 2 kills next night; appears as Villager to Seer |
| Sorceress       | Wolf-aligned; nightly yes/no "is this player the Seer?"          |

### Village Team
| Role        | Key Behavior                                                         |
| ----------- | -------------------------------------------------------------------- |
| Villager    | No ability — deduction + voting only                                 |
| Seer        | Nightly investigation — learn a player's exact role                  |
| Doctor      | Nightly protect — blocks the WW kill; no back-to-back same target    |
| Bodyguard   | Guards a target — absorbs fatal attack; cannot self-guard            |
| Hunter      | On death (any cause): immediately kills one chosen player            |
| Witch       | Heal potion (save WW target) + Kill potion (eliminate anyone); single use each |
| Cupid       | Night 1 only: links two Lovers; one dies → other dies                |
| Little Girl | Peeks at WW wake; sees target's color; dies if wolves catch her      |
| Elder       | Survives first WW attack; if lynched, all Village specials disabled  |
| Village Idiot | If lynched: revealed, survives, loses voting rights                |
| Mason       | Night 1: masons see each other; needs 2–3 in the deck                |

### Neutral / Third-Party
| Role           | Key Behavior                                                   |
| -------------- | -------------------------------------------------------------- |
| Tanner         | Wins only if lynched during the day                            |
| Serial Killer  | Nightly solo kill; immune to WW; wins as last alive            |
| Jester         | If lynched: the accuser dies too; Jester wins alongside winner |

### Suggested Distributions

| Players | Werewolves          | Special Village                                             | Plain | Neutral        |
| ------- | ------------------- | ----------------------------------------------------------- | ----- | -------------- |
| 6       | 1                   | Seer, Doctor                                                | 3     | 0              |
| 8       | 2                   | Seer, Doctor, Hunter                                        | 3     | 0              |
| 10      | 2                   | Seer, Doctor, Witch, Hunter                                 | 3     | 1 Tanner       |
| 12      | 3                   | Seer, Doctor, Witch, Hunter, Cupid                          | 3     | 1              |
| 15      | 3 + Sorceress       | Seer, Doctor, Witch, Hunter, Bodyguard, 2 Masons            | 3     | 2              |
| 18      | 3 + Alpha + Sorceress | Seer, Doctor, Witch, Hunter, Bodyguard, Cupid, Elder, 2 Masons | 2 | 2              |
| 20      | 4 + Alpha + Wolf Cub | Seer, Doctor, Witch, Hunter, Bodyguard, Cupid, Elder, Little Girl, 2 Masons | 2 | 2 (Tanner + SK) |

---

## Game State Machine

```
LOBBY ─▶ ROLE_REVEAL (10 s) ─▶ NIGHT ─▶ DAWN_REPORT (10 s) ─▶ DAY_DISCUSSION ─▶ DAY_VOTE ─▶ (loop or GAME_OVER)
```

Phase transitions are **server-only**. The client's timer is purely cosmetic — the server emits `day:timerSync` every 5 s so clients can never drift.

### Night resolution (atomic, after all actions collected)

1. Build the protection set (Doctor save, Witch heal, Bodyguard absorb).
2. Collect kills (WW, SK, Witch kill potion).
3. Apply Elder extra life if attacked by WW.
4. Resolve Alpha conversion (replaces the kill target).
5. Compute Seer / Sorceress results.
6. Apply deaths + trigger Lover chain-death + Wolf Cub rage flag.
7. Check win conditions; if fired, schedule `finalizeGame` after the dawn window.

### Win conditions

| Condition                                        | Winner          |
| ------------------------------------------------ | --------------- |
| All Werewolves dead AND no Serial Killer alive   | Village         |
| Wolf team ≥ living Villagers AND no SK alive     | Werewolves      |
| Tanner lynched during day                        | Tanner          |
| Serial Killer is last alive                      | Serial Killer   |
| Cross-team Lovers are the last two alive         | Lovers          |

---

## Socket Protocol

Every inbound socket message is **validated with Zod** before touching game state. Role-revealing events are emitted per-socket — never broadcast — so observers can't sniff secrets.

### REST endpoints

| Method | Path                         | Body             | Response                                                  |
| ------ | ---------------------------- | ---------------- | --------------------------------------------------------- |
| POST   | `/api/sessions`              | `{ hostName }`   | `{ sessionId, sessionCode, playerId, shareableLink }`     |
| GET    | `/api/sessions/:code`        | —                | `{ sessionId, playerCount, state, hostName }`             |
| POST   | `/api/sessions/:code/join`   | `{ playerName }` | `{ playerId, sessionId }`                                 |

### Client → Server events

| Event              | Payload                              | Valid states           |
| ------------------ | ------------------------------------ | ---------------------- |
| `player:ready`     | `{ playerId }`                       | LOBBY                  |
| `host:start`       | `{ roleConfig }`                     | LOBBY                  |
| `host:kick`        | `{ targetPlayerId }`                 | LOBBY                  |
| `host:resetGame`   | —                                    | GAME_OVER              |
| `night:action`     | `{ playerId, action }`               | NIGHT                  |
| `night:wwChat`     | `{ playerId, message }`              | NIGHT (wolves only)    |
| `day:accuse`       | `{ playerId, targetId }`             | DAY_DISCUSSION         |
| `day:second`       | `{ playerId, targetId }`             | DAY_DISCUSSION         |
| `day:vote`         | `{ playerId, targetId \| "skip" }`   | DAY_VOTE               |
| `day:chat`         | `{ playerId, message }`              | DAY_DISCUSSION         |
| `hunter:revenge`   | `{ playerId, targetId }`             | DAWN_REPORT            |
| `player:reconnect` | `{ playerId, sessionCode }`          | any                    |

### Server → Client events

| Event               | Payload                                                   | Scope                     |
| ------------------- | --------------------------------------------------------- | ------------------------- |
| `session:update`    | `{ session }` (no secret info)                            | broadcast                 |
| `game:roleReveal`   | `{ role, team, description }`                             | per-socket                |
| `night:wake`        | `{ yourTurn, aliveTargets, ... }`                         | per-socket (waking role)  |
| `night:seerResult`  | `{ targetId, role }`                                      | per-socket (Seer)         |
| `night:wwChat`      | `{ from, fromName, message }`                             | wolves only               |
| `dawn:report`       | `{ deaths, round }`                                       | broadcast                 |
| `day:timerSync`     | `{ secondsRemaining, phase }`                             | broadcast (every 5 s)     |
| `day:voteUpdate`    | `{ votes, tally }`                                        | broadcast                 |
| `day:lynchResult`   | `{ targetId, role, jesterTriggered, ... }`                | broadcast                 |
| `hunter:revengePrompt` | `{ aliveTargets }`                                    | per-socket (Hunter)       |
| `game:over`         | `{ winner, winningPlayerIds, allRoles }`                  | broadcast                 |
| `error`             | `{ code, message }`                                       | per-socket                |

---

## Architecture & Security

| Rule                                                   | Why                                                                            |
| ------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Server is the single source of truth                   | Client is a pure renderer — zero game logic, zero trust                        |
| Every inbound socket message is Zod-validated          | Malformed / forged payloads never touch game state                             |
| Explicit state-transition guard                        | No voting at night, no night actions during day                                |
| Atomic night resolution                                | All actions collected, then resolved in one synchronous pass — no interleaving |
| Per-socket role emits (`socket.emit`, not `io.to`)     | Role data never leaks in broadcast payloads                                    |
| Per-session async queue                                | Serializes concurrent events so votes / actions can't race                     |
| Server-authoritative timers                            | Client timers are cosmetic — `day:timerSync` prevents drift                    |
| Shared `@werewolf/shared` package                      | TypeScript catches contract drift between client and server at compile time   |

### Anti-cheat / abuse

- `DOMPurify` on the client and HTML tag stripping on the server for every chat message.
- `express-rate-limit` on REST plus 20 messages/minute per-socket throttle on chat.
- Player `isAlive` and `isConnected` checked on every action handler.

### Reconnection

```
Player disconnects
  → server marks isConnected = false
  → waits 120 s
      ├─ returns in window → replay full state snapshot, seamless resume
      └─ timeout
          ├─ state = LOBBY → remove player
          └─ state = mid-game → becomes AFK (auto-skip, still targetable)

Session cleanup
  → deleted 10 min after GAME_OVER
  → deleted when all players disconnect
  → sweep interval: 60 s
```

---

## Testing

```bash
# Unit + integration (29 tests, Vitest)
npm run test

# End-to-end browser tests (Playwright)
npm run test:e2e

# Load test — 50 concurrent 20-player sessions (requires k6)
npm run test:load
```

Coverage highlights:
- `packages/shared/src/win-conditions.ts` — 100 % pure-function coverage for every win path.
- `packages/server/src/test/night-resolver.test.ts` — 25 night-resolution scenarios including Doctor+Witch stacking, Elder extra life, Alpha conversion, Wolf Cub rage, Serial Killer immunity, Lover chain-death.
- `packages/server/src/test/lobby.test.ts` — end-to-end lobby flow across 3 simultaneous sockets.

---

## Deployment

### Docker Compose (VPS)

```bash
docker compose up -d
```

Starts the server (Node 18 + Socket.IO) and the client (nginx serving the built Vite bundle). The bundled `nginx.conf` handles WebSocket upgrades on `/socket.io/`.

### Fly.io

```bash
fly launch
fly deploy
```

Native WebSocket support + global edge is the easiest path.

### Reverse proxy checklist

Any deployment in front of the server must forward WebSocket upgrade headers:

```nginx
location /socket.io/ {
    proxy_pass http://werewolf-server:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

---

## Contributing

### Pre-PR checklist

- [ ] No game logic in `packages/client`.
- [ ] Every new socket event has a Zod schema in `packages/shared/src/schemas.ts`.
- [ ] Every action handler checks `player.isAlive` before processing.
- [ ] No `socket.broadcast` / `io.to(room).emit` contains role or night-action data.
- [ ] New roles implemented in: `roles.ts` + `night-resolver.ts` + `win-conditions.ts` + `NightScreen` UI.
- [ ] `win-conditions.ts` unit tests updated for any new win path.
- [ ] `npm run typecheck && npm run test` passes.

See [`CLAUDE.md`](./CLAUDE.md) for the deep project guide — phase plan, bug-prevention checklist, and critical test scenarios that must all pass before shipping.

---

## License

MIT — see `LICENSE` (add one if you plan to publish).
