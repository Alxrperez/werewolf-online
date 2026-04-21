import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PublicPlayer } from "@werewolf/shared";
import { color, font, space, radius, layout } from "../design/tokens.js";

interface VotePanelProps {
  alivePlayers: PublicPlayer[];
  myPlayerId: string | null;
  myVote: string | null;
  onVote: (targetId: string | "skip") => void;
  tally: Record<string, number>;
  disabled?: boolean;
  canSkip?: boolean;
}

export function VotePanel({
  alivePlayers,
  myPlayerId,
  myVote,
  onVote,
  tally,
  disabled = false,
  canSkip = true,
}: VotePanelProps) {
  const maxVotes = Math.max(1, ...Object.values(tally));

  return (
    <div
      style={{
        background: color.surface.card,
        border: `1px solid ${color.border.subtle}`,
        borderRadius: radius.xl,
        padding: space[5],
      }}
    >
      <h3
        style={{
          fontSize: font.size.sm,
          fontWeight: font.weight.bold,
          color: color.text.secondary,
          textTransform: "uppercase",
          letterSpacing: font.letterSpacing.wide,
          marginBottom: space[4],
        }}
      >
        Vote to Lynch
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: space[2] }}>
        <AnimatePresence>
          {alivePlayers
            .filter((p) => p.id !== myPlayerId)
            .map((player) => {
              const votes = tally[player.id] ?? 0;
              const pct = (votes / maxVotes) * 100;
              const isVoted = myVote === player.id;

              return (
                <motion.button
                  key={player.id}
                  layout
                  onClick={() => !disabled && onVote(player.id)}
                  disabled={disabled}
                  style={{
                    background: isVoted ? color.accent.bg : color.surface.input,
                    border: `1px solid ${isVoted ? color.accent.border : color.border.subtle}`,
                    borderRadius: radius.lg,
                    padding: `${space[3]} ${space[4]}`,
                    minHeight: layout.minTapTarget,
                    cursor: disabled ? "not-allowed" : "pointer",
                    textAlign: "left",
                    position: "relative",
                    overflow: "hidden",
                    transition: "all 0.2s",
                  }}
                >
                  {/* Animated vote token progress bar — player.color stays (game data) */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: `${player.color}15`,
                      width: `${pct}%`,
                      transition: "width 0.4s ease",
                      borderRadius: "inherit",
                    }}
                  />
                  <div
                    style={{
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: radius.pill,
                          background: player.color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: font.size.md,
                          fontWeight: font.weight.bold,
                          color: color.text.onAccent,
                          flexShrink: 0,
                        }}
                      >
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                      <span
                        style={{
                          fontSize: font.size.base,
                          fontWeight: isVoted ? font.weight.bold : font.weight.regular,
                          color: color.text.primary,
                        }}
                      >
                        {player.name}
                        {!player.hasVotingRights && (
                          <span
                            style={{
                              fontSize: font.size.xs,
                              color: color.text.muted,
                              marginLeft: space[1],
                            }}
                          >
                            no vote
                          </span>
                        )}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
                      {votes > 0 && (
                        <span
                          style={{
                            background: color.accent.base,
                            color: color.text.onAccent,
                            borderRadius: radius.lg,
                            padding: `2px ${space[2]}`,
                            fontSize: font.size.sm,
                            fontWeight: font.weight.bold,
                          }}
                        >
                          {votes}
                        </span>
                      )}
                      {isVoted && (
                        <span style={{ color: color.accent.base, fontSize: font.size.md }}>✓</span>
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}
        </AnimatePresence>

        {canSkip && (
          <button
            onClick={() => !disabled && onVote("skip")}
            disabled={disabled}
            style={{
              background: myVote === null ? color.surface.input : "transparent",
              border: `1px dashed ${color.border.default}`,
              borderRadius: radius.lg,
              padding: `${space[3]} ${space[4]}`,
              minHeight: layout.minTapTarget,
              cursor: disabled ? "not-allowed" : "pointer",
              color: color.text.muted,
              fontSize: font.size.sm,
              marginTop: space[1],
            }}
          >
            Skip (abstain)
          </button>
        )}
      </div>
    </div>
  );
}
