import React from "react";
import { motion } from "framer-motion";
import { RoleName, Team, ROLES } from "@werewolf/shared";

interface RoleCardProps {
  role: RoleName;
  team: Team;
  description: string;
  loverId?: string | null;
  loverName?: string | null;
  masonIds?: string[];
  myId?: string;
  flipped?: boolean;
}

const TEAM_COLORS: Record<Team, string> = {
  [Team.VILLAGE]: "#2A9D8F",
  [Team.WEREWOLF]: "#E63946",
  [Team.NEUTRAL]: "#F4A261",
};

const TEAM_LABELS: Record<Team, string> = {
  [Team.VILLAGE]: "Village",
  [Team.WEREWOLF]: "Werewolf",
  [Team.NEUTRAL]: "Neutral",
};

const ROLE_ICONS: Partial<Record<RoleName, string>> = {
  [RoleName.Werewolf]: "🐺",
  [RoleName.AlphaWerewolf]: "🐺👑",
  [RoleName.WolfCub]: "🐶",
  [RoleName.Sorceress]: "🔮",
  [RoleName.Villager]: "🧑‍🌾",
  [RoleName.Seer]: "👁️",
  [RoleName.Doctor]: "⚕️",
  [RoleName.Bodyguard]: "🛡️",
  [RoleName.Hunter]: "🏹",
  [RoleName.Witch]: "🧙",
  [RoleName.Cupid]: "💘",
  [RoleName.LittleGirl]: "👧",
  [RoleName.Elder]: "🧓",
  [RoleName.VillageIdiot]: "🤪",
  [RoleName.Mason]: "🔨",
  [RoleName.Tanner]: "🪡",
  [RoleName.SerialKiller]: "🔪",
  [RoleName.Jester]: "🃏",
};

export function RoleCard({
  role,
  team,
  description,
  loverId,
  loverName,
  masonIds = [],
  myId,
  flipped = false,
}: RoleCardProps) {
  const teamColor = TEAM_COLORS[team];
  const icon = ROLE_ICONS[role] ?? "❓";
  const roleDef = ROLES[role];

  return (
    <motion.div
      initial={flipped ? { rotateY: 180, opacity: 0 } : { opacity: 0, scale: 0.9 }}
      animate={{ rotateY: 0, opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 120, damping: 18, delay: 0.2 }}
      style={{
        background: `linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))`,
        border: `1px solid ${teamColor}40`,
        borderRadius: "20px",
        padding: "28px 24px",
        maxWidth: "400px",
        width: "100%",
        boxShadow: `0 0 40px ${teamColor}20, 0 8px 32px rgba(0,0,0,0.4)`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Team glow */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "3px",
          background: `linear-gradient(90deg, transparent, ${teamColor}, transparent)`,
        }}
      />

      {/* Team badge */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          background: `${teamColor}20`,
          border: `1px solid ${teamColor}40`,
          borderRadius: "20px",
          padding: "4px 12px",
          fontSize: "12px",
          fontWeight: 700,
          color: teamColor,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: "20px",
        }}
      >
        {TEAM_LABELS[team]}
      </div>

      {/* Icon + name */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
        <span style={{ fontSize: "48px" }}>{icon}</span>
        <div>
          <h2 style={{ fontSize: "24px", fontWeight: 800, color: "#e8e8f0" }}>
            {role.replace(/([A-Z])/g, " $1").trim()}
          </h2>
          {roleDef?.shortDescription && (
            <p style={{ fontSize: "13px", color: teamColor, marginTop: "4px" }}>
              {roleDef.shortDescription}
            </p>
          )}
        </div>
      </div>

      {/* Description */}
      <p style={{ fontSize: "14px", lineHeight: "1.6", color: "#bbb", marginBottom: loverName || masonIds.length > 0 ? "16px" : 0 }}>
        {description}
      </p>

      {/* Lovers info */}
      {loverName && (
        <div
          style={{
            background: "rgba(247,37,133,0.1)",
            border: "1px solid rgba(247,37,133,0.3)",
            borderRadius: "10px",
            padding: "10px 14px",
            fontSize: "13px",
            color: "#F72585",
            marginTop: "12px",
          }}
        >
          💘 You are in love with <strong>{loverName}</strong>. If they die, you die.
        </div>
      )}

      {/* Mason info */}
      {masonIds.length > 0 && myId && (
        <div
          style={{
            background: "rgba(42,157,143,0.1)",
            border: "1px solid rgba(42,157,143,0.3)",
            borderRadius: "10px",
            padding: "10px 14px",
            fontSize: "13px",
            color: "#2A9D8F",
            marginTop: "12px",
          }}
        >
          🔨 Fellow Masons: {masonIds.filter((id) => id !== myId).length} allies
        </div>
      )}
    </motion.div>
  );
}
