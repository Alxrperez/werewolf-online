import React from "react";
import { motion } from "framer-motion";
import { RoleName, Team, ROLES } from "@werewolf/shared";
import { color, font, space, radius, shadow } from "../design/tokens.js";

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

const TEAM_TOKENS: Record<Team, { fg: string; bg: string; border: string }> = {
  [Team.VILLAGE]: { fg: color.team.village, bg: color.team.villageBg, border: color.team.villageBorder },
  [Team.WEREWOLF]: { fg: color.team.werewolf, bg: color.team.werewolfBg, border: color.team.werewolfBorder },
  [Team.NEUTRAL]: { fg: color.team.neutral, bg: color.team.neutralBg, border: color.team.neutralBorder },
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
  const tokens = TEAM_TOKENS[team];
  const icon = ROLE_ICONS[role] ?? "❓";
  const roleDef = ROLES[role];
  const hasFooter = Boolean(loverName) || masonIds.length > 0;

  return (
    <motion.div
      initial={flipped ? { rotateY: 180, opacity: 0 } : { opacity: 0, scale: 0.9 }}
      animate={{ rotateY: 0, opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 120, damping: 18, delay: 0.2 }}
      style={{
        background: color.surface.card,
        border: `1px solid ${tokens.border}`,
        borderRadius: radius["2xl"],
        padding: `${space[7]} ${space[6]}`,
        maxWidth: "400px",
        width: "100%",
        boxShadow: shadow.lg,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Team glow stripe at very top */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "3px",
          background: `linear-gradient(90deg, transparent, ${tokens.fg}, transparent)`,
        }}
      />

      {/* 1. Team badge — at the very top of the hierarchy */}
      <div
        style={{
          alignSelf: "flex-start",
          display: "inline-flex",
          alignItems: "center",
          gap: space[1],
          background: tokens.bg,
          border: `1px solid ${tokens.border}`,
          borderRadius: radius.pill,
          padding: `${space[1]} ${space[3]}`,
          fontSize: font.size.xs,
          fontWeight: font.weight.bold,
          color: tokens.fg,
          letterSpacing: font.letterSpacing.wide,
          textTransform: "uppercase",
          marginBottom: space[5],
        }}
      >
        {TEAM_LABELS[team]}
      </div>

      {/* 2. Icon + name */}
      <div style={{ display: "flex", alignItems: "center", gap: space[4], marginBottom: space[3] }}>
        <span style={{ fontSize: "48px" }}>{icon}</span>
        <div>
          <h2
            style={{
              fontSize: font.size["2xl"],
              fontWeight: font.weight.black,
              color: color.text.primary,
              letterSpacing: font.letterSpacing.tight,
              lineHeight: font.lineHeight.tight,
            }}
          >
            {role.replace(/([A-Z])/g, " $1").trim()}
          </h2>
          {/* 3. Tagline */}
          {roleDef?.shortDescription && (
            <p style={{ fontSize: font.size.sm, color: tokens.fg, marginTop: space[1] }}>
              {roleDef.shortDescription}
            </p>
          )}
        </div>
      </div>

      {/* 4. Description */}
      <p
        style={{
          fontSize: font.size.sm,
          lineHeight: font.lineHeight.relaxed,
          color: color.text.secondary,
          marginBottom: hasFooter ? space[4] : 0,
        }}
      >
        {description}
      </p>

      {/* 5. Lover footer */}
      {loverName && (
        <div
          style={{
            background: color.moonlight.bg,
            border: `1px solid ${color.moonlight.border}`,
            borderRadius: radius.md,
            padding: `${space[2]} ${space[3]}`,
            fontSize: font.size.sm,
            color: color.moonlight.base,
            marginTop: space[3],
          }}
        >
          💘 You are in love with <strong>{loverName}</strong>. If they die, you die.
        </div>
      )}

      {/* 5. Mason footer */}
      {masonIds.length > 0 && myId && (
        <div
          style={{
            background: color.team.villageBg,
            border: `1px solid ${color.team.villageBorder}`,
            borderRadius: radius.md,
            padding: `${space[2]} ${space[3]}`,
            fontSize: font.size.sm,
            color: color.team.village,
            marginTop: space[3],
          }}
        >
          🔨 Fellow Masons: {masonIds.filter((id) => id !== myId).length} allies
        </div>
      )}
    </motion.div>
  );
}
