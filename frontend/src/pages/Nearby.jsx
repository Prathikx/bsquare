import { useState, useEffect, useCallback } from "react";
import { usersAPI, connectionsAPI } from "../api";
import { useAuth } from "../AuthContext";
import toast from "react-hot-toast";

const initials = (name) => name?.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "??";

const Avatar = ({ name, size = 44 }) => (
  <div style={{ width: size, height: size, borderRadius: "50%", background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: size * 0.32, flexShrink: 0 }}>
    {initials(name)}
  </div>
);

export default function Nearby() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [radius, setRadius] = useState(10);
  const [industry, setIndustry] = useState("");
  const [pendingActions, setPendingActions] = useState(new Set());

  const fetchNearby = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await usersAPI.nearby({ radius, industry: industry || undefined });
      setUsers(data.users);
    } catch (err) {
      toast.error("Failed to load nearby businesses");
    } finally {
      setLoading(false);
    }
  }, [radius, industry]);

  useEffect(() => { fetchNearby(); }, [fetchNearby]);

  const sendRequest = async (u) => {
    setPendingActions(p => new Set([...p, u.id]));
    try {
      const { data } = await connectionsAPI.sendRequest(u.id);
      toast.success(data.message);
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, connection_status: data.status === "connected" ? "connected" : "request_sent" } : x));
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to send request");
    } finally {
      setPendingActions(p => { const n = new Set(p); n.delete(u.id); return n; });
    }
  };

  const StatusBadge = ({ status }) => {
    const map = {
      connected: { bg: "#dcfce7", color: "#15803d", label: "✓ Connected" },
      request_sent: { bg: "#fef3c7", color: "#92400e", label: "Request Sent" },
      request_received: { bg: "#dbeafe", color: "#1e40af", label: "Wants to Connect" },
    };
    const s = map[status];
    if (!s) return null;
    return <span style={{ ...s, fontSize: 12, fontWeight: 500, padding: "3px 10px", borderRadius: 20 }}>{s.label}</span>;
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.5px", color: "#1a202c", marginBottom: 4 }}>Nearby Businesses</h1>
        <p style={{ color: "#718096", fontSize: 14 }}>Verified businesses within {radius} km of {user?.city}</p>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
        <input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="Filter by industry..." onKeyDown={e => e.key === "Enter" && fetchNearby()}
          style={{ padding: "9px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 14, outline: "none", width: 220, background: "#fff" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, color: "#718096", whiteSpace: "nowrap" }}>Radius: {radius} km</span>
          <input type="range" min="1" max="50" step="1" value={radius} onChange={e => setRadius(Number(e.target.value))} style={{ width: 120 }} />
        </div>
        <button onClick={fetchNearby} style={{ padding: "9px 18px", background: "#1a1a2e", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, cursor: "pointer", fontWeight: 500 }}>Search</button>
      </div>

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ background: "#fff", border: "0.5px solid #e2e8f0", borderRadius: 16, padding: "1.25rem", height: 160, animation: "pulse 1.5s infinite" }}>
              <div style={{ background: "#f1f5f9", borderRadius: 8, height: 20, width: "60%", marginBottom: 8 }} />
              <div style={{ background: "#f1f5f9", borderRadius: 8, height: 14, width: "40%", marginBottom: 16 }} />
              <div style={{ background: "#f1f5f9", borderRadius: 8, height: 12, width: "80%" }} />
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <div style={{ background: "#fff", border: "0.5px solid #e2e8f0", borderRadius: 16, padding: "3rem", textAlign: "center" }}>
          <p style={{ fontSize: 40, marginBottom: 8 }}>🏙️</p>
          <p style={{ color: "#718096", fontSize: 15 }}>No businesses found within {radius} km.</p>
          <p style={{ color: "#a0aec0", fontSize: 13 }}>Try increasing the radius or removing filters.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {users.map(u => (
            <div key={u.id} style={{ background: "#fff", border: "0.5px solid #e2e8f0", borderRadius: 16, padding: "1.25rem", transition: "box-shadow 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"}
              onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
              <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                <Avatar name={u.name} size={44} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: 15, color: "#1a202c", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.name}</p>
                  <span style={{ background: "#f1f5f9", color: "#64748b", fontSize: 11, padding: "2px 8px", borderRadius: 20 }}>{u.industry || "Business"}</span>
                </div>
                {u.verification_status === 'approved' && <span title="Verified" style={{ fontSize: 16 }}>✅</span>}
              </div>
              <p style={{ fontSize: 13, color: "#718096", lineHeight: 1.5, marginBottom: 12, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {u.bio || "No bio provided."}
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#a0aec0" }}>📍 {u.distance_km?.toFixed(1)} km · {u.city}</span>
                {u.connection_status !== "none" ? (
                  <StatusBadge status={u.connection_status} />
                ) : (
                  <button disabled={pendingActions.has(u.id)} onClick={() => sendRequest(u)}
                    style={{ padding: "6px 14px", background: pendingActions.has(u.id) ? "#718096" : "#1a1a2e", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, cursor: pendingActions.has(u.id) ? "not-allowed" : "pointer", fontWeight: 500 }}>
                    {pendingActions.has(u.id) ? "Sending..." : "Connect"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
