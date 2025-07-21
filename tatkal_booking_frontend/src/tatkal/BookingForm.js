import React, { useState, useEffect } from "react";
import { theme } from "../theme";

// Razorpay loader (dynamically loaded when needed)
function loadRazorpayScript(callback) {
  if (window.Razorpay) return callback();
  const script = document.createElement("script");
  script.src = "https://checkout.razorpay.com/v1/checkout.js";
  script.async = true;
  script.onload = callback;
  document.body.appendChild(script);
  // fallback: error after 6s
  setTimeout(() => { if (!window.Razorpay) callback(new Error("Razorpay script failed")) }, 6000);
}

/**
 * Main booking form used in the Tatkal Booking App.
 *
 * @param {Object} props - bookingProps
 * @returns JSX.Element
 *
 * PUBLIC_INTERFACE
 */
export default function BookingForm({
  selectedProfile,
  onBooking,
  bookingStatus,
  onPayment,
  paymentStatus,
  error,
  onInputChange,
  autofillKey,
  loading,
  ...props
}) {
  const [form, setForm] = useState({
    train: "",
    name: "",
    phone: "",
    age: "",
    quota: "Tatkal",
    travel_date: "",
    payment_mode: "UPI",
    upi: "",
    card: "",
    coaches: "",
    seat: ""
  });

  useEffect(() => {
    // Autofill from profile
    if (selectedProfile && autofillKey) {
      setForm(f => ({
        ...f,
        name: selectedProfile.name || "",
        phone: selectedProfile.phone || "",
        age: selectedProfile.age || "",
        payment_mode: selectedProfile.payment_mode || "UPI",
        upi: selectedProfile.upi || "",
      }));
    }
  }, [selectedProfile, autofillKey]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(old => ({ ...old, [name]: value }));
    onInputChange && onInputChange({ ...form, [name]: value });
  }

  function validate() {
    if (!form.train || !form.name || !form.age || !form.phone || !form.travel_date)
      return "All fields except seat/coaches are required.";
    if (form.payment_mode === "UPI" && !form.upi)
      return "Please enter a UPI ID for payment.";
    if (form.payment_mode === "Card" && !form.card)
      return "Please enter card details or switch to UPI.";
    return "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const err = validate();
    if (err) return props.onError && props.onError(err);
    // Send booking req (parent)
    await onBooking(form);
  }

  // Triggers Razorpay flow from parent prop
  function handlePayNow() {
    if (paymentStatus?.payment_link) {
      // Open Razorpay:
      loadRazorpayScript(() => {
        const rzp = new window.Razorpay({
          key: paymentStatus.razorpay_key,
          amount: paymentStatus.amount * 100,
          currency: "INR",
          name: "Tatkal FastBook",
          description: "Tatkal Booking Payment",
          order_id: paymentStatus.order_id,
          handler: response => {
            onPayment && onPayment(response);
          },
          prefill: {
            name: form.name,
            email: selectedProfile?.email || "",
            contact: form.phone,
          },
          theme: { color: theme.primary },
        });
        rzp.open();
      });
    }
  }

  return (
    <form className="tatkal-form" autoComplete="off" onSubmit={handleSubmit}>
      <div className="tatkal-section-title">Book Tatkal Ticket</div>
      <div className="tatkal-form-row">
        <label className="tatkal-label">Train Number</label>
        <input className="tatkal-input" autoFocus name="train" placeholder="e.g., 12345" value={form.train} onChange={handleChange} required />
        <label className="tatkal-label">Date</label>
        <input className="tatkal-input" type="date" name="travel_date" value={form.travel_date} onChange={handleChange} required />
      </div>
      <div className="tatkal-form-row">
        <label className="tatkal-label">Name</label>
        <input className="tatkal-input" name="name" value={form.name} onChange={handleChange} required />
        <label className="tatkal-label">Phone</label>
        <input className="tatkal-input" name="phone" value={form.phone} onChange={handleChange} required />
        <label className="tatkal-label">Age</label>
        <input className="tatkal-input" name="age" value={form.age} onChange={handleChange} required type="number" />
      </div>
      <div className="tatkal-form-row">
        <label className="tatkal-label">Quota</label>
        <select className="tatkal-select" name="quota" value={form.quota} onChange={handleChange}>
          <option value="Tatkal">Tatkal</option>
          <option value="General">General</option>
        </select>
        <label className="tatkal-label">Coach</label>
        <input className="tatkal-input" name="coaches" value={form.coaches} onChange={handleChange} placeholder="Optional" />
        <label className="tatkal-label">Seat</label>
        <input className="tatkal-input" name="seat" value={form.seat} onChange={handleChange} placeholder="Optional" />
      </div>
      <div className="tatkal-form-row">
        <label className="tatkal-label">Payment Mode</label>
        <select className="tatkal-select" name="payment_mode" value={form.payment_mode} onChange={handleChange}>
          <option value="UPI">UPI</option>
          <option value="Card">Credit/Debit Card</option>
        </select>
        {form.payment_mode === "UPI" && (
          <>
            <label className="tatkal-label">UPI ID</label>
            <input className="tatkal-input" name="upi" value={form.upi} onChange={handleChange} />
          </>
        )}
        {form.payment_mode === "Card" && (
          <>
            <label className="tatkal-label">Card #</label>
            <input className="tatkal-input" name="card" value={form.card} onChange={handleChange} />
          </>
        )}
      </div>
      {error && <div className="tatkal-error-bar">{error}</div>}
      {bookingStatus && (
        <div className={`tatkal-status-bar${bookingStatus.loading ? " tatkal-status-loading" : ""}`}>
          {bookingStatus?.loading ? "Booking in progress..." :
            bookingStatus?.success ? "Booking Successful! Booking ID: " + bookingStatus?.id :
              bookingStatus?.error ? "Booking Failed: " + bookingStatus?.error : ""}
        </div>
      )}
      {paymentStatus && paymentStatus.amount && (
        <div className={`tatkal-status-bar${paymentStatus.loading ? " tatkal-status-loading" : ""}`}>
          {paymentStatus?.paid
            ? "Payment Successful ✅"
            : (
              <>
                Pay ₹{paymentStatus.amount} to complete:
                <button className="tatkal-btn tatkal-btn-accent" type="button" onClick={handlePayNow}>
                  Pay Now
                </button>
              </>
            )}
        </div>
      )}
      <div className="tatkal-action-row">
        <button className="tatkal-btn" type="submit" disabled={loading}>
          {loading ? "Booking..." : "Book Now"}
        </button>
      </div>
    </form>
  );
}
