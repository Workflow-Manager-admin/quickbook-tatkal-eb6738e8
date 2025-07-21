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
  success: "#388e3c",
};

function apiFetch(endpoint, { method = "GET", body, headers = {} } = {}) {
  let opts = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };
  if (body) opts.body = JSON.stringify(body);
  return fetch(`${API_BASE}${endpoint}`, opts).then(async (res) => {
    const contentType = res.headers.get("content-type");
    if (!res.ok) throw new Error(await res.text());
    if (contentType && contentType.indexOf("application/json") !== -1) {
      return await res.json();
    }
    return await res.text();
  });
}

/**
 * PUBLIC_INTERFACE
 * Main App: Registration -> Booking -> QuickPay
 */
function App() {
  // Theme and UI state
  const [theme, setTheme] = useState("light");
  const [registered, setRegistered] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [error, setError] = useState(null);
  const [booking, setBooking] = useState(null);
  const [bookingStatus, setBookingStatus] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [paymentLink, setPaymentLink] = useState(null);
  const [wallet, setWallet] = useState(0);

  // Registration/Booking form states
  const [registrationForm, setRegistrationForm] = useState({
    full_name: "",
    age: "",
    address: "",
    preferred_berth: "",
    phone: "",
  });
  const [bookingForm, setBookingForm] = useState({
    from: "",
    to: "",
    journey_date: "",
    preferred_berth: "",
  });

  // Theme effect
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // On load: try load local user or fetch profiles
  useEffect(() => {
    fetchProfiles();
    const user = localStorage.getItem("tatkal_user_profile");
    if (user) {
      setUserProfile(JSON.parse(user));
      setRegistered(true);
      setWallet(Number(localStorage.getItem("tatkal_wallet") || 0));
    }
  }, []);

  function fetchProfiles() {
    apiFetch("/user_profiles/")
      .then((result) => setProfiles(Array.isArray(result) ? result : []))
      .catch(() => setProfiles([]));
  }

  // Registration submit
  // PUBLIC_INTERFACE
  async function handleRegistration(e) {
    e.preventDefault();
    setError(null);
    // Save profile to backend (for demo: skip password)
    try {
      const resp = await apiFetch("/user_profiles/", {
        method: "POST",
        body: {
          username: registrationForm.full_name.replace(/\s+/g, "_").toLowerCase() + "_" + Math.floor(Math.random() * 10000),
          password: registrationForm.full_name + Date.now(),
          full_name: registrationForm.full_name,
          age: registrationForm.age,
          phone: registrationForm.phone,
          preferred_payment_mode: "wallet",
          auto_fill_enabled: true,
          address: registrationForm.address,
          preferred_berth: registrationForm.preferred_berth,
        },
      });
      // Persist locally
      setUserProfile(resp);
      setRegistered(true);
      localStorage.setItem("tatkal_user_profile", JSON.stringify(resp));
      if (!localStorage.getItem("tatkal_wallet")) {
        localStorage.setItem("tatkal_wallet", "1000");
      }
      setWallet(Number(localStorage.getItem("tatkal_wallet")));
    } catch (err) {
      setError("Registration failed: " + String(err));
    }
  }

  // Booking form submit
  // PUBLIC_INTERFACE
  async function handleBooking(e) {
    e.preventDefault();
    setError(null);
    setBookingStatus("initiating");
    setPaymentStatus(null);
    setBooking(null);
    setPaymentLink(null);

    // Compose booking payload
    const payload = {
      user_profile_id: userProfile.id || userProfile.user_profile_id,
      passenger_name: userProfile.full_name,
      passenger_age: userProfile.age,
      passenger_sex: "U", // Not provided in registration; could be added if needed
      preferred_berth: bookingForm.preferred_berth,
      address: userProfile.address,
      from_station: bookingForm.from,
      to_station: bookingForm.to,
      journey_date: bookingForm.journey_date,
    };

    try {
      // Backend expects POST /bookings/ (no train_no!)
      const bookingRes = await apiFetch("/bookings/", {
        method: "POST",
        body: payload,
      });
      setBooking(bookingRes);
      setBookingStatus("initiated");
      if (wallet < 500) {
        setPaymentStatus("insufficient_wallet");
        setError("Insufficient wallet balance. Please deposit.");
      } else {
        setTimeout(() => handleQuickPay(bookingRes), 800);
      }
    } catch (err) {
      setError("Booking failed: " + String(err));
      setBookingStatus("failed");
    }
  }

  // PUBLIC_INTERFACE
  // Handle wallet deposit
  function handleDeposit(amt) {
    const newWallet = wallet + amt;
    setWallet(newWallet);
    localStorage.setItem("tatkal_wallet", String(newWallet));
  }

  // PUBLIC_INTERFACE
  // Handle Quick Pay (auto debit on booking)
  async function handleQuickPay(bookingObj) {
    try {
      setPaymentStatus("processing");
      // Simulate payment (auto debit wallet)
      const paymentAmount = 500;
      if (wallet < paymentAmount) {
        setError("Insufficient wallet balance for Quick Pay.");
        setPaymentStatus("failed");
        return;
      }
      // Deduct from local wallet
      const newWallet = wallet - paymentAmount;
      setWallet(newWallet);
      localStorage.setItem("tatkal_wallet", String(newWallet));

      // Mock callback POST
      await apiFetch("/payment/callback/", {
        method: "POST",
        body: {
          payment_transaction_id: "wallet_tx_" + Date.now(),
          payment_id: "wallet_pay_" + Date.now(),
          status: "success",
        },
      });
      setPaymentStatus("success");
      setBookingStatus("booked");
    } catch (err) {
      setError("Quick Pay failed: " + String(err));
      setPaymentStatus("failed");
    }
  }

  // Reset state and forms
  function resetAll() {
    setRegistered(false);
    setUserProfile(null);
    localStorage.removeItem("tatkal_user_profile");
    setBooking(null);
    setBookingStatus(null);
    setPaymentStatus(null);
    setPaymentLink(null);
    setError(null);
  }

  // Layout: Registration -> Booking -> Status+QuickPay
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

      <main style={{ marginTop: 80, maxWidth: 500, marginLeft: "auto", marginRight: "auto", padding: "2rem 1rem" }}>
        <h1 style={{
          fontSize: 28,
          fontWeight: 800,
          color: COLORS.primary,
          marginBottom: 18,
          letterSpacing: 1
        }}>Tatkal Ticket Booking</h1>
        <div style={{ marginBottom: 12, color: COLORS.secondary }}>
          Book lightning fast. <span style={{ color: COLORS.accent, marginLeft: 6 }}>Auto-fill, One-click Pay, No train number required!</span>
        </div>
        {/* Show registration or booking */}
        {error && (
          <div style={{
            background: COLORS.error,
            color: "#fff",
            padding: 12,
            borderRadius: 8,
            marginBottom: 18,
          }}>{error}</div>
        )}

        {!registered ? (
          <RegistrationForm
            registrationForm={registrationForm}
            setRegistrationForm={setRegistrationForm}
            onSubmit={handleRegistration}
          />
        ) : (
          <>
            <ProfileCard userProfile={userProfile} wallet={wallet} onReset={resetAll} onDeposit={handleDeposit} />
            {!bookingStatus || bookingStatus === "failed" ? (
              <BookingForm
                bookingForm={bookingForm}
                setBookingForm={setBookingForm}
                onSubmit={handleBooking}
              />
            ) : null}
            <StatusCard
              bookingStatus={bookingStatus}
              paymentStatus={paymentStatus}
              booking={booking}
              paymentLink={paymentLink}
              wallet={wallet}
              onDeposit={handleDeposit}
              onQuickPay={() => handleQuickPay(booking)}
            />
          </>
        )}
      </main>
      <footer style={{
        padding: 18,
        textAlign: "center",
        color: "#aaa",
        fontSize: 14
      }}>
        &copy; {new Date().getFullYear()} QuickBook Tatkal. Registration &rarr; Booking &rarr; QuickPay 🚄
      </footer>
    </div>
  );
}

