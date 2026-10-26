import { apiConnector } from "../apiConnector";
import { endpoints } from "../api";

const { REGISTER_API, LOGIN_API, VERIFY_EMAIL_API, RESEND_OTP_API, REFRESH_API, ME_API } = endpoints;

// ─────────────────────────────────────────────
//  REGISTER
//  POST /auth/register → { message, email, dev_otp? }
//  @param {object} formData - { name, email, password }
// ─────────────────────────────────────────────
export async function register(formData) {
  try {
    const data = await apiConnector("POST", REGISTER_API, formData);
    return data;
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    throw error;
  }
}

// ─────────────────────────────────────────────
//  LOGIN
//  POST /auth/login → { message, user, access_token, refresh_token }
//  @param {string} email
//  @param {string} password
// ─────────────────────────────────────────────
export async function login(email, password) {
  try {
    const data = await apiConnector("POST", LOGIN_API, { email, password });
    return data;
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    throw error;
  }
}

// ─────────────────────────────────────────────
//  VERIFY EMAIL
//  POST /auth/verify-email → { message, user, access_token, refresh_token }
//  @param {string} email
//  @param {string} code - 6-digit OTP
// ─────────────────────────────────────────────
export async function verifyEmail(email, code) {
  try {
    const data = await apiConnector("POST", VERIFY_EMAIL_API, { email, code });
    return data;
  } catch (error) {
    console.error("VERIFY EMAIL ERROR:", error);
    throw error;
  }
}

// ─────────────────────────────────────────────
//  RESEND OTP
//  POST /auth/resend-otp → { message, dev_otp? }
//  @param {string} email
// ─────────────────────────────────────────────
export async function resendOtp(email) {
  try {
    const data = await apiConnector("POST", RESEND_OTP_API, { email });
    return data;
  } catch (error) {
    console.error("RESEND OTP ERROR:", error);
    throw error;
  }
}

// ─────────────────────────────────────────────
//  CHECK AUTH (on page load)
//  GET /auth/me → { user }
//  Validates the access token.
// ─────────────────────────────────────────────
export async function checkAuth() {
  try {
    const data = await apiConnector("GET", ME_API);
    return data;
  } catch (error) {
    // 401 means not authenticated — expected when no token exists
    console.error("CHECK AUTH ERROR:", error);
    return null;
  }
}

// ─────────────────────────────────────────────
//  REFRESH TOKEN
//  POST /auth/refresh → { access_token }
// ─────────────────────────────────────────────
export async function refreshToken() {
  try {
    const data = await apiConnector("POST", REFRESH_API);
    return data;
  } catch (error) {
    console.error("REFRESH TOKEN ERROR:", error);
    return null;
  }
}

// ─────────────────────────────────────────────
//  LOGOUT
//  POST /auth/logout → clears httpOnly cookie
// ─────────────────────────────────────────────
export async function logout() {
  try {
    await apiConnector("POST", endpoints.LOGOUT_API || "/api/auth/logout");
  } catch (error) {
    console.error("LOGOUT ERROR:", error);
  }
}
