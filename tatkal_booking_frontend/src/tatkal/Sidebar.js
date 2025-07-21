import React from "react";
import { theme } from "../theme";

function initials(profile) {
  const parts = [profile.name || "", (profile.user_id || "") + ""];
  return parts.map(x => x.charAt(0).toUpperCase()).join('').slice(0, 2);
}

// PUBLIC_INTERFACE
export default function Sidebar({ profiles, selectedProfileId, onSelect, onEdit, onDelete, onNew }) {
  return (
    <aside className="tatkal-sidebar">
      <div className="tatkal-sidebar-title">Quick Profiles</div>
      <ul className="tatkal-profile-list">
        {profiles.map(profile =>
          <li
            className={`tatkal-profile-item${selectedProfileId === profile.id ? " selected" : ""}`}
            key={profile.id}
            onClick={() => onSelect(profile.id)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 34, height: 34, background: theme.primary, color: "#fff", borderRadius: "50%",
                fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18
              }}>
                {initials(profile)}
              </div>
              <div>
                <strong>{profile.name}</strong>
                <div style={{ fontSize: 13, color: theme.textLight }}>{profile.email || profile.phone}</div>
              </div>
            </div>
            <div className="tatkal-profile-quickaction">
              <button type="button" onClick={e => { e.stopPropagation(); onEdit(profile); }}>Edit</button>
              <button type="button" style={{ background: "#fff", color: theme.primary, border: `1px solid ${theme.primary}` }}
                onClick={e => { e.stopPropagation(); onDelete(profile); }}>Delete</button>
            </div>
          </li>
        )}
      </ul>
      <div style={{ textAlign: "center", marginTop: "35px" }}>
        <button className="tatkal-btn tatkal-btn-accent" onClick={onNew}>+ New Profile</button>
      </div>
    </aside>
  );
}
