import React, { useState } from "react";
import { theme } from "../theme";

// PUBLIC_INTERFACE
export default function ProfileModal({ visible, profile, onSave, onClose }) {
  const [form, setForm] = useState(profile || { name: "", email: "", phone: "", age: "", payment_mode: "UPI", upi: "" });
  const [error, setError] = useState("");

  React.useEffect(() => {
    setForm(profile || { name: "", email: "", phone: "", age: "", payment_mode: "UPI", upi: "" });
    setError("");
  }, [profile, visible]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(old => ({ ...old, [name]: value }));
    setError("");
  }

  function validate() {
    if (!form.name || !form.phone || !form.age) return "Name, phone, and age required.";
    if (form.payment_mode === "UPI" && !form.upi) return "UPI ID required for UPI.";
    return "";
  }

  function handleSubmit(e) {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    onSave({...form, age: parseInt(form.age, 10)});
  }

  if (!visible) return null;
  return (
    <div style={{
      position: "fixed", top:0, left:0, right:0, bottom:0, background: "rgba(10,32,50,0.18)", zIndex: 100,
      display: "flex", justifyContent: "center", alignItems: "center"
    }}>
      <form onSubmit={handleSubmit} className="tatkal-form"
        style={{ minWidth: 320, maxWidth: 390, background: "#fff", border: `1.6px solid ${theme.primary}` }}>
        <div style={{ fontWeight: 600, fontSize: 18, color: theme.primary, marginBottom: 8 }}>
          {profile && profile.id ? "Edit Profile" : "New Profile"}
        </div>
        <div>
          <label className="tatkal-label">Name</label>
          <input className="tatkal-input" name="name" value={form.name} onChange={handleChange} required />
        </div>
        <div>
          <label className="tatkal-label">Phone</label>
          <input className="tatkal-input" name="phone" value={form.phone} onChange={handleChange} required />
        </div>
        <div>
          <label className="tatkal-label">Age</label>
          <input className="tatkal-input" name="age" value={form.age} onChange={handleChange} required type="number" min="1" />
        </div>
        <div>
          <label className="tatkal-label">Email</label>
          <input className="tatkal-input" name="email" value={form.email} onChange={handleChange} />
        </div>
        <div>
          <label className="tatkal-label">Payment Mode</label>
          <select className="tatkal-select" name="payment_mode" value={form.payment_mode} onChange={handleChange}>
            <option value="UPI">UPI</option>
            <option value="Card">Credit/Debit Card</option>
          </select>
        </div>
        {form.payment_mode === "UPI" && (
          <div>
            <label className="tatkal-label">UPI ID</label>
            <input className="tatkal-input" name="upi" value={form.upi} onChange={handleChange} />
          </div>
        )}
        {error && <div className="tatkal-error-bar">{error}</div>}
        <div className="tatkal-action-row">
          <button className="tatkal-btn tatkal-btn-accent" type="submit">Save</button>
          <button className="tatkal-btn tatkal-btn-outline" type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
