import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

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
        gap: "8px",
        background: isUrgent ? "rgba(230,57,70,0.2)" : "rgba(255,255,255,0.06)",
        border: `1px solid ${isUrgent ? "rgba(230,57,70,0.5)" : "rgba(255,255,255,0.12)"}`,
        borderRadius: "20px",
        padding: "6px 16px",
        color: isUrgent ? "#E63946" : "#e8e8f0",
        fontSize: "14px",
        fontWeight: 700,
        fontVariantNumeric: "tabular-nums",
        transition: "background 0.3s, border-color 0.3s, color 0.3s",
      }}
    >
      <span style={{ fontSize: "16px" }}>{isUrgent ? "⏰" : "⏱"}</span>
      {label && <span style={{ color: "#aaa", fontWeight: 400 }}>{label}</span>}
      <span>{display}</span>
    </motion.div>
  );
}
