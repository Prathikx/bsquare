import { useState, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./AuthContext";
import { authAPI } from "./api";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Nearby from "./pages/Nearby";
import Connections from "./pages/Connections";
import Requests from "./pages/Requests";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import ChatModal from "./components/ChatModal";

const initials = (name) => name?.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase()||"?";

function LocationTracker() {
  const { user } = useAuth();
  const watchRef = useRef(null);
  useEffect(() => {
    if (!user || !navigator.geolocation) return;
    watchRef.current = navigator.geolocation.watchPosition(
      pos => authAPI.updateLocation({ lat:pos.coords.latitude, lng:pos.coords.longitude }).catch(()=>{}),
      ()=>{},
      { enableHighAccuracy:true, maximumAge:30000, timeout:10000 }
    );
    return () => { if(watchRef.current!==null) navigator.geolocation.clearWatch(watchRef.current); };
  }, [user]);
  return null;
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", color:"#718096", fontFamily:"DM Sans,sans-serif" }}>Loading...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/" replace /> : children;
}

function AppLayout() {
  const { user, logout } = useAuth();
  const [chatTarget, setChatTarget] = useState(null);
  const navigate = useNavigate();

  const navStyle = ({ isActive }) => ({
    display:"flex", alignItems:"center", gap:6, padding:"6px 14px", borderRadius:8,
    textDecoration:"none", fontSize:14, fontWeight:isActive?500:400,
    background:isActive?"#f1f5f9":"transparent", color:isActive?"#1a202c":"#718096", transition:"background 0.15s",
  });

  return (
    <div style={{ minHeight:"100vh", background:"#f8fafc", fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      <nav style={{ background:"#fff", borderBottom:"0.5px solid #e2e8f0", padding:"0 1.5rem", display:"flex", alignItems:"center", justifyContent:"space-between", height:58, position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:34, height:34, background:"#1a1a2e", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:15, fontWeight:800 }}>B²</div>
          <span style={{ fontWeight:700, fontSize:18, letterSpacing:"-0.5px", color:"#1a202c" }}>B Square</span>
        </div>
        <div style={{ display:"flex", gap:2 }}>
          <NavLink to="/" style={navStyle} end>🏙️ Nearby</NavLink>
          <NavLink to="/connections" style={navStyle}>🤝 Connections</NavLink>
          <NavLink to="/requests" style={navStyle}>📬 Requests</NavLink>
          
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div onClick={()=>navigate("/profile")} style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", padding:"4px 8px", borderRadius:8 }}
            onMouseEnter={e=>e.currentTarget.style.background="#f1f5f9"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <div style={{ width:30, height:30, borderRadius:"50%", background:"#1a1a2e", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:11, fontWeight:700 }}>{initials(user?.name)}</div>
            <span style={{ fontSize:13, color:"#4a5568", fontWeight:500, maxWidth:140, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user?.name}</span>
          </div>
          <button onClick={logout} style={{ padding:"6px 14px", background:"transparent", color:"#718096", border:"1.5px solid #e2e8f0", borderRadius:8, fontSize:13, cursor:"pointer" }}>Sign out</button>
        </div>
      </nav>
      <main style={{ maxWidth:1000, margin:"0 auto", padding:"2rem 1rem" }}>
        <Routes>
          <Route path="/" element={<Nearby />} />
          <Route path="/connections" element={<Connections onOpenChat={setChatTarget} />} />
          <Route path="/requests" element={<Requests />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin-panel-bsquare" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {chatTarget && <ChatModal target={chatTarget} onClose={()=>setChatTarget(null)} />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ style:{ fontFamily:"'DM Sans',sans-serif", fontSize:14 } }} />
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/*" element={<ProtectedRoute><LocationTracker /><AppLayout /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