/**
 * PUBLIC_INTERFACE
 * Registration form (name, age, address, preferred berth)
 */
function RegistrationForm({ registrationForm, setRegistrationForm, onSubmit }) {
  function handleChange(e) {
    const { name, value } = e.target;
    setRegistrationForm((prev) => ({ ...prev, [name]: value }));
  }
  return (
    <form onSubmit={onSubmit} style={{
      background: "var(--bg-secondary)",
      borderRadius: 8,
      padding: "1.5rem 1rem",
      marginBottom: 20,
      boxShadow: "0 2px 8px rgba(30,20,50,0.07)"
    }}>
      <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 18, color: "#1a3365" }}>Register to Book</h2>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Full Name</label>
        <input name="full_name" type="text" required value={registrationForm.full_name} onChange={handleChange} style={inputStyle} autoFocus />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Age</label>
        <input name="age" type="number" min={1} max={120} required value={registrationForm.age} onChange={handleChange} style={inputStyle} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Address</label>
        <input name="address" type="text" required value={registrationForm.address} onChange={handleChange} style={inputStyle} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Preferred Berth</label>
        <select name="preferred_berth" required value={registrationForm.preferred_berth} onChange={handleChange} style={inputStyle}>
          <option value="">Select...</option>
          <option value="Lower">Lower</option>
          <option value="Middle">Middle</option>
          <option value="Upper">Upper</option>
          <option value="Side Lower">Side Lower</option>
          <option value="Side Upper">Side Upper</option>
        </select>
      </div>
      <div style={{ marginBottom: 18 }}>
        <label style={labelStyle}>Phone</label>
        <input name="phone" type="text" required value={registrationForm.phone} onChange={handleChange} style={inputStyle} />
      </div>
      <button type="submit" className="btn btn-large" style={{
        background: "#ffab00",
        color: "#212121",
        border: "none",
        borderRadius: 6,
        fontWeight: 700,
        fontSize: 18,
        padding: "12px 32px",
        width: "100%",
        cursor: "pointer",
        marginTop: 10
      }}>Register &nbsp;→</button>
    </form>
  );
}

