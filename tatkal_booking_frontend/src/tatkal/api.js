const BASE_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000/api";

function api(path, method = "GET", body, token, extraHeaders) {
  const url = BASE_URL + path;
  const headers = {
    'Accept': "application/json",
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    ...(extraHeaders || {}),
  };
  return fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  }).then(async res => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = data.detail || data.error || "API error";
      throw new Error(error);
    }
    return data;
  });
}

// PUBLIC_INTERFACE
export async function fetchProfiles() {
  return api("/profiles/", "GET");
}
// PUBLIC_INTERFACE
export async function saveProfile(profile) {
  return api("/profiles/", profile.id ? "PUT" : "POST", profile);
}
// PUBLIC_INTERFACE
export async function deleteProfile(id) {
  return api(`/profiles/${id}/`, "DELETE");
}
// PUBLIC_INTERFACE
export async function createBooking(data) {
  return api("/bookings/", "POST", data);
}
// PUBLIC_INTERFACE
export async function getBookingStatus(bookingId) {
  return api(`/bookings/${bookingId}/`, "GET");
}
// PUBLIC_INTERFACE
export async function createPayment(bookingId) {
  return api(`/bookings/${bookingId}/pay/`, "POST");
}
// PUBLIC_INTERFACE
export async function getPaymentStatus(paymentId) {
  return api(`/payments/${paymentId}/`, "GET");
}
