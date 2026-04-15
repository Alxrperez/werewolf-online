import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PublicPlayer } from "@werewolf/shared";

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
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "16px",
        padding: "20px",
      }}
    >
      <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "16px" }}>
        Vote to Lynch
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
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
                    background: isVoted ? `${player.color}20` : "rgba(255,255,255,0.04)",
                    border: `1px solid ${isVoted ? player.color : "rgba(255,255,255,0.1)"}`,
                    borderRadius: "12px",
                    padding: "13px 16px",
                    minHeight: "44px",
                    cursor: disabled ? "not-allowed" : "pointer",
                    textAlign: "left",
                    position: "relative",
                    overflow: "hidden",
                    transition: "all 0.2s",
                  }}
                >
                  {/* Vote progress bar */}
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
                  <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: player.color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "16px",
                          fontWeight: 700,
                          color: "#fff",
                          flexShrink: 0,
                        }}
                      >
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontSize: "15px", fontWeight: isVoted ? 700 : 400, color: "#e8e8f0" }}>
                        {player.name}
                        {!player.hasVotingRights && (
                          <span style={{ fontSize: "12px", color: "#888", marginLeft: "6px" }}>no vote</span>
                        )}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {votes > 0 && (
                        <span
                          style={{
                            background: "#E63946",
                            color: "#fff",
                            borderRadius: "12px",
                            padding: "2px 10px",
                            fontSize: "13px",
                            fontWeight: 700,
                          }}
                        >
                          {votes}
                        </span>
                      )}
                      {isVoted && <span style={{ color: player.color, fontSize: "16px" }}>✓</span>}
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
              background: myVote === null ? "rgba(255,255,255,0.08)" : "transparent",
              border: "1px dashed rgba(255,255,255,0.2)",
              borderRadius: "12px",
              padding: "13px 16px",
              minHeight: "44px",
              cursor: disabled ? "not-allowed" : "pointer",
              color: "#888",
              fontSize: "14px",
              marginTop: "4px",
            }}
          >
            Skip (abstain)
          </button>
        )}
      </div>
    </div>
  );
}
