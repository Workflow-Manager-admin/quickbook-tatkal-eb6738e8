import React, { useState, useEffect } from "react";
import "./App.css";

// Backend API base URL (adjust if proxying in development)
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:3001/api";

// Color theme for inline styles if needed
const COLORS = {
  primary: "#1565c0",
  secondary: "#ffffff",
  accent: "#ffab00",
  error: "#d32f2f",
  success: "#388e3c"
};

// Utility for API requests (handles simple GET/POST)
async function apiFetch(endpoint, { method = "GET", body, headers = {} } = {}) {
  let opts = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers
    }
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}${endpoint}`, opts);
  const contentType = res.headers.get("content-type");
  if (!res.ok) throw new Error(await res.text());
  if (contentType && contentType.indexOf("application/json") !== -1) {
    return await res.json();
  }
  return await res.text();
}

/** PUBLIC_INTERFACE
 * Main Tatkal Booking SPA
 */
function App() {
  // Theme mode
  const [theme, setTheme] = useState("light");
  // Sidebar: saved user profiles
  const [profiles, setProfiles] = useState([]);
  // Currently selected profile
  const [selectedProfile, setSelectedProfile] = useState(null);
  // Booking form state
  const [form, setForm] = useState({
    user_profile_id: "",
    train_no: "",
    journey_date: "",
    from_station: "",
    to_station: "",
    passenger_name: "",
    passenger_age: "",
    passenger_sex: ""
  });
  // UI loading & error states
  const [loading, setLoading] = useState(false);
  const [bookingStatus, setBookingStatus] = useState(null);
  const [bookingId, setBookingId] = useState(null);
  const [error, setError] = useState(null);
  // Payment
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [paymentLink, setPaymentLink] = useState(null);

  // Theme effect
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Fetch saved profiles on mount
  useEffect(() => {
    fetchProfiles();
  }, []);

  async function fetchProfiles() {
    try {
      setError(null);
      const result = await apiFetch("/user_profiles/");
      setProfiles(Array.isArray(result) ? result : []);
    } catch (err) {
      setError("Failed to load profiles.");
      setProfiles([]);
    }
  }

  // When user selects a profile: auto-fill booking form fields
  async function handleProfileSelect(profile) {
    setSelectedProfile(profile);
    setForm((prev) => ({
      ...prev,
      user_profile_id: profile.id,
      passenger_name: profile.full_name || "",
      passenger_age: profile.age || "",
      passenger_sex: profile.gender || "",
    }));
    // Optionally, fetch auto-fill details from backend
    try {
      const autofill = await apiFetch(`/auto_fill/${profile.id}/`);
      setForm((prev) => ({
        ...prev,
        ...autofill
      }));
    } catch (err) {
      /* ignore autofill error */
    }
  }

  // Handle booking form input changes
  function onFormChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // PUBLIC_INTERFACE
  // Booking form submit
  async function submitBooking(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setBookingStatus("initiating");
    setPaymentStatus(null);
    setPaymentLink(null);
    try {
      const bookingRes = await apiFetch("/bookings/", {
        method: "POST",
        body: {
          ...form
        }
      });
      const id = bookingRes.id || bookingRes.booking_id; // depends on backend
      setBookingId(id);
      setBookingStatus("initiated");
      // Poll status
      pollBookingStatus(id);
    } catch (err) {
      setError("Booking failed: " + String(err));
      setBookingStatus("failed");
    }
    setLoading(false);
  }

  // Poll booking status until processed
  async function pollBookingStatus(id) {
    setBookingStatus("checking");
    let done = false;
    let loopCount = 0;
    while (!done && loopCount < 12) { // about 24s max
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const statusRes = await apiFetch(`/bookings/${id}/`);
        const status = statusRes.status || statusRes.booking_status;
        setBookingStatus(status);
        if (status === "booked" || status === "failed" || status === "cancelled") {
          done = true;
          return;
        }
        if (status === "payment_pending" || status === "initiated") {
          // Payment flow
          if (!paymentLink) {
            await initiatePayment(id);
          }
        }
        loopCount++;
      } catch (err) {
        setError("Error fetching booking status");
        done = true;
      }
    }
  }

  // PUBLIC_INTERFACE
  // Payment initiation (Razorpay placeholder)
  async function initiatePayment(booking_id) {
    setPaymentStatus("initiating");
    try {
      const paymentResp = await apiFetch("/payment/initiate/", {
        method: "POST",
        body: {
          booking_id,
          amount: 500 // Placeholder, could fetch from profile/session
        }
      });
      setPaymentLink(paymentResp.payment_link || "#");
      setPaymentStatus("pending");
      // Normally, would open Razorpay widget or link here
    } catch (err) {
      setPaymentStatus("failed");
      setError("Failed to initiate payment: " + String(err));
    }
  }

  // PUBLIC_INTERFACE
  // Simulate payment completion callback (for Razorpay demo)
  async function mockPaymentSuccess() {
    setPaymentStatus("processing");
    // In real app, a Razorpay widget would call backend or trigger callback
    try {
      // Mocked payment callback (simulate payment_id/tx)
      await apiFetch("/payment/callback/", {
        method: "POST",
        body: {
          payment_transaction_id: "mock1234",
          payment_id: "mock5678",
          status: "success"
        }
      });
      setPaymentStatus("success");
      setBookingStatus("booked");
    } catch (err) {
      setError("Payment callback failed.");
      setPaymentStatus("failed");
    }
  }

  /** PUBLIC_INTERFACE
   * Add a new user profile and refresh sidebar
   */
  async function handleProfileAdd(profileData) {
    try {
      await apiFetch("/user_profiles/", {
        method: "POST",
        body: profileData
      });
      fetchProfiles();
    } catch (err) {
      setError("Failed to add new profile.");
    }
  }

  // PUBLIC_INTERFACE
  // Handle form reset
  function resetForm() {
    setForm({
      user_profile_id: "",
      train_no: "",
      journey_date: "",
      from_station: "",
      to_station: "",
      passenger_name: "",
      passenger_age: "",
      passenger_sex: ""
    });
    setSelectedProfile(null);
    setBookingStatus(null);
    setBookingId(null);
    setPaymentStatus(null);
    setPaymentLink(null);
    setError(null);
  }

  // Layout: Header + main + sidebar
  return (
    <div className="App" style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      {/* Fixed header */}
      <header className="navbar" style={{
        background: COLORS.primary,
        color: COLORS.secondary,
        display: "flex",
        position: "fixed",
        top: 0, left: 0, right: 0,
        height: 60,
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 1.5rem",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        zIndex: 10
      }}>
        <div className="title" style={{
          fontWeight: 900,
          fontSize: 24,
          letterSpacing: 2
        }}>Tatkal QuickBook</div>
        <button
          className="theme-toggle"
          style={{
            background: COLORS.accent,
            color: COLORS.primary,
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
            padding: "8px 18px",
            cursor: "pointer"
          }}
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          {theme === "light" ? "🌙 Dark" : "☀️ Light"}
        </button>
      </header>

      {/* Container */}
      <div style={{
        display: "flex",
        marginTop: 70,
        minHeight: "80vh"
      }}>
        {/* Sidebar: Profiles */}
        <aside style={{
          background: "var(--bg-secondary)",
          minWidth: 240,
          padding: "2rem 1rem",
          borderRight: "1px solid var(--border-color)",
        }}>
          <h2 style={{ fontSize: 18, margin: "0 0 1rem 0" }}>Saved Profiles</h2>
          <ProfilesSidebar
            profiles={profiles}
            selectedProfile={selectedProfile}
            onSelect={handleProfileSelect}
            onAdd={handleProfileAdd}
          />
        </aside>
        {/* Main content: Booking form, status, feedback */}
        <main style={{
          flex: 1,
          padding: "2rem",
          maxWidth: 720,
          margin: "auto"
        }}>
          <h1 style={{
            fontSize: 28,
            fontWeight: 800,
            color: COLORS.primary,
            marginBottom: 18,
            letterSpacing: 1
          }}>Tatkal Ticket Booking</h1>
          <div style={{ marginBottom: 24, color: COLORS.secondary}}>
            Book lightning fast using profiles. <a href="https://www.irctc.co.in/nget/train-search" target="_blank" rel="noreferrer" style={{ color: COLORS.accent }}>IRCTC Reference</a>
          </div>
          {error && (
            <div style={{
              background: COLORS.error,
              color: "#fff",
              padding: 12,
              borderRadius: 8,
              marginBottom: 18,
            }}>{error}</div>
          )}
          <BookingForm
            form={form}
            setForm={setForm}
            onFormChange={onFormChange}
            onSubmit={submitBooking}
            disabled={loading || (bookingStatus && ["initiated", "booked", "payment_pending", "checking"].includes(bookingStatus))}
            resetForm={resetForm}
          />
          <StatusCard
            bookingStatus={bookingStatus}
            paymentStatus={paymentStatus}
            paymentLink={paymentLink}
            onMockPayment={mockPaymentSuccess}
            bookingId={bookingId}
          />
        </main>
      </div>
      {/* Footer */}
      <footer style={{
        padding: 18,
        textAlign: "center",
        color: "#aaa",
        fontSize: 14
      }}>
        &copy; {new Date().getFullYear()} QuickBook Tatkal. Made for speed and ease 🚄
      </footer>
    </div>
  );
}

/** PUBLIC_INTERFACE
 * Sidebar showing user profiles and a simple add form
 */
function ProfilesSidebar({ profiles, selectedProfile, onSelect, onAdd }) {
  const [adding, setAdding] = useState(false);
  const [newProfile, setNewProfile] = useState({
    username: "", password: "", full_name: "", age: "", phone: "",
    preferred_payment_mode: "", auto_fill_enabled: true
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setNewProfile(prev => ({ ...prev, [name]: value }));
  }
  async function handleSubmit(e) {
    e.preventDefault();
    await onAdd(newProfile);
    setAdding(false);
    setNewProfile({ username: "", password: "", full_name: "", age: "", phone: "", preferred_payment_mode: "", auto_fill_enabled: true });
  }
  return (
    <div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {profiles.map((profile) => (
          <li key={profile.id} style={{ marginBottom: 16 }}>
            <button
              onClick={() => onSelect(profile)}
              style={{
                width: "100%", padding: 10, background: profile === selectedProfile ? "#e3f2fd" : "var(--bg-primary)",
                border: profile === selectedProfile ? `2px solid ${COLORS.primary}` : "1px solid #ccc",
                borderRadius: 6, textAlign: "left", cursor: "pointer"
              }}>
              <strong>{profile.full_name}</strong>
              <br />
              <span style={{ fontSize: 12, color: "#aaa" }}>{profile.username} | {profile.preferred_payment_mode}</span>
            </button>
          </li>
        ))}
      </ul>
      {!adding && <button
        className="btn"
        style={{
          background: COLORS.primary, color: "#fff", border: "none",
          marginTop: 12, borderRadius: 6, padding: "10px 16px", width: "100%", fontWeight: "600"
        }}
        onClick={() => setAdding(true)}
      >+ Add Profile</button>}
      {adding && (
        <form onSubmit={handleSubmit} style={{ marginTop: 18, background: "#f5f5f5", borderRadius: 8, padding: 12 }}>
          <input name="full_name" placeholder="Full name" required value={newProfile.full_name} onChange={handleChange} style={inputStyle} />
          <input name="username" placeholder="Username" required value={newProfile.username} onChange={handleChange} style={inputStyle} />
          <input name="password" type="password" placeholder="Password" required value={newProfile.password} onChange={handleChange} style={inputStyle} />
          <input name="age" placeholder="Age" type="number" min={1} max={120} required value={newProfile.age} onChange={handleChange} style={inputStyle} />
          <input name="phone" placeholder="Phone" required value={newProfile.phone} onChange={handleChange} style={inputStyle} />
          <input name="preferred_payment_mode" placeholder="Payment Mode" required value={newProfile.preferred_payment_mode} onChange={handleChange} style={inputStyle} />
          <label style={{ fontSize: 12, margin: "4px 0" }}>
            <input type="checkbox" name="auto_fill_enabled" checked={newProfile.auto_fill_enabled} onChange={e => setNewProfile(prev => ({ ...prev, auto_fill_enabled: e.target.checked }))} />
            {" "}Enable Auto-Fill
          </label>
          <div style={{ marginTop: 6 }}>
            <button type="submit" style={{ ...inputStyle, background: COLORS.accent, color: COLORS.primary, fontWeight: 700, marginRight: 6 }}>Save</button>
            <button type="button" style={{ ...inputStyle, background: "#eee", color: "#4a4a4a" }} onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}

/** PUBLIC_INTERFACE
 * Main Booking Form UI
 */
function BookingForm({ form, onFormChange, onSubmit, disabled, resetForm }) {
  return (
    <form onSubmit={onSubmit} style={{
      background: "var(--bg-secondary)",
      borderRadius: 10,
      padding: "1.5rem 1.5rem 1rem 1.5rem",
      marginBottom: 22,
      boxShadow: "0 2px 10px rgba(30,20,50,0.07)"
    }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 10 }}>
        <div>
          <label style={labelStyle}>Train Number</label>
          <input type="text" name="train_no" value={form.train_no} onChange={onFormChange} required style={inputStyle} disabled={disabled} />
        </div>
        <div>
          <label style={labelStyle}>Journey Date</label>
          <input type="date" name="journey_date" value={form.journey_date} onChange={onFormChange} required style={inputStyle} disabled={disabled} />
        </div>
        <div>
          <label style={labelStyle}>From Station</label>
          <input type="text" name="from_station" value={form.from_station} onChange={onFormChange} required style={inputStyle} disabled={disabled} />
        </div>
        <div>
          <label style={labelStyle}>To Station</label>
          <input type="text" name="to_station" value={form.to_station} onChange={onFormChange} required style={inputStyle} disabled={disabled} />
        </div>
        <div>
          <label style={labelStyle}>Passenger Name</label>
          <input type="text" name="passenger_name" value={form.passenger_name} onChange={onFormChange} required style={inputStyle} disabled={disabled} />
        </div>
        <div>
          <label style={labelStyle}>Age</label>
          <input type="number" name="passenger_age" min={1} max={120} value={form.passenger_age} onChange={onFormChange} required style={inputStyle} disabled={disabled} />
        </div>
        <div>
          <label style={labelStyle}>Sex</label>
          <select name="passenger_sex" value={form.passenger_sex} onChange={onFormChange} required style={inputStyle} disabled={disabled}>
            <option value="">Select...</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
            <option value="O">Other</option>
          </select>
        </div>
      </div>
      <div style={{ marginTop: 12, display: "flex", gap: 12 }}>
        <button
          type="submit"
          className="btn btn-large"
          disabled={disabled}
          style={{
            background: COLORS.primary,
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontWeight: 700,
            fontSize: 18,
            padding: "10px 34px",
            cursor: disabled ? "not-allowed" : "pointer",
            transition: "opacity 0.3s",
            boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
            opacity: disabled ? 0.7 : 1
          }}
        >Book Now</button>
        <button
          type="button"
          className="btn"
          onClick={resetForm}
          style={{
            background: "#eee",
            color: COLORS.primary,
            border: "1px solid #bbb",
            borderRadius: 6,
            padding: "10px 18px"
          }}
          disabled={disabled}
        >Reset</button>
      </div>
    </form>
  );
}

/** PUBLIC_INTERFACE
 * Shows booking/payment status and guides user through steps
 */
function StatusCard({ bookingStatus, paymentStatus, paymentLink, onMockPayment, bookingId }) {
  if (!bookingStatus) return null;
  let message = "";
  let cardColor = "#f5f5f5";

  if (["initiated", "initiating", "checking"].includes(bookingStatus)) {
    message = "Booking is being processed. Please wait...";
    cardColor = "#fffde7";
  } else if (bookingStatus === "payment_pending") {
    message = "Booking is pending payment. Complete your payment to confirm.";
    cardColor = "#fff3e0";
  } else if (bookingStatus === "booked") {
    message = "Your ticket is booked! Check your profile/email for PNR details.";
    cardColor = "#e8f5e9";
  } else if (bookingStatus === "failed" || bookingStatus === "cancelled") {
    message = "Booking failed or was cancelled. Please try again.";
    cardColor = "#ffebee";
  }

  return (
    <div style={{
      background: cardColor,
      border: "1px solid #ddd",
      borderRadius: 10,
      padding: 22,
      marginBottom: 18,
      minHeight: 64,
      fontSize: 18,
      color: "#263238"
    }}>
      <span style={{ fontWeight: 700, marginRight: 8 }}>
        {statusEmoji(bookingStatus)}
      </span>
      {message}
      {bookingStatus === "payment_pending" && (
        <div style={{ marginTop: 16 }}>
          {paymentLink ?
            <a href={paymentLink} target="_blank" rel="noreferrer" style={{
              background: COLORS.accent,
              color: COLORS.primary,
              padding: "10px 22px",
              borderRadius: 6,
              fontWeight: 600,
              textDecoration: "none",
              boxShadow: "0 1px 4px rgba(0,0,0,0.07)"
            }}>
              Pay Now (Demo Link)
            </a>
            : <span>Generating payment link...</span>
          }
          <button onClick={onMockPayment} style={{
            marginLeft: 18,
            background: COLORS.success,
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "8px 18px",
            cursor: "pointer",
            fontWeight: 700
          }}>
            Simulate Payment Success
          </button>
        </div>
      )}
      {bookingId && (
        <div style={{ fontSize: 13, color: "#777", marginTop: 12 }}>
          Booking ID: {bookingId}
        </div>
      )}
    </div>
  );
}

function statusEmoji(status) {
  switch (status) {
    case "initiated":
    case "initiating": return "⏳";
    case "checking": return "🔄";
    case "payment_pending": return "💳";
    case "booked": return "✅";
    case "failed":
    case "cancelled": return "❌";
    default: return "ℹ️";
  }
}

// Styles for quick input re-use
const inputStyle = {
  width: "100%",
  padding: "8px 10px",
  marginBottom: 8,
  borderRadius: 5,
  border: "1px solid #b0b0b0",
  fontSize: 15,
  background: "#fff"
};
const labelStyle = {
  fontSize: 13,
  fontWeight: 500,
  color: "#384850",
  marginBottom: 4
};

export default App;