/**
 * PUBLIC_INTERFACE
 * Booking form (only after registration)
 * Fields: from, to, date, preferred_berth
 */
function BookingForm({ bookingForm, setBookingForm, onSubmit }) {
  function handleChange(e) {
    const { name, value } = e.target;
    setBookingForm((prev) => ({ ...prev, [name]: value }));
  }
  return (
    <form onSubmit={onSubmit} style={{
      background: "var(--bg-secondary)",
      borderRadius: 8,
      padding: "1rem 1rem",
      marginBottom: 20,
      boxShadow: "0 2px 8px rgba(30,20,50,0.05)"
    }}>
      <h2 style={{ fontWeight: 700, fontSize: 20, marginBottom: 18, color: "#1a3365" }}>Book Ticket</h2>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Source (From)</label>
        <input name="from" type="text" required value={bookingForm.from} onChange={handleChange} style={inputStyle} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Destination (To)</label>
        <input name="to" type="text" required value={bookingForm.to} onChange={handleChange} style={inputStyle} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Journey Date</label>
        <input name="journey_date" type="date" required value={bookingForm.journey_date} onChange={handleChange} style={inputStyle} />
      </div>
      <div style={{ marginBottom: 18 }}>
        <label style={labelStyle}>Preferred Berth</label>
        <select name="preferred_berth" required value={bookingForm.preferred_berth} onChange={handleChange} style={inputStyle}>
          <option value="">Select...</option>
          <option value="Lower">Lower</option>
          <option value="Middle">Middle</option>
          <option value="Upper">Upper</option>
          <option value="Side Lower">Side Lower</option>
          <option value="Side Upper">Side Upper</option>
        </select>
      </div>
      <button type="submit" className="btn btn-large" style={{
        background: COLORS.primary,
        color: "#fff",
        border: "none",
        borderRadius: 6,
        fontWeight: 700,
        fontSize: 18,
        padding: "12px 32px",
        width: "100%",
        cursor: "pointer",
        marginTop: 6
      }}>Book Now</button>
    </form>
  );
}

