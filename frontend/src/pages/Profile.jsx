import { useState } from "react";
import { useAuth } from "../AuthContext";
import { authAPI } from "../api";
import toast from "react-hot-toast";

const initials = (name) => name?.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [pwMode, setPwMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: user?.name || "", phone: user?.phone || "", bio: user?.bio || "", industry: user?.industry || "" });
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwErrors, setPwErrors] = useState({});
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const pf = (k) => (e) => setPwForm(p => ({ ...p, [k]: e.target.value }));

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { data } = await authAPI.updateProfile(form);
      updateUser(data.user);
      setEditMode(false);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err.response?.data?.error || "Update failed");
    } finally { setSaving(false); }
  };

  const changePassword = async () => {
    const e = {};
    if (!pwForm.currentPassword) e.currentPassword = "Required";
    if (!pwForm.newPassword || pwForm.newPassword.length < 8) e.newPassword = "Minimum 8 characters";
    if (pwForm.newPassword !== pwForm.confirmPassword) e.confirmPassword = "Passwords do not match";
    setPwErrors(e);
    if (Object.keys(e).length > 0) return;
    setSaving(true);
    try {
      await authAPI.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success("Password changed. Please log in again.");
      logout();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed");
    } finally { setSaving(false); }
  };

  const inp = (label, key, type = "text", placeholder = "") => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 13, color: "#4a5568", display: "block", marginBottom: 5, fontWeight: 500 }}>{label}</label>
      <input type={type} value={form[key]} onChange={f(key)} placeholder={placeholder}
        style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 14, background: "#fff", color: "#1a202c", boxSizing: "border-box", outline: "none" }} />
    </div>
  );

  return (
    <div style={{ maxWidth: 580 }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.5px", color: "#1a202c", marginBottom: 20 }}>My Profile</h1>

      <div style={{ background: "#fff", border: "0.5px solid #e2e8f0", borderRadius: 16, padding: "1.5rem", marginBottom: 16 }}>
        {/* Header */}
        <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 20 }}>
          <div style={{ width: 68, height: 68, borderRadius: "50%", background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 22 }}>
            {initials(user?.name)}
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a202c", marginBottom: 4 }}>{user?.name}</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={{ background: "#dcfce7", color: "#15803d", fontSize: 12, padding: "3px 10px", borderRadius: 20, fontWeight: 500 }}>✓ Verified</span>
              {user?.industry && <span style={{ background: "#f1f5f9", color: "#64748b", fontSize: 12, padding: "3px 10px", borderRadius: 20 }}>{user.industry}</span>}
            </div>
          </div>
        </div>

        {editMode ? (
          <div>
            {inp("Business Name", "name", "text", "Your business name")}
            {inp("Industry", "industry", "text", "e.g. IT Services")}
            {inp("Phone", "phone", "tel", "98xxxxxxxx")}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, color: "#4a5568", display: "block", marginBottom: 5, fontWeight: 500 }}>Bio</label>
              <textarea value={form.bio} onChange={f("bio")} rows={3} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 14, background: "#fff", color: "#1a202c", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={saveProfile} disabled={saving} style={{ padding: "9px 20px", background: "#1a1a2e", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, cursor: "pointer", fontWeight: 500 }}>{saving ? "Saving..." : "Save"}</button>
              <button onClick={() => setEditMode(false)} style={{ padding: "9px 20px", background: "transparent", color: "#64748b", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        ) : (
          <div>
            <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
              {[
                ["Email", user?.email],
                ["Phone", user?.phone || "—"],
                ["City", user?.city],
                ["Industry", user?.industry || "—"],
              ].map(([k, v]) => (
                <tr key={k} style={{ borderBottom: "0.5px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 0", color: "#718096", width: 110 }}>{k}</td>
                  <td style={{ padding: "10px 0", color: "#1a202c", fontWeight: 500 }}>{v}</td>
                </tr>
              ))}
            </table>
            {user?.bio && <p style={{ marginTop: 14, fontSize: 14, color: "#718096", lineHeight: 1.6 }}>{user.bio}</p>}
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button onClick={() => setEditMode(true)} style={{ padding: "9px 20px", background: "transparent", color: "#1a202c", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, cursor: "pointer", fontWeight: 500 }}>Edit Profile</button>
              <button onClick={() => setPwMode(!pwMode)} style={{ padding: "9px 20px", background: "transparent", color: "#64748b", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Change Password</button>
            </div>
          </div>
        )}
      </div>

      {/* Password change */}
      {pwMode && (
        <div style={{ background: "#fff", border: "0.5px solid #e2e8f0", borderRadius: 16, padding: "1.5rem", marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Change Password</h3>
          {[["currentPassword", "Current Password"], ["newPassword", "New Password (min 8 chars)"], ["confirmPassword", "Confirm New Password"]].map(([key, label]) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, color: "#4a5568", display: "block", marginBottom: 5, fontWeight: 500 }}>{label}</label>
              <input type="password" value={pwForm[key]} onChange={pf(key)} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${pwErrors[key] ? "#ef4444" : "#e2e8f0"}`, fontSize: 14, background: "#fff", boxSizing: "border-box", outline: "none" }} />
              {pwErrors[key] && <p style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>{pwErrors[key]}</p>}
            </div>
          ))}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={changePassword} disabled={saving} style={{ padding: "9px 20px", background: "#1a1a2e", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, cursor: "pointer", fontWeight: 500 }}>{saving ? "Saving..." : "Update Password"}</button>
            <button onClick={() => setPwMode(false)} style={{ padding: "9px 20px", background: "transparent", color: "#64748b", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Danger zone */}
      <div style={{ background: "#fff", border: "0.5px solid #fee2e2", borderRadius: 16, padding: "1.25rem" }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "#dc2626", marginBottom: 8 }}>Sign Out</h3>
        <button onClick={logout} style={{ padding: "9px 20px", background: "transparent", color: "#dc2626", border: "1.5px solid #fca5a5", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Sign out of B Square</button>
      </div>
    </div>
  );
}
