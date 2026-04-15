import { Express } from "express";
import { createSessionSchema, joinSessionSchema } from "@werewolf/shared";
import {
  createSession,
  joinSession,
  getSessionByCode,
  getAllSessions,
} from "./session-manager.js";
import { validateBody } from "./middleware/validate.js";
import { createSessionLimiter } from "./middleware/rate-limit.js";

const MAX_SESSIONS = parseInt(process.env["MAX_SESSIONS"] ?? "200", 10);

export function registerRoutes(app: Express, baseUrl = "http://localhost:3000"): void {
  // Health check
  app.get("/ping", (_req, res) => {
    res.json({ status: "ok", sessions: getAllSessions().length });
  });

  // Create session
  app.post(
    "/api/sessions",
    createSessionLimiter,
    validateBody(createSessionSchema),
    (req, res) => {
      if (getAllSessions().length >= MAX_SESSIONS) {
        res.status(503).json({ error: "Server at capacity. Try again later." });
        return;
      }
      const { hostName, nightTimeSecs, discussionTimeSecs, voteTimeSecs } = (
        req as typeof req & { validated: { hostName: string; nightTimeSecs?: number; discussionTimeSecs?: number; voteTimeSecs?: number } }
      ).validated;
      const { session, playerId } = createSession(hostName, baseUrl, {
        ...(nightTimeSecs !== undefined && { nightTimeSecs }),
        ...(discussionTimeSecs !== undefined && { discussionTimeSecs }),
        ...(voteTimeSecs !== undefined && { voteTimeSecs }),
      });

      res.status(201).json({
        sessionId: session.id,
        sessionCode: session.code,
        playerId,
        shareableLink: session.shareableLink,
      });
    }
  );

  // Get session info
  app.get("/api/sessions/:code", (req, res) => {
    const session = getSessionByCode(req.params["code"] ?? "");
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    const host = session.players.find((p) => p.id === session.hostPlayerId);
    res.json({
      sessionId: session.id,
      playerCount: session.players.length,
      state: session.state,
      hostName: host?.name ?? "Unknown",
    });
  });

  // Join session
  app.post(
    "/api/sessions/:code/join",
    validateBody(joinSessionSchema),
    (req, res) => {
      const { playerName } = (req as typeof req & { validated: { playerName: string } }).validated;
      const result = joinSession(req.params["code"] ?? "", playerName);
      if ("error" in result) {
        res.status(400).json({ error: result.error });
        return;
      }
      res.status(201).json({
        playerId: result.playerId,
        sessionId: result.session.id,
      });
    }
  );
}
