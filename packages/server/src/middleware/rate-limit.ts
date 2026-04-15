import rateLimit from "express-rate-limit";
import { Socket } from "socket.io";

// ─── REST rate limiters ───────────────────────────────────────────────────────

export const apiRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

export const createSessionLimiter = rateLimit({
  windowMs: 10 * 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many sessions created from this IP." },
});

// ─── Per-socket chat rate limiter ──────────────────────────────────────────────

const chatTimestamps = new Map<string, number[]>();

export function isSocketChatRateLimited(socket: Socket): boolean {
  const now = Date.now();
  const windowMs = 60_000;
  const maxMessages = 20;

  const socketId = socket.id;
  const timestamps = chatTimestamps.get(socketId) ?? [];
  const recent = timestamps.filter((t) => now - t < windowMs);
  recent.push(now);
  chatTimestamps.set(socketId, recent);

  return recent.length > maxMessages;
}

export function cleanupChatRateLimit(socketId: string): void {
  chatTimestamps.delete(socketId);
}
