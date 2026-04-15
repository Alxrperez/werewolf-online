import { TIMER_SYNC_INTERVAL_MS } from "@werewolf/shared";

interface TimerEntry {
  sessionId: string;
  endTime: number;
  onExpire: () => void;
  syncInterval: ReturnType<typeof setInterval> | null;
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();
const timerEntries = new Map<string, TimerEntry>();
const syncIntervals = new Map<string, ReturnType<typeof setInterval>>();

/**
 * Start a server-authoritative phase timer for a session.
 * @param sessionId   Unique session ID (used as key)
 * @param durationMs  How long until expiry
 * @param onExpire    Called when the timer fires
 * @param onSync      Called every TIMER_SYNC_INTERVAL_MS with secondsRemaining
 */
export function startTimer(
  sessionId: string,
  durationMs: number,
  onExpire: () => void,
  onSync?: (secondsRemaining: number) => void
): void {
  clearTimer(sessionId);

  const endTime = Date.now() + durationMs;

  const handle = setTimeout(() => {
    clearTimer(sessionId);
    onExpire();
  }, durationMs);

  timers.set(sessionId, handle);
  timerEntries.set(sessionId, { sessionId, endTime, onExpire, syncInterval: null });

  if (onSync) {
    const syncHandle = setInterval(() => {
      const entry = timerEntries.get(sessionId);
      if (!entry) return;
      const remaining = Math.max(0, Math.ceil((entry.endTime - Date.now()) / 1000));
      onSync(remaining);
    }, TIMER_SYNC_INTERVAL_MS);
    syncIntervals.set(sessionId, syncHandle);
  }
}

/**
 * Clear and cancel a session timer.
 */
export function clearTimer(sessionId: string): void {
  const handle = timers.get(sessionId);
  if (handle !== undefined) {
    clearTimeout(handle);
    timers.delete(sessionId);
  }
  const syncHandle = syncIntervals.get(sessionId);
  if (syncHandle !== undefined) {
    clearInterval(syncHandle);
    syncIntervals.delete(sessionId);
  }
  timerEntries.delete(sessionId);
}

/**
 * Get remaining milliseconds for a session's active timer.
 */
export function getRemainingMs(sessionId: string): number {
  const entry = timerEntries.get(sessionId);
  if (!entry) return 0;
  return Math.max(0, entry.endTime - Date.now());
}

/**
 * Get remaining seconds (rounded up).
 */
export function getRemainingSeconds(sessionId: string): number {
  return Math.ceil(getRemainingMs(sessionId) / 1000);
}

export function hasActiveTimer(sessionId: string): boolean {
  return timers.has(sessionId);
}
