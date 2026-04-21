import React from "react";
import { motion } from "framer-motion";
import { useGameState } from "../hooks/useGameState.js";
import { useSocket } from "../hooks/useSocket.js";
import { color, font, space, radius, shadow, layout, z } from "../design/tokens.js";

/**
 * Hunter's revenge prompt. Rendered at the App root so it appears on top of
 * whichever screen is active (NightScreen during DAWN_REPORT, DayScreen after
 * a lynch). Intentionally has no `isAlive` gate — the Hunter is DEAD when this
 * shows, by definition.
 */
export function HunterRevengeOverlay() {
  const { hunterRevengeTargets, playerId } = useGameState();
  const { sendHunterRevenge } = useSocket();

  if (!hunterRevengeTargets || !playerId) return null;

  return (
    <div style={styles.overlayContainer}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={styles.overlayCard}
      >
        {/* Crimson accent — this is a danger confirmation, a perfect use. */}
        <h2
          style={{
            fontSize: font.size.xl,
            fontWeight: font.weight.black,
            color: color.accent.base,
            marginBottom: space[2],
            letterSpacing: font.letterSpacing.tight,
          }}
        >
          🏹 Hunter's Last Shot
        </h2>
        <p
          style={{
            color: color.text.secondary,
            fontSize: font.size.sm,
            marginBottom: space[5],
          }}
        >
          You've been killed. Choose one player to take with you:
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: space[2] }}>
          {hunterRevengeTargets.map((target) => (
            <motion.button
              key={target.id}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => sendHunterRevenge(playerId, target.id)}
              style={{
                background: color.surface.input,
                border: `1px solid ${target.color}`,
                borderRadius: radius.lg,
                padding: `${space[3]} ${space[4]}`,
                minHeight: layout.minTapTarget,
                cursor: "pointer",
                color: color.text.primary,
                fontSize: font.size.base,
                fontWeight: font.weight.semibold,
                display: "flex",
                alignItems: "center",
                gap: space[2],
              }}
            >
              {/* target.color stays — it is player identity game-data */}
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: radius.pill,
                  background: target.color,
                }}
              />
              {target.name}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

const styles = {
  overlayContainer: {
    position: "fixed" as const,
    inset: 0,
    background: color.scrim.dialog,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: z.critical,
    padding: space[5],
  },
  overlayCard: {
    background: color.bg.elevated,
    border: `1px solid ${color.accent.border}`,
    borderRadius: radius["3xl"],
    padding: `${space[7]} ${space[6]}`,
    maxWidth: "400px",
    width: "100%",
    boxShadow: shadow.accentGlow + ", " + shadow.xl,
  },
} as const;
