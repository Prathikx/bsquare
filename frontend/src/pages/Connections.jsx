import { useState, useEffect } from "react";
import { connectionsAPI } from "../api";
import toast from "react-hot-toast";

const initials = (name) => name?.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";
const Avatar = ({ name, size = 44 }) => (
  <div style={{ width: size, height: size, borderRadius: "50%", background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: size * 0.32, flexShrink: 0 }}>
    {initials(name)}
  </div>
);

export default function Connections({ onOpenChat }) {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(null);

  useEffect(() => {
    connectionsAPI.list()
      .then(({ data }) => setConnections(data.connections))
      .catch(() => toast.error("Failed to load connections"))
      .finally(() => setLoading(false));
  }, []);

  const remove = async (userId, name) => {
    if (!window.confirm(`Remove ${name} from your connections?`)) return;
    setRemoving(userId);
    try {
      await connectionsAPI.remove(userId);
      setConnections(p => p.filter(c => c.id !== userId));
      toast.success("Connection removed");
    } catch {
      toast.error("Failed to remove connection");
    } finally {
      setRemoving(null);
    }
  };

  if (loading) return <div style={{ color: "#718096", padding: "2rem" }}>Loading connections...</div>;

  return (
    <div>
      <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.5px", color: "#1a202c", marginBottom: 4 }}>Your Connections</h1>
      <p style={{ color: "#718096", fontSize: 14, marginBottom: 24 }}>{connections.length} verified business connection{connections.length !== 1 ? "s" : ""}</p>

      {connections.length === 0 ? (
        <div style={{ background: "#fff", border: "0.5px solid #e2e8f0", borderRadius: 16, padding: "3rem", textAlign: "center" }}>
          <p style={{ fontSize: 40, marginBottom: 8 }}>🤝</p>
          <p style={{ color: "#718096" }}>No connections yet. Find businesses nearby and send requests!</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {connections.map(c => (
            <div key={c.id} style={{ background: "#fff", border: "0.5px solid #e2e8f0", borderRadius: 16, padding: "1.25rem", display: "flex", alignItems: "center", gap: 16 }}>
              <Avatar name={c.name} size={52} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, fontSize: 16, color: "#1a202c", marginBottom: 2 }}>{c.name}</p>
                <span style={{ background: "#f1f5f9", color: "#64748b", fontSize: 12, padding: "2px 8px", borderRadius: 20 }}>{c.industry || "Business"}</span>
                <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, color: "#718096" }}>📧 {c.email}</span>
                  {c.phone && <span style={{ fontSize: 13, color: "#718096" }}>📱 {c.phone}</span>}
                  <span style={{ fontSize: 13, color: "#718096" }}>📍 {c.city}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button onClick={() => onOpenChat(c)} style={{ padding: "8px 16px", background: "#1a1a2e", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer", fontWeight: 500 }}>Message</button>
                <button onClick={() => remove(c.id, c.name)} disabled={removing === c.id}
                  style={{ padding: "8px 16px", background: "transparent", color: "#ef4444", border: "1.5px solid #fca5a5", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>
                  {removing === c.id ? "..." : "Remove"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
