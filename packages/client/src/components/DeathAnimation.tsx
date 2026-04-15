import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DeathRecord, RoleName } from "@werewolf/shared";

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
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <motion.div
            initial={{ scale: 0.8, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "rgba(10,10,20,0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "24px",
              padding: "36px 32px",
              maxWidth: "480px",
              width: "100%",
              boxShadow: "0 32px 80px rgba(0,0,0,0.8)",
            }}
          >
            <h2
              style={{
                fontSize: "22px",
                fontWeight: 800,
                color: "#e8e8f0",
                textAlign: "center",
                marginBottom: "24px",
              }}
            >
              {deaths.length === 0 ? "🌄 A peaceful night" : "🌄 Dawn breaks..."}
            </h2>

            {deaths.length === 0 ? (
              <p style={{ textAlign: "center", color: "#888", fontSize: "15px" }}>
                No one was harmed tonight.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {deaths.map((death, i) => (
                  <motion.div
                    key={death.playerId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.15 }}
                    style={{
                      background: "rgba(230,57,70,0.08)",
                      border: "1px solid rgba(230,57,70,0.2)",
                      borderRadius: "14px",
                      padding: "16px",
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                    }}
                  >
                    <span style={{ fontSize: "28px" }}>💀</span>
                    <div>
                      <p style={{ fontSize: "16px", fontWeight: 700, color: "#e8e8f0" }}>
                        {death.playerName}
                        <span style={{ fontSize: "13px", fontWeight: 400, color: "#aaa", marginLeft: "8px" }}>
                          was the {death.role}
                        </span>
                      </p>
                      <p style={{ fontSize: "13px", color: "#E63946", marginTop: "2px" }}>
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
                marginTop: "24px",
                width: "100%",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "12px",
                padding: "12px",
                color: "#e8e8f0",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: "15px",
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
