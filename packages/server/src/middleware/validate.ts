import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { SOCKET_SCHEMAS, SocketEventName } from "@werewolf/shared";
import { Socket } from "socket.io";

// ─── Express Zod validation middleware ───────────────────────────────────────

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: "Validation failed",
        issues: result.error.flatten(),
      });
      return;
    }
    (req as Request & { validated: T }).validated = result.data;
    next();
  };
}

// ─── Socket Zod validation helper ────────────────────────────────────────────

/**
 * Validate an inbound socket payload against the registered schema for the event.
 * Returns { success: true, data } or { success: false, error }.
 */
export function validateSocketPayload<E extends SocketEventName>(
  event: E,
  payload: unknown
):
  | { success: true; data: ReturnType<(typeof SOCKET_SCHEMAS)[E]["parse"]> }
  | { success: false; error: ZodError } {
  const schema = SOCKET_SCHEMAS[event];
  const result = schema.safeParse(payload);
  if (result.success) {
    return { success: true, data: result.data as ReturnType<(typeof SOCKET_SCHEMAS)[E]["parse"]> };
  }
  return { success: false, error: result.error };
}

/**
 * Emit a standardized error to a socket.
 */
export function emitSocketError(socket: Socket, code: string, message: string): void {
  socket.emit("error", { code, message });
}
