import React, { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PublicPlayer } from "@werewolf/shared";

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

  const avatarSize = size === "sm" ? 44 : size === "lg" ? 72 : 56;
  const fontSize = size === "sm" ? 11 : size === "lg" ? 15 : 13;
  const ringRadius = Math.max(120, players.length * 28);
  const centerX = ringRadius + avatarSize;
  const centerY = ringRadius + avatarSize;
  const svgSize = (ringRadius + avatarSize) * 2;

  // Scale the ring down when the parent is narrower than the ring's natural size
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

        const voteCount = showVotes
          ? Object.values(voteTarget).filter((t) => t === player.id).length
          : 0;

        return (
          <motion.div
            key={player.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: isDead ? 0.4 : 1 }}
            whileHover={!isDisabled && onSelect ? { scale: 1.1 } : {}}
            whileTap={!isDisabled && onSelect ? { scale: 0.95 } : {}}
            onClick={() => !isDisabled && onSelect?.(player.id)}
            style={{
              position: "absolute",
              left: x - avatarSize / 2,
              top: y - avatarSize / 2,
              width: avatarSize,
              height: avatarSize,
              cursor: isDisabled ? "default" : onSelect ? "pointer" : "default",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
            }}
          >
            {/* Avatar circle */}
            <div
              style={{
                width: avatarSize,
                height: avatarSize,
                borderRadius: "50%",
                background: isDead ? "#333" : player.color,
                border: isSelected
                  ? "3px solid #fff"
                  : isHighlighted
                  ? `3px solid ${player.color}`
                  : isMe
                  ? "3px solid rgba(255,255,255,0.6)"
                  : "2px solid rgba(255,255,255,0.1)",
                boxShadow: isSelected
                  ? `0 0 20px ${player.color}80`
                  : isHighlighted
                  ? `0 0 12px ${player.color}60`
                  : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: avatarSize * 0.45,
                transition: "all 0.2s",
                position: "relative",
              }}
            >
              {isDead ? "💀" : player.name.charAt(0).toUpperCase()}

              {/* Vote badge */}
              {voteCount > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -4,
                    background: "#E63946",
                    color: "#fff",
                    borderRadius: "50%",
                    width: 20,
                    height: 20,
                    fontSize: 11,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "2px solid #0a0a0f",
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
                    borderRadius: "50%",
                    background: player.isConnected ? "#2A9D8F" : "#666",
                    border: "2px solid #0a0a0f",
                  }}
                />
              )}

              {/* Role reveal on dead */}
              {isDead && player.role && (
                <div
                  style={{
                    position: "absolute",
                    bottom: -20,
                    fontSize: 10,
                    color: "#aaa",
                    whiteSpace: "nowrap",
                    background: "rgba(0,0,0,0.7)",
                    padding: "1px 5px",
                    borderRadius: 4,
                  }}
                >
                  {player.role}
                </div>
              )}
            </div>

            {/* Name */}
            <span
              style={{
                fontSize,
                color: isDead ? "#555" : isMe ? "#fff" : "#ddd",
                fontWeight: isMe ? 700 : 400,
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
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#A7C957", marginTop: -2 }} />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
