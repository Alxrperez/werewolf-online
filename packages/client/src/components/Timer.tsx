import React from "react";
import { motion } from "framer-motion";
import { color, font, space, radius } from "../design/tokens.js";

interface TimerProps {
  seconds: number;
  label?: string;
  urgent?: number; // threshold in seconds to show red
}

export function Timer({ seconds, label, urgent = 15 }: TimerProps) {
  const isUrgent = seconds <= urgent && seconds > 0;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const display = mins > 0 ? `${mins}:${secs.toString().padStart(2, "0")}` : `${secs}s`;

  return (
    <motion.div
      animate={isUrgent ? { scale: [1, 1.05, 1] } : {}}
      transition={{ repeat: Infinity, duration: 0.8 }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: space[2],
        // Crimson is reserved for the urgent "danger" state — this is exactly
        // that semantic. The calm state uses a plain raised surface.
        background: isUrgent ? color.accent.bg : color.surface.raised,
        border: `1px solid ${isUrgent ? color.accent.border : color.border.subtle}`,
        borderRadius: radius.pill,
        padding: `${space[1]} ${space[4]}`,
        color: isUrgent ? color.accent.base : color.text.primary,
        fontSize: font.size.sm,
        fontWeight: font.weight.bold,
        fontFamily: font.family.sans,
        fontVariantNumeric: "tabular-nums",
        transition: "background 0.3s, border-color 0.3s, color 0.3s",
      }}
    >
      <span style={{ fontSize: font.size.md }}>{isUrgent ? "⏰" : "⏱"}</span>
      {label && (
        <span style={{ color: color.text.secondary, fontWeight: font.weight.regular }}>
          {label}
        </span>
      )}
      <span>{display}</span>
    </motion.div>
  );
}
