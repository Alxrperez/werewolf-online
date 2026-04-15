import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DOMPurify from "dompurify";
import { ChatMessage } from "../stores/gameStore.js";

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  myPlayerId: string | null;
  title?: string;
  accentColor?: string;
}

export function ChatPanel({
  messages,
  onSend,
  disabled = false,
  placeholder = "Say something...",
  myPlayerId,
  title = "Chat",
  accentColor = "#4361EE",
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
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "16px",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          fontSize: "13px",
          fontWeight: 700,
          color: accentColor,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {title}
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          minHeight: 0,
        }}
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isMe = msg.playerId === myPlayerId;
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
                  <span style={{ fontSize: "11px", color: "#888", marginLeft: "4px", marginBottom: "2px", display: "block" }}>
                    {msg.playerName}
                  </span>
                )}
                <div
                  style={{
                    background: isMe
                      ? `${accentColor}30`
                      : msg.isWWChat
                      ? "rgba(230,57,70,0.15)"
                      : "rgba(255,255,255,0.06)",
                    border: `1px solid ${isMe ? `${accentColor}50` : msg.isWWChat ? "rgba(230,57,70,0.3)" : "rgba(255,255,255,0.08)"}`,
                    borderRadius: isMe ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                    padding: "8px 12px",
                    fontSize: "14px",
                    color: "#e8e8f0",
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
      <form onSubmit={handleSend} style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: "8px" }}>
        <label htmlFor="chat-message-input" style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0 }}>
          Chat message
        </label>
        <input
          id="chat-message-input"
          name="message"
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
            padding: "10px 12px",
            minHeight: "44px",
            color: "#e8e8f0",
            fontSize: "16px",  /* 16px prevents iOS zoom on focus */
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
        <button
          type="submit"
          disabled={disabled || !input.trim()}
          style={{
            background: accentColor,
            border: "none",
            borderRadius: "8px",
            padding: "10px 16px",
            minHeight: "44px",
            minWidth: "44px",
            color: "#fff",
            fontWeight: 700,
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled || !input.trim() ? 0.4 : 1,
            fontSize: "14px",
          }}
        >
          ↑
        </button>
      </form>
    </div>
  );
}
