import { useState, useEffect, useRef, useCallback } from "react";
import { messagesAPI } from "../api";
import { useAuth } from "../AuthContext";
import toast from "react-hot-toast";

const initials = (name) => name?.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";

export default function ChatModal({ target, onClose }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);

  const fetchMessages = useCallback(async (silent=false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await messagesAPI.getConversation(target.id);
      setMessages(data.messages);
    } catch {
      if (!silent) toast.error("Failed to load messages");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    // Poll for new messages every 5 seconds
    pollRef.current = setInterval(() => fetchMessages(true), 5000);
    return () => clearInterval(pollRef.current);
  }, [target.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    const optimistic = { id: "tmp-" + Date.now(), sender_id: user.id, receiver_id: target.id, content: input.trim(), created_at: new Date().toISOString() };
    setMessages(p => [...p, optimistic]);
    const text = input.trim();
    setInput("");
    try {
      await messagesAPI.send(target.id, text);
      fetchMessages(true);
    } catch {
      setMessages(p => p.filter(m => m.id !== optimistic.id));
      setInput(text);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const formatTime = (ts) => new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const formatDate = (ts) => {
    const d = new Date(ts);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Today";
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  // Group messages by date
  const grouped = messages.reduce((acc, m) => {
    const date = formatDate(m.created_at);
    if (!acc[date]) acc[date] = [];
    acc[date].push(m);
    return acc;
  }, {});

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "flex-end", justifyContent: "flex-end", padding: "1rem", zIndex: 1000 }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: 400, maxHeight: "75vh", background: "#fff", borderRadius: 16, border: "0.5px solid #e2e8f0", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        {/* Header */}
        <div style={{ padding: "14px 16px", borderBottom: "0.5px solid #f1f5f9", display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13 }}>
            {initials(target.name)}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 600, fontSize: 15, color: "#1a202c" }}>{target.name}</p>
            <p style={{ fontSize: 12, color: "#718096" }}>{target.industry}</p>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 22, color: "#a0aec0", lineHeight: 1 }}>×</button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          {loading ? (
            <p style={{ textAlign: "center", color: "#a0aec0", fontSize: 13 }}>Loading...</p>
          ) : messages.length === 0 ? (
            <p style={{ textAlign: "center", color: "#a0aec0", fontSize: 13, marginTop: 60 }}>Start a conversation with {target.name}</p>
          ) : (
            Object.entries(grouped).map(([date, msgs]) => (
              <div key={date}>
                <div style={{ textAlign: "center", margin: "12px 0" }}>
                  <span style={{ background: "#f1f5f9", color: "#718096", fontSize: 11, padding: "3px 10px", borderRadius: 20 }}>{date}</span>
                </div>
                {msgs.map(m => {
                  const isMe = m.sender_id === user.id;
                  return (
                    <div key={m.id} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", marginBottom: 8 }}>
                      <div style={{ maxWidth: "76%", padding: "9px 13px", borderRadius: isMe ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: isMe ? "#1a1a2e" : "#f1f5f9", color: isMe ? "#fff" : "#1a202c", fontSize: 14, lineHeight: 1.5 }}>
                        <p style={{ margin: 0 }}>{m.content}</p>
                        <p style={{ fontSize: 10, color: isMe ? "rgba(255,255,255,0.6)" : "#a0aec0", marginTop: 4, textAlign: "right" }}>{formatTime(m.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: "12px 16px", borderTop: "0.5px solid #f1f5f9", display: "flex", gap: 8 }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Type a message..." style={{ flex: 1, padding: "9px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 14, outline: "none", background: "#fff", color: "#1a202c" }} />
          <button onClick={send} disabled={!input.trim() || sending} style={{ padding: "9px 16px", background: !input.trim() ? "#e2e8f0" : "#1a1a2e", color: !input.trim() ? "#a0aec0" : "#fff", border: "none", borderRadius: 10, fontSize: 14, cursor: input.trim() ? "pointer" : "not-allowed", fontWeight: 500 }}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
