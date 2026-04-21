import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DOMPurify from "dompurify";
import { ChatMessage } from "../stores/gameStore.js";
import { color, font, space, radius, layout } from "../design/tokens.js";

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  myPlayerId: string | null;
  title?: string;
  /** Title/header accent. Defaults to moonlight (calm informational). */
  accentColor?: string;
}

export function ChatPanel({
  messages,
  onSend,
  disabled = false,
  placeholder = "Say something...",
  myPlayerId,
  title = "Chat",
  accentColor = color.moonlight.base,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const msg = input.trim();
    if (!msg || disabled) return;
    onSend(msg);
    setInput("");
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: color.surface.card,
        border: `1px solid ${color.border.subtle}`,
        borderRadius: radius.xl,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: `${space[3]} ${space[4]}`,
          borderBottom: `1px solid ${color.border.subtle}`,
          fontSize: font.size.sm,
          fontWeight: font.weight.bold,
          color: accentColor,
          textTransform: "uppercase",
          letterSpacing: font.letterSpacing.wide,
        }}
      >
        {title}
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: space[3],
          display: "flex",
          flexDirection: "column",
          gap: space[2],
          minHeight: 0,
        }}
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isMe = msg.playerId === myPlayerId;

            // Bubble styling — crimson is sacred, so own-messages use a subtle
            // elevated surface rather than the accent tint. WW chat keeps its
            // distinctive danger tint because that context IS the threat.
            const bubbleBg = msg.isWWChat
              ? color.accent.bg
              : isMe
              ? color.surface.raised
              : color.surface.input;
            const bubbleBorder = msg.isWWChat
              ? color.accent.border
              : isMe
              ? color.border.default
              : color.border.subtle;

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  alignSelf: isMe ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                }}
              >
                {!isMe && (
                  <span
                    style={{
                      fontSize: font.size.xs,
                      color: color.text.muted,
                      marginLeft: space[1],
                      marginBottom: 2,
                      display: "block",
                    }}
                  >
                    {msg.playerName}
                  </span>
                )}
                <div
                  style={{
                    background: bubbleBg,
                    border: `1px solid ${bubbleBorder}`,
                    borderRadius: isMe
                      ? `${radius.lg} ${radius.lg} ${radius.sm} ${radius.lg}`
                      : `${radius.lg} ${radius.lg} ${radius.lg} ${radius.sm}`,
                    padding: `${space[2]} ${space[3]}`,
                    fontSize: font.size.sm,
                    color: color.text.primary,
                    wordBreak: "break-word",
                  }}
                >
                  {/* Use textContent only — never innerHTML */}
                  {DOMPurify.sanitize(msg.message, { ALLOWED_TAGS: [] })}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        style={{
          padding: `${space[2]} ${space[3]}`,
          borderTop: `1px solid ${color.border.subtle}`,
          display: "flex",
          gap: space[2],
        }}
      >
        <label
          htmlFor="chat-message-input"
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: "hidden",
            clip: "rect(0,0,0,0)",
            whiteSpace: "nowrap",
            border: 0,
          }}
        >
          Chat message
        </label>
        <input
          id="chat-message-input"
          name="message"
          style={{
            flex: 1,
            background: color.surface.input,
            border: `1px solid ${color.border.subtle}`,
            borderRadius: radius.md,
            padding: `${space[2]} ${space[3]}`,
            minHeight: layout.minTapTarget,
            color: color.text.primary,
            fontSize: font.size.md, // 16px prevents iOS zoom on focus
            outline: "none",
          }}
          type="text"
          placeholder={disabled ? "You cannot chat now" : placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={disabled}
          maxLength={300}
          autoComplete="off"
        />
        {/* Send button uses the crimson accent — it IS the primary action in the chat row. */}
        <button
          type="submit"
          disabled={disabled || !input.trim()}
          style={{
            background: color.accent.base,
            border: "none",
            borderRadius: radius.md,
            padding: `${space[2]} ${space[4]}`,
            minHeight: layout.minTapTarget,
            minWidth: layout.minTapTarget,
            color: color.text.onAccent,
            fontWeight: font.weight.bold,
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled || !input.trim() ? 0.4 : 1,
            fontSize: font.size.sm,
          }}
        >
          ↑
        </button>
      </form>
    </div>
  );
}
