import { useState, useEffect } from "react";
import { connectionsAPI } from "../api";
import toast from "react-hot-toast";

const initials = (name) => name?.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";
const Avatar = ({ name, size = 44 }) => (
  <div style={{ width: size, height: size, borderRadius: "50%", background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: size * 0.32, flexShrink: 0 }}>
    {initials(name)}
  </div>
);

export default function Requests() {
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingActions, setPendingActions] = useState(new Set());

  useEffect(() => {
    Promise.all([connectionsAPI.receivedRequests(), connectionsAPI.sentRequests()])
      .then(([r, s]) => { setReceived(r.data.requests); setSent(s.data.requests); })
      .catch(() => toast.error("Failed to load requests"))
      .finally(() => setLoading(false));
  }, []);

  const act = (id) => setPendingActions(p => new Set([...p, id]));
  const done = (id) => setPendingActions(p => { const n = new Set(p); n.delete(id); return n; });

  const accept = async (req) => {
    act(req.request_id);
    try {
      await connectionsAPI.acceptRequest(req.request_id);
      toast.success(`Connected with ${req.name}!`);
      setReceived(p => p.filter(r => r.request_id !== req.request_id));
    } catch { toast.error("Failed to accept"); }
    finally { done(req.request_id); }
  };

  const decline = async (req) => {
    act(req.request_id);
    try {
      await connectionsAPI.declineRequest(req.request_id);
      toast.success("Request declined");
      setReceived(p => p.filter(r => r.request_id !== req.request_id));
    } catch { toast.error("Failed to decline"); }
    finally { done(req.request_id); }
  };

  const cancel = async (req) => {
    act(req.request_id);
    try {
      await connectionsAPI.cancelRequest(req.request_id);
      toast.success("Request cancelled");
      setSent(p => p.filter(r => r.request_id !== req.request_id));
    } catch { toast.error("Failed to cancel"); }
    finally { done(req.request_id); }
  };

  if (loading) return <div style={{ color: "#718096", padding: "2rem" }}>Loading requests...</div>;

  const RequestCard = ({ r, actions }) => (
    <div style={{ background: "#fff", border: "0.5px solid #e2e8f0", borderRadius: 16, padding: "1.25rem", display: "flex", alignItems: "center", gap: 14 }}>
      <Avatar name={r.name} size={44} />
      <div style={{ flex: 1 }}>
        <p style={{ fontWeight: 600, fontSize: 15, color: "#1a202c" }}>{r.name}</p>
        <p style={{ fontSize: 13, color: "#718096" }}>{r.industry || "Business"} · {r.city}</p>
        {r.bio && <p style={{ fontSize: 12, color: "#a0aec0", marginTop: 4, display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{r.bio}</p>}
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>{actions(r)}</div>
    </div>
  );

  return (
    <div>
      <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.5px", color: "#1a202c", marginBottom: 24 }}>Connection Requests</h1>

      {received.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "#1a202c", marginBottom: 12 }}>
            Received <span style={{ background: "#1a1a2e", color: "#fff", fontSize: 12, padding: "2px 8px", borderRadius: 20, marginLeft: 6 }}>{received.length}</span>
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {received.map(r => (
              <RequestCard key={r.request_id} r={r} actions={(r) => (
                <>
                  <button disabled={pendingActions.has(r.request_id)} onClick={() => accept(r)}
                    style={{ padding: "7px 16px", background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer", fontWeight: 500 }}>Accept</button>
                  <button disabled={pendingActions.has(r.request_id)} onClick={() => decline(r)}
                    style={{ padding: "7px 16px", background: "transparent", color: "#64748b", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Decline</button>
                </>
              )} />
            ))}
          </div>
        </div>
      )}

      {sent.length > 0 && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "#1a202c", marginBottom: 12 }}>Sent <span style={{ background: "#f1f5f9", color: "#64748b", fontSize: 12, padding: "2px 8px", borderRadius: 20, marginLeft: 6 }}>{sent.length}</span></h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sent.map(r => (
              <RequestCard key={r.request_id} r={r} actions={(r) => (
                <>
                  <span style={{ background: "#fef3c7", color: "#92400e", fontSize: 12, padding: "4px 10px", borderRadius: 20, fontWeight: 500 }}>Pending</span>
                  <button disabled={pendingActions.has(r.request_id)} onClick={() => cancel(r)}
                    style={{ padding: "7px 14px", background: "transparent", color: "#ef4444", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                </>
              )} />
            ))}
          </div>
        </div>
      )}

      {received.length === 0 && sent.length === 0 && (
        <div style={{ background: "#fff", border: "0.5px solid #e2e8f0", borderRadius: 16, padding: "3rem", textAlign: "center" }}>
          <p style={{ fontSize: 40, marginBottom: 8 }}>📬</p>
          <p style={{ color: "#718096" }}>No pending requests. Start connecting with nearby businesses!</p>
        </div>
      )}
    </div>
  );
}
