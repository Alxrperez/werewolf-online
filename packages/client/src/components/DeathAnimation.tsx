import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DeathRecord } from "@werewolf/shared";
import { color, font, space, radius, shadow, layout, z } from "../design/tokens.js";

interface DeathAnimationProps {
  deaths: DeathRecord[];
  visible: boolean;
  onDismiss: () => void;
}

const CAUSE_LABELS: Record<DeathRecord["cause"], string> = {
  werewolf: "Devoured by werewolves",
  lynch: "Lynched by the village",
  witch_kill: "Poisoned by the Witch",
  serial_killer: "Slain by the Serial Killer",
  hunter_revenge: "Shot by the Hunter",
  lover_chain: "Died of heartbreak",
  bodyguard: "Fell protecting another",
};

const CAUSE_ICONS: Record<DeathRecord["cause"], string> = {
  werewolf: "🐺",
  lynch: "⚖️",
  witch_kill: "🧙",
  serial_killer: "🔪",
  hunter_revenge: "🏹",
  lover_chain: "💔",
  bodyguard: "🛡️",
};

export function DeathAnimation({ deaths, visible, onDismiss }: DeathAnimationProps) {
  if (deaths.length === 0 && !visible) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDismiss}
          style={{
            position: "fixed",
            inset: 0,
            background: color.scrim.heavy,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: z.overlay,
            padding: space[5],
          }}
        >
          <motion.div
            initial={{ scale: 0.8, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: color.bg.elevated,
              border: `1px solid ${color.border.subtle}`,
              borderRadius: radius["3xl"],
              padding: `${space[7]} ${space[7]}`,
              maxWidth: "480px",
              width: "100%",
              boxShadow: shadow.xl,
            }}
          >
            <h2
              style={{
                fontSize: font.size.xl,
                fontWeight: font.weight.black,
                color: color.text.primary,
                textAlign: "center",
                marginBottom: space[6],
                letterSpacing: font.letterSpacing.tight,
              }}
            >
              {deaths.length === 0 ? "🌄 A peaceful night" : "🌄 Dawn breaks..."}
            </h2>

            {deaths.length === 0 ? (
              <p
                style={{
                  textAlign: "center",
                  color: color.text.muted,
                  fontSize: font.size.base,
                }}
              >
                No one was harmed tonight.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
                {deaths.map((death, i) => (
                  <motion.div
                    key={death.playerId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.15 }}
                    style={{
                      background: color.accent.bg,
                      border: `1px solid ${color.accent.border}`,
                      borderRadius: radius.lg,
                      padding: space[4],
                      display: "flex",
                      alignItems: "center",
                      gap: space[3],
                    }}
                  >
                    <span style={{ fontSize: "28px" }}>💀</span>
                    <div>
                      <p
                        style={{
                          fontSize: font.size.md,
                          fontWeight: font.weight.bold,
                          color: color.text.primary,
                        }}
                      >
                        {death.playerName}
                        <span
                          style={{
                            fontSize: font.size.sm,
                            fontWeight: font.weight.regular,
                            color: color.text.secondary,
                            marginLeft: space[2],
                          }}
                        >
                          was the {death.role}
                        </span>
                      </p>
                      <p
                        style={{
                          fontSize: font.size.sm,
                          color: color.accent.base,
                          marginTop: 2,
                        }}
                      >
                        {CAUSE_ICONS[death.cause]} {CAUSE_LABELS[death.cause]}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            <button
              onClick={onDismiss}
              style={{
                marginTop: space[6],
                width: "100%",
                background: color.surface.raised,
                border: `1px solid ${color.border.default}`,
                borderRadius: radius.lg,
                padding: space[3],
                minHeight: layout.minTapTarget,
                color: color.text.primary,
                fontWeight: font.weight.semibold,
                cursor: "pointer",
                fontSize: font.size.base,
              }}
            >
              Continue →
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
