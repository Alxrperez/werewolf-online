import React, { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PublicPlayer } from "@werewolf/shared";
import { color, font, space, radius, layout } from "../design/tokens.js";

interface PlayerRingProps {
  players: PublicPlayer[];
  myPlayerId: string | null;
  onSelect?: (playerId: string) => void;
  selectedId?: string | null;
  highlightIds?: string[];
  showVotes?: boolean;
  voteTarget?: Record<string, string>;
  size?: "sm" | "md" | "lg";
  disabledIds?: string[];
}

export function PlayerRing({
  players,
  myPlayerId,
  onSelect,
  selectedId,
  highlightIds = [],
  showVotes = false,
  voteTarget = {},
  size = "md",
  disabledIds = [],
}: PlayerRingProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Geometry math — unchanged from the original implementation.
  const avatarSize = size === "sm" ? 44 : size === "lg" ? 72 : 56;
  const labelFontSize = size === "sm" ? font.size.xs : size === "lg" ? font.size.base : font.size.sm;
  const ringRadius = Math.max(120, players.length * 28);
  const centerX = ringRadius + avatarSize;
  const centerY = ringRadius + avatarSize;
  const svgSize = (ringRadius + avatarSize) * 2;

  // Scale the ring down when the parent is narrower than the ring's natural size.
  useEffect(() => {
    if (!wrapperRef.current) return;
    const parent = wrapperRef.current.parentElement;
    if (!parent) return;
    const obs = new ResizeObserver((entries) => {
      const availableWidth = entries[0]?.contentRect.width ?? svgSize;
      setScale(Math.min(1, availableWidth / svgSize));
    });
    obs.observe(parent);
    return () => obs.disconnect();
  }, [svgSize]);

  return (
    <div
      ref={wrapperRef}
      style={{
        position: "relative",
        width: svgSize,
        height: svgSize * scale,
        maxWidth: "100%",
        margin: "0 auto",
        transform: `scale(${scale})`,
        transformOrigin: "top center",
      }}
    >
      {players.map((player, i) => {
        const angle = (2 * Math.PI * i) / players.length - Math.PI / 2;
        const x = centerX + ringRadius * Math.cos(angle);
        const y = centerY + ringRadius * Math.sin(angle);
        const isMe = player.id === myPlayerId;
        const isSelected = player.id === selectedId;
        const isHighlighted = highlightIds.includes(player.id);
        const isDead = !player.isAlive;
        const isDisabled = disabledIds.includes(player.id) || isDead;
        const isInteractive = !isDisabled && Boolean(onSelect);

        const voteCount = showVotes
          ? Object.values(voteTarget).filter((t) => t === player.id).length
          : 0;

        return (
          <motion.div
            key={player.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: isDead ? 0.4 : 1 }}
            whileHover={isInteractive ? { scale: 1.1 } : {}}
            whileTap={isInteractive ? { scale: 0.95 } : {}}
            onClick={() => !isDisabled && onSelect?.(player.id)}
            style={{
              position: "absolute",
              left: x - avatarSize / 2,
              top: y - avatarSize / 2,
              width: avatarSize,
              height: avatarSize,
              minHeight: isInteractive ? layout.minTapTarget : undefined,
              cursor: isDisabled ? "default" : onSelect ? "pointer" : "default",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: space[1],
            }}
          >
            {/* Avatar circle — player.color stays (game data) */}
            <div
              style={{
                width: avatarSize,
                height: avatarSize,
                borderRadius: radius.pill,
                background: isDead ? color.border.subtle : player.color,
                border: isSelected
                  ? `3px solid ${color.accent.base}`
                  : isHighlighted
                  ? `3px solid ${player.color}`
                  : isMe
                  ? `3px solid ${color.text.primary}`
                  : `2px solid ${color.border.subtle}`,
                boxShadow: isSelected
                  ? `0 0 20px ${color.accent.glow}`
                  : isHighlighted
                  ? `0 0 12px ${player.color}60`
                  : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: avatarSize * 0.45,
                color: color.text.onAccent,
                fontWeight: font.weight.bold,
                transition: "all 0.2s",
                position: "relative",
              }}
            >
              {isDead ? "💀" : player.name.charAt(0).toUpperCase()}

              {/* Vote badge — accent = active/your-turn signal */}
              {voteCount > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -4,
                    background: color.accent.base,
                    color: color.text.onAccent,
                    borderRadius: radius.pill,
                    width: 20,
                    height: 20,
                    fontSize: font.size.xs,
                    fontWeight: font.weight.bold,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: `2px solid ${color.bg.app}`,
                  }}
                >
                  {voteCount}
                </div>
              )}

              {/* Connected indicator */}
              {!isDead && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 1,
                    right: 1,
                    width: 10,
                    height: 10,
                    borderRadius: radius.pill,
                    background: player.isConnected ? color.state.success : color.state.neutral,
                    border: `2px solid ${color.bg.app}`,
                  }}
                />
              )}

              {/* Role reveal on dead */}
              {isDead && player.role && (
                <div
                  style={{
                    position: "absolute",
                    bottom: -20,
                    fontSize: font.size.xs,
                    color: color.text.muted,
                    whiteSpace: "nowrap",
                    background: color.scrim.light,
                    padding: `1px ${space[1]}`,
                    borderRadius: radius.sm,
                  }}
                >
                  {player.role}
                </div>
              )}
            </div>

            {/* Name */}
            <span
              style={{
                fontSize: labelFontSize,
                color: isDead
                  ? color.text.muted
                  : isMe
                  ? color.text.primary
                  : color.text.secondary,
                fontWeight: isMe ? font.weight.bold : font.weight.regular,
                textAlign: "center",
                maxWidth: avatarSize + 20,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                marginTop: 2,
              }}
            >
              {player.name}
              {!player.hasVotingRights && " 🚫"}
            </span>

            {/* Ready dot (lobby) */}
            {player.isReady && (
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: radius.pill,
                  background: color.state.success,
                  marginTop: -2,
                }}
              />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
