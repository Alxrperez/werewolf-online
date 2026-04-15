import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server as IOServer } from "socket.io";
import cors from "cors";
import {
  getAllSessions,
  destroySession,
} from "./session-manager.js";
import { registerSocketHandlers } from "./socket-handlers.js";
import { apiRateLimiter } from "./middleware/rate-limit.js";
import { registerRoutes } from "./routes.js";
import {
  SESSION_CLEANUP_INTERVAL_MS,
  SESSION_TTL_AFTER_GAME_OVER_MS,
  SessionState,
} from "@werewolf/shared";

// ─── Config ───────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env["PORT"] ?? "3000", 10);
const IS_DEV = process.env["NODE_ENV"] !== "production";
// In dev, allow any localhost origin (Vite may start on 5173, 5174, 5175, etc.)
const CORS_ORIGIN: string | RegExp = IS_DEV
  ? /^http:\/\/localhost:\d+$/
  : (process.env["CORS_ORIGIN"] ?? "http://localhost:5173");
const BASE_URL = process.env["BASE_URL"] ?? `http://localhost:${PORT}`;
const MAX_SESSIONS = parseInt(process.env["MAX_SESSIONS"] ?? "200", 10);

// ─── Express app ──────────────────────────────────────────────────────────────

const app = express();
const httpServer = createServer(app);

app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(apiRateLimiter);

// ─── Socket.IO ────────────────────────────────────────────────────────────────

const io = new IOServer(httpServer, {
  cors: { origin: CORS_ORIGIN, methods: ["GET", "POST"] },
  transports: ["websocket", "polling"],
});

registerSocketHandlers(io);
registerRoutes(app, BASE_URL);

// ─── Session cleanup sweep ────────────────────────────────────────────────────

setInterval(() => {
  const now = Date.now();
  for (const session of getAllSessions()) {
    const allDisconnected = session.players.every((p) => !p.isConnected);
    const gameOverExpired =
      session.state === SessionState.GAME_OVER &&
      now - session.createdAt > SESSION_TTL_AFTER_GAME_OVER_MS;

    if (allDisconnected && session.players.length === 0) {
      destroySession(session.id);
    } else if (gameOverExpired) {
      destroySession(session.id);
    }
  }
}, SESSION_CLEANUP_INTERVAL_MS);

// ─── Start ────────────────────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`[server] listening on port ${PORT}`);
  console.log(`[server] CORS origin: ${CORS_ORIGIN}`);
});

export { app, httpServer, io };
