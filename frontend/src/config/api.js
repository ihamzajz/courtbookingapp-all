const configuredBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

if (!configuredBaseUrl) {
  throw new Error("EXPO_PUBLIC_API_BASE_URL is not set in frontend/.env");
}

// Single source of truth for frontend API host.
export const BASE_URL = configuredBaseUrl.replace(/\/+$/, "");


export const API_BASE = `${BASE_URL}/api`;
export const UPLOADS_BASE = `${BASE_URL}/uploads`;
export const AUTH_API = `${API_BASE}/auth`;
export const COURTS_API = `${API_BASE}/courts`;
export const COURT_IMAGES_BASE = `${UPLOADS_BASE}/courts/`;
export const EVENTS_API = `${API_BASE}/events`;
export const EVENT_IMAGES_BASE = `${UPLOADS_BASE}/events/`;
export const EVENT_BOOKINGS_API = `${API_BASE}/event-bookings`;
export const BOOKINGS_API = `${API_BASE}/bookings`;
export const USERS_API = `${API_BASE}/users`;
export const SLIDES_API = `${API_BASE}/slides`;
export const SLIDE_IMAGES_BASE = `${UPLOADS_BASE}/slides/`;
export const FAQS_API = `${API_BASE}/faqs`;
export const NEWS_API = `${API_BASE}/news`;
export const NEWS_IMAGES_BASE = `${UPLOADS_BASE}/news/`;
export const COMPLIANCE_API = `${API_BASE}/compliance`;
