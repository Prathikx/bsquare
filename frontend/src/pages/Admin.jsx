import { useState, useEffect } from "react";
import { adminAPI } from "../api";
import { useAuth } from "../AuthContext";
import toast from "react-hot-toast";

const initials = (name) => name?.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase()||"?";

const BADGE = {
  din: { bg:"#dcfce7", color:"#15803d", label:"DIN" },
  linkedin: { bg:"#dbeafe", color:"#1e40af", label:"LinkedIn" },
  succession: { bg:"#fef3c7", color:"#92400e", label:"Succession" },
  admin: { bg:"#f1f5f9", color:"#64748b", label:"Admin" },
};

export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState("pending");
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, p, a] = await Promise.all([adminAPI.stats(), adminAPI.pending(), adminAPI.users()]);
      setStats(s.data);
      setPending(p.data.users);
      setAllUsers(a.data.users);
    } catch { toast.error("Failed to load admin data"); }
    finally { setLoading(false); }
  };

  const approve = async (userId, name) => {
    setActionLoading(userId);
    try {
      await adminAPI.approve(userId);
      toast.success(`${name} approved!`);
      setPending(p => p.filter(u => u.id !== userId));
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || "Failed"); }
    finally { setActionLoading(null); }
  };

  const reject = async () => {
    if (!rejectReason.trim()) { toast.error("Please provide a reason"); return; }
    setActionLoading(rejectModal.id);
    try {
      await adminAPI.reject(rejectModal.id, rejectReason);
      toast.success(`${rejectModal.name} rejected`);
      setPending(p => p.filter(u => u.id !== rejectModal.id));
      setRejectModal(null); setRejectReason("");
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || "Failed"); }
    finally { setActionLoading(null); }
  };

  if (!user?.is_admin) return (
    <div style={{ textAlign:"center", padding:"3rem" }}>
      <p style={{ fontSize:40, marginBottom:8 }}>🔒</p>
      <p style={{ color:"#718096" }}>Admin access required.</p>
    </div>
  );

  const tabBtn = (key, label) => (
    <button key={key} onClick={() => setTab(key)}
      style={{ padding:"7px 16px", borderRadius:8, border:"0.5px solid #e2e8f0", background:tab===key?"#1a1a2e":"transparent", color:tab===key?"#fff":"#718096", fontSize:13, cursor:"pointer", fontWeight:tab===key?500:400 }}>
      {label}
    </button>
  );

  const VerifBadge = ({ type }) => {
    const b = BADGE[type] || BADGE.din;
    return <span style={{ background:b.bg, color:b.color, fontSize:11, padding:"2px 9px", borderRadius:20, fontWeight:500 }}>{b.label}</span>;
  };

  const UserRow = ({ u, showActions=false }) => (
    <div style={{ background:"#fff", border:"0.5px solid #e2e8f0", borderRadius:12, padding:"14px 16px", marginBottom:10 }}>
      <div style={{ display:"flex", alignItems:"flex-start", gap:12, flexWrap:"wrap" }}>
        <div style={{ width:40, height:40, borderRadius:"50%", background:"#1a1a2e", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:14, flexShrink:0 }}>
          {initials(u.name)}
        </div>
        <div style={{ flex:1, minWidth:200 }}>
          <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:3, flexWrap:"wrap" }}>
            <span style={{ fontWeight:600, fontSize:15, color:"#1a202c" }}>{u.name}</span>
            <VerifBadge type={u.verification_type} />
          </div>
          <p style={{ fontSize:13, color:"#718096", margin:"0 0 4px" }}>{u.email} · {u.industry||"—"} · {u.city}</p>

          {u.verification_type==="din" && (
            <div style={{ fontSize:12, color:"#4a5568", background:"#f8fafc", borderRadius:7, padding:"6px 10px", marginTop:6 }}>
              <span style={{ fontWeight:500 }}>DIN:</span> {u.din_number} &nbsp;·&nbsp;
              <span style={{ fontWeight:500 }}>Director Name:</span> {u.din_director_name}
              <a href={`https://www.mca.gov.in/mcafoportal/viewDirectorMasterData.do`} target="_blank" rel="noreferrer"
                style={{ marginLeft:10, color:"#1e40af", fontSize:11, borderBottom:"1px solid #bfdbfe" }}>
                Verify on MCA ↗
              </a>
            </div>
          )}

          {u.verification_type==="succession" && (
            <div style={{ fontSize:12, color:"#4a5568", background:"#fffbeb", borderRadius:7, padding:"6px 10px", marginTop:6 }}>
              <span style={{ fontWeight:500 }}>Prev DIN:</span> {u.succession_prev_din||"Not provided"} &nbsp;·&nbsp;
              <span style={{ fontWeight:500 }}>New DIN:</span> {u.succession_new_din||"Not yet obtained"}
              {u.succession_doc_url && <><br/><span style={{ fontWeight:500 }}>Document note:</span> {u.succession_doc_url}</>}
            </div>
          )}

          {u.verification_type==="linkedin" && u.linkedin_url && (
            <div style={{ fontSize:12, color:"#4a5568", background:"#eff6ff", borderRadius:7, padding:"6px 10px", marginTop:6 }}>
              <a href={u.linkedin_url} target="_blank" rel="noreferrer" style={{ color:"#1e40af" }}>{u.linkedin_url} ↗</a>
            </div>
          )}

          <p style={{ fontSize:11, color:"#a0aec0", marginTop:5 }}>Submitted {new Date(u.created_at).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })}</p>
        </div>

        {showActions && (
          <div style={{ display:"flex", gap:6, flexShrink:0, alignItems:"flex-start" }}>
            <button onClick={() => approve(u.id, u.name)} disabled={actionLoading===u.id}
              style={{ padding:"7px 16px", background:"#16a34a", color:"#fff", border:"none", borderRadius:8, fontSize:13, cursor:"pointer", fontWeight:500 }}>
              {actionLoading===u.id?"...":"Approve"}
            </button>
            <button onClick={() => { setRejectModal(u); setRejectReason(""); }}
              style={{ padding:"7px 14px", background:"transparent", color:"#dc2626", border:"0.5px solid #fca5a5", borderRadius:8, fontSize:13, cursor:"pointer" }}>
              Reject
            </button>
          </div>
        )}

        {!showActions && (
          <span style={{ fontSize:12, padding:"3px 10px", borderRadius:20, fontWeight:500,
            background: u.verification_status==="approved"?"#dcfce7":u.verification_status==="rejected"?"#fee2e2":"#fef3c7",
            color: u.verification_status==="approved"?"#15803d":u.verification_status==="rejected"?"#dc2626":"#92400e" }}>
            {u.verification_status}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div>
      <h1 style={{ fontSize:24, fontWeight:700, color:"#1a202c", marginBottom:4 }}>Admin Panel</h1>
      <p style={{ color:"#718096", fontSize:14, marginBottom:20 }}>Review and approve member verification requests</p>

      {stats && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:10, marginBottom:24 }}>
          {[["Pending",stats.pending,"#fef3c7","#92400e"],["Approved Today",stats.approved_today,"#dcfce7","#15803d"],["Total Approved",stats.approved,"#dbeafe","#1e40af"],["Rejected",stats.rejected,"#fee2e2","#dc2626"],["Total Users",stats.total_users,"#f1f5f9","#64748b"]].map(([label,val,bg,color])=>(
            <div key={label} style={{ background:bg, borderRadius:10, padding:"12px 14px" }}>
              <p style={{ fontSize:12, color, marginBottom:4, fontWeight:500 }}>{label}</p>
              <p style={{ fontSize:22, fontWeight:700, color, margin:0 }}>{val}</p>
            </div>
          ))}
        </div>
      )}

      <div style={{ display:"flex", gap:8, marginBottom:20 }}>
        {tabBtn("pending", `Pending (${pending.length})`)}
        {tabBtn("all", "All Users")}
      </div>

      {loading ? <p style={{ color:"#718096" }}>Loading...</p> : (
        <>
          {tab==="pending" && (
            pending.length===0
              ? <div style={{ background:"#fff", border:"0.5px solid #e2e8f0", borderRadius:14, padding:"3rem", textAlign:"center" }}>
                  <p style={{ fontSize:32, marginBottom:8 }}>✅</p>
                  <p style={{ color:"#718096" }}>No pending verifications. You're all caught up!</p>
                </div>
              : pending.map(u => <UserRow key={u.id} u={u} showActions />)
          )}
          {tab==="all" && allUsers.map(u => <UserRow key={u.id} u={u} />)}
        </>
      )}

      {rejectModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 }}
          onClick={e => { if(e.target===e.currentTarget){setRejectModal(null);setRejectReason("");} }}>
          <div style={{ background:"#fff", borderRadius:16, padding:"1.5rem", width:"100%", maxWidth:420, margin:"1rem" }}>
            <h3 style={{ fontSize:16, fontWeight:600, color:"#1a202c", marginBottom:8 }}>Reject {rejectModal.name}</h3>
            <p style={{ fontSize:13, color:"#718096", marginBottom:14 }}>Please provide a reason. This will be shown to the user.</p>
            <textarea value={rejectReason} onChange={e=>setRejectReason(e.target.value)} rows={3}
              placeholder="e.g. DIN not found on MCA portal / LinkedIn profile does not show business activity..."
              style={{ width:"100%", padding:"10px 13px", borderRadius:10, border:"1.5px solid #e2e8f0", fontSize:14, boxSizing:"border-box", resize:"vertical", fontFamily:"inherit", outline:"none" }}/>
            <div style={{ display:"flex", gap:8, marginTop:14 }}>
              <button onClick={reject} disabled={actionLoading===rejectModal.id}
                style={{ flex:1, padding:"10px", background:"#dc2626", color:"#fff", border:"none", borderRadius:10, fontSize:14, cursor:"pointer", fontWeight:500 }}>
                {actionLoading===rejectModal.id?"Rejecting...":"Confirm Reject"}
              </button>
              <button onClick={()=>{setRejectModal(null);setRejectReason("");}}
                style={{ padding:"10px 18px", background:"transparent", color:"#64748b", border:"1.5px solid #e2e8f0", borderRadius:10, fontSize:14, cursor:"pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
