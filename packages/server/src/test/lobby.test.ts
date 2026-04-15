import { describe, it, expect, beforeAll, afterAll } from "vitest";
import supertest from "supertest";
import express from "express";
import { createServer } from "http";
import { Server as IOServer } from "socket.io";
import { registerSocketHandlers } from "../socket-handlers.js";
import { registerRoutes } from "../routes.js";
import { createTestServer, connectClient, waitFor } from "./helpers.js";
import { PublicSession, SessionState } from "@werewolf/shared";

describe("Lobby gate — create → join → see players across 3 sockets", () => {
  let server: Awaited<ReturnType<typeof createTestServer>>;
  const clients: ReturnType<typeof connectClient>[] = [];

  beforeAll(async () => {
    server = await createTestServer();
  });

  afterAll(async () => {
    clients.forEach((c) => c.disconnect());
    await server.close();
  });

  it("POST /api/sessions creates a session", async () => {
    const app = express();
    app.use(express.json());
    const httpServer = createServer(app);
    const io = new IOServer(httpServer, { cors: { origin: "*" } });
    registerSocketHandlers(io);
    await new Promise<void>((r) => httpServer.listen(0, r));
    const port = (httpServer.address() as { port: number }).port;
    registerRoutes(app, `http://localhost:${port}`);

    const res = await supertest(`http://localhost:${port}`)
      .post("/api/sessions")
      .send({ hostName: "Alice" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      sessionCode: expect.stringMatching(/^[A-Z0-9]{6}$/),
      playerId: expect.any(String),
    });

    await new Promise<void>((r) => httpServer.close(() => r()));
  });

  it("3 players join and all see each other via session:update", async () => {
    // Create session via socket reconnect pattern
    const base = `http://localhost:${server.port}`;

    // Create session
    const createRes = await fetch(`${base}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostName: "Alice" }),
    });
    expect(createRes.ok).toBe(true);
    const { sessionCode, playerId: aliceId } = await createRes.json() as {
      sessionCode: string;
      playerId: string;
      sessionId: string;
    };

    // Join player 2
    const joinBob = await fetch(`${base}/api/sessions/${sessionCode}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: "Bob" }),
    });
    const { playerId: bobId } = await joinBob.json() as { playerId: string };

    // Join player 3
    const joinCarla = await fetch(`${base}/api/sessions/${sessionCode}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: "Carla" }),
    });
    const { playerId: carlaId } = await joinCarla.json() as { playerId: string };

    // Connect all 3 via sockets with player:reconnect
    const alice = connectClient(server.port);
    const bob = connectClient(server.port);
    const carla = connectClient(server.port);
    clients.push(alice, bob, carla);

    const aliceUpdate = waitFor<{ session: PublicSession }>(alice, "session:update");
    alice.emit("player:reconnect", { playerId: aliceId, sessionCode });
    const { session: aliceSession } = await aliceUpdate;
    expect(aliceSession.players).toHaveLength(3);
    expect(aliceSession.state).toBe(SessionState.LOBBY);

    const bobUpdate = waitFor<{ session: PublicSession }>(bob, "session:update");
    bob.emit("player:reconnect", { playerId: bobId, sessionCode });
    const { session: bobSession } = await bobUpdate;
    expect(bobSession.players).toHaveLength(3);

    const carlaUpdate = waitFor<{ session: PublicSession }>(carla, "session:update");
    carla.emit("player:reconnect", { playerId: carlaId, sessionCode });
    const { session: carlaSession } = await carlaUpdate;
    expect(carlaSession.players).toHaveLength(3);

    // Verify all 3 see the same player names
    const names = carlaSession.players.map((p) => p.name).sort();
    expect(names).toEqual(["Alice", "Bob", "Carla"]);
  });

  it("rejects duplicate names", async () => {
    const base = `http://localhost:${server.port}`;
    const res = await fetch(`${base}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostName: "DupTest" }),
    });
    const { sessionCode } = await res.json() as { sessionCode: string };

    const join1 = await fetch(`${base}/api/sessions/${sessionCode}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: "DupTest" }),
    });
    expect(join1.status).toBe(400);
  });

  it("validates playerName length", async () => {
    const base = `http://localhost:${server.port}`;
    const res = await fetch(`${base}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostName: "X" }), // too short
    });
    expect(res.status).toBe(400);
  });
});
