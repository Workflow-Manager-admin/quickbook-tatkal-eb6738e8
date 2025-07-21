import React, { useEffect, useState } from "react";
import { theme } from "../theme";
import Sidebar from "./Sidebar";
import ProfileModal from "./ProfileModal";
import BookingForm from "./BookingForm";
import "./tatkal.css";
import {
  fetchProfiles, saveProfile, deleteProfile,
  createBooking, getBookingStatus,
  createPayment, getPaymentStatus
} from "./api";

// PUBLIC_INTERFACE
export default function TatkalBookingApp() {
  // UI & Data State
  const [profiles, setProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [sidebarProfileModal, setSidebarProfileModal] = useState({ open: false, editProfile: null });
  const [bookingStatus, setBookingStatus] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [autofillKey, setAutofillKey] = useState(0);

  // Load profiles from backend on mount
  useEffect(() => {
    fetchProfiles().then(setProfiles).catch(() => setProfiles([]));
  }, []);

  function handleSelectProfile(id) {
    setSelectedProfileId(id);
    setAutofillKey(k => k + 1);
  }

  function handleNewProfile() {
    setSidebarProfileModal({ open: true, editProfile: null });
  }
  function handleEditProfile(profile) {
    setSidebarProfileModal({ open: true, editProfile: profile });
  }
  async function handleSaveProfile(profile) {
    const saved = await saveProfile(profile);
    // Reload profiles
    const next = await fetchProfiles();
    setProfiles(next);
    setSidebarProfileModal({ open: false, editProfile: null });
  }
  async function handleDeleteProfile(profile) {
    if (!window.confirm("Delete this profile?")) return;
    await deleteProfile(profile.id);
    const next = await fetchProfiles();
    setProfiles(next);
    if (selectedProfileId === profile.id) setSelectedProfileId(null);
  }

  async function handleBooking(form) {
    setError(""); setLoading(true); setBookingStatus({ loading: true });
    try {
      const booking = await createBooking(form);
      setBookingStatus({ ...booking, loading: false, success: true });
      // Kick off payment instantly
      handlePaymentRequest(booking.id);
    } catch (e) {
      setBookingStatus({ error: e.message, loading: false });
      setLoading(false);
    }
  }

  // Payment: triggers Razorpay (simulate link for now)
  async function handlePaymentRequest(bookingId) {
    setPaymentStatus({ loading: true });
    try {
      const payment = await createPayment(bookingId);
      setPaymentStatus({ ...payment, loading: false, paid: false });
    } catch (e) {
      setPaymentStatus({ error: e.message, loading: false });
    }
    setLoading(false);
  }

  // Razorpay payment callback (after user pays)
  async function handlePaymentSuccess(razorpayResponse) {
    setPaymentStatus(ps => ({ ...ps, loading: true }));
    try {
      // In real: verify at backend, here just poll payment status:
      const status = await getPaymentStatus(paymentStatus.id);
      setPaymentStatus({ ...status, paid: status.paid, loading: false });
    } catch (e) {
      setPaymentStatus(ps => ({ ...ps, error: "Payment verif. failed", loading: false }));
    }
  }

  function handleFormInputChange(form) {
    // Could use to instantly suggest seat/coach or fetch fares.
  }

  function handleError(msg) {
    setError(msg);
    setLoading(false);
  }

  const selectedProfile = profiles.find(p => p.id === selectedProfileId);

  return (
    <div className="tatkal-root-app">
      {/* Header */}
      <header className="tatkal-header">
        <div className="tatkal-header-title">Tatkal FastBook</div>
        <nav className="tatkal-header-links">
          <span className="tatkal-nav-link" style={{ color: theme.accent }}>Book</span>
          <span className="tatkal-nav-link">My Bookings</span>
          <span className="tatkal-header-profile">{selectedProfile?.name ? selectedProfile.name : "Guest"}</span>
        </nav>
      </header>
      <div className="tatkal-main-row">
        <Sidebar
          profiles={profiles}
          selectedProfileId={selectedProfileId}
          onSelect={handleSelectProfile}
          onEdit={handleEditProfile}
          onDelete={handleDeleteProfile}
          onNew={handleNewProfile}
        />
        <main className="tatkal-main-content">
          <BookingForm
            selectedProfile={selectedProfile}
            onBooking={handleBooking}
            bookingStatus={bookingStatus}
            onPayment={handlePaymentSuccess}
            paymentStatus={paymentStatus}
            error={error}
            onInputChange={handleFormInputChange}
            autofillKey={autofillKey}
            loading={loading}
            onError={handleError}
          />
        </main>
      </div>
      <ProfileModal
        visible={sidebarProfileModal.open}
        profile={sidebarProfileModal.editProfile}
        onSave={handleSaveProfile}
        onClose={() => setSidebarProfileModal({ open: false, editProfile: null })}
      />
    </div>
  );
}
