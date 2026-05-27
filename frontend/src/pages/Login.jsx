import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";
import toast from "react-hot-toast";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const f = (k) => (e) => {
    setForm((p) => ({ ...p, [k]: e.target.value }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email";
    if (!form.password) e.password = "Password is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await login(form.email.trim().toLowerCase(), form.password);
      toast.success("Welcome back!");
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.error || "Login failed";
      if (msg.toLowerCase().includes("email") || msg.toLowerCase().includes("password")) {
        setErrors({ password: "Invalid email or password" });
      } else if (err.response?.data?.gstStatus === "pending") {
        toast.error("Your account is pending GST verification. Contact support.");
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (key) => ({
    width: "100%", padding: "11px 14px", borderRadius: 10, fontSize: 14, boxSizing: "border-box",
    border: `1.5px solid ${errors[key] ? "#ef4444" : "#e2e8f0"}`,
    outline: "none", background: "#fff", color: "#1a202c", transition: "border-color 0.2s",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1rem" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, background: "#1a1a2e", borderRadius: 14, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 22, fontWeight: 800, marginBottom: 12 }}>B²</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1a202c", letterSpacing: "-0.5px", margin: 0 }}>Sign in to B Square</h1>
          <p style={{ color: "#718096", fontSize: 14, marginTop: 6 }}>Connect with verified businesses near you</p>
        </div>

        <div style={{ background: "#fff", borderRadius: 16, padding: "2rem", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", border: "0.5px solid #e2e8f0" }}>
          <form onSubmit={submit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: "#4a5568", display: "block", marginBottom: 6, fontWeight: 500 }}>Email Address</label>
              <input type="email" value={form.email} onChange={f("email")} placeholder="info@yourbusiness.in" style={inputStyle("email")}
                onFocus={e => { if (!errors.email) e.target.style.borderColor = "#1a1a2e"; }}
                onBlur={e => { if (!errors.email) e.target.style.borderColor = "#e2e8f0"; }} />
              {errors.email && <p style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>{errors.email}</p>}
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label style={{ fontSize: 13, color: "#4a5568", fontWeight: 500 }}>Password</label>
              </div>
              <div style={{ position: "relative" }}>
                <input type={showPw ? "text" : "password"} value={form.password} onChange={f("password")} placeholder="Enter your password" style={{ ...inputStyle("password"), paddingRight: 44 }}
                  onFocus={e => { if (!errors.password) e.target.style.borderColor = "#1a1a2e"; }}
                  onBlur={e => { if (!errors.password) e.target.style.borderColor = "#e2e8f0"; }} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", color: "#718096", fontSize: 13 }}>
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
              {errors.password && <p style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>{errors.password}</p>}
            </div>

            <button type="submit" disabled={loading} style={{ width: "100%", padding: "12px", background: loading ? "#718096" : "#1a1a2e", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer" }}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", fontSize: 14, color: "#718096", marginTop: 16 }}>
          Don't have an account?{" "}
          <Link to="/register" style={{ color: "#1a1a2e", fontWeight: 600, textDecoration: "none" }}>Create one</Link>
        </p>
      </div>
    </div>
  );
}