/**
 * PUBLIC_INTERFACE
 * Profile summary, wallet, and reset/deposit actions
 */
function ProfileCard({ userProfile, wallet, onReset, onDeposit }) {
  return (
    <div style={{
      background: "#e3f2fd",
      borderRadius: 10,
      padding: "24px 20px",
      marginBottom: 18,
      boxShadow: "0 2px 8px rgba(30,60,150,0.06)",
      color: "#1a3365",
      position: "relative"
    }}>
      <div style={{
        fontWeight: 700, fontSize: 19, marginBottom: 10, letterSpacing: 1
      }}>
        Welcome, {userProfile.full_name}
      </div>
      <div style={{ fontSize: 14, marginBottom: 6 }}>
        Age: {userProfile.age} &nbsp;|&nbsp; Address: {userProfile.address}
      </div>
      <div style={{ fontSize: 14, marginBottom: 6 }}>
        Preferred Berth: <b>{userProfile.preferred_berth}</b> &nbsp;|&nbsp; Phone: {userProfile.phone}
      </div>
      <div style={{ fontSize: 15, marginBottom: 10, fontWeight: 600 }}>
        💰 Wallet Balance: <span style={{ color: COLORS.primary }}>₹{wallet.toFixed(2)}</span>
        <button onClick={() => onDeposit(500)} style={{
          marginLeft: 14,
          background: COLORS.accent,
          border: "none",
          borderRadius: 6,
          color: "#212121",
          fontWeight: 700,
          padding: "5px 15px",
          cursor: "pointer"
        }}>Deposit ₹500</button>
      </div>
      <button onClick={onReset} style={{
        position: "absolute", top: 15, right: 14,
        background: "#fff3e0", color: "#c62828",
        border: "1px solid #bbb", borderRadius: 6,
        fontWeight: 700, fontSize: 12, padding: "4px 10px", cursor: "pointer"
      }}>Logout</button>
    </div>
  );
}

/**
 * PUBLIC_INTERFACE
 * Booking/payment status, guides user through steps
 */
function StatusCard({ bookingStatus, paymentStatus, booking, wallet, onDeposit, onQuickPay }) {
  if (!bookingStatus) return null;
  let message = "";
  let cardColor = "#f5f5f5";
  let action = null;

  if (["initiating"].includes(bookingStatus)) {
    message = "Booking is being processed. Please wait...";
    cardColor = "#fffde7";
  } else if (bookingStatus === "initiated") {
    if (wallet < 500) {
      message = "Booking ready. Insufficient wallet balance for Quick Pay.";
      cardColor = "#ffe0b2";
      action = <button style={{ ...inputStyle, background: COLORS.accent, color: "#222", fontWeight: 700, marginTop: 10 }} onClick={() => onDeposit(500)}>Deposit ₹500</button>;
    } else {
      message = "Booking ready. Use Quick Pay to auto-debit and confirm!";
      cardColor = "#e3f2fd";
      action = <button style={{ ...inputStyle, background: COLORS.success, color: "#fff", fontWeight: 700, marginTop: 10 }} onClick={onQuickPay}>Pay Now & QuickBook</button>;
    }
  } else if (bookingStatus === "booked") {
    message = "✅ Your ticket is booked! Enjoy your journey!";
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
      {action}
      {booking && booking.booking_id && (
        <div style={{ fontSize: 13, color: "#777", marginTop: 12 }}>
          Booking ID: {booking.booking_id}
        </div>
      )}
    </div>
  );
}

function statusEmoji(status) {
  switch (status) {
    case "initiated": return "⏳";
    case "initiating": return "🔄";
    case "payment_pending": return "💳";
    case "booked": return "✅";
    case "failed":
    case "cancelled": return "❌";
    default: return "ℹ️";
  }
}

// Input and label styles
const inputStyle = {
  width: "100%",
  padding: "8px 10px",
  marginBottom: 8,
  borderRadius: 5,
  border: "1px solid #b0b0b0",
  fontSize: 15,
  background: "#fff",
};
const labelStyle = {
  fontSize: 13,
  fontWeight: 500,
  color: "#384850",
  marginBottom: 4,
};

export default App;
