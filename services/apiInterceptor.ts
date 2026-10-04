/**
 * apiInterceptor.ts
 *
 * Auth error handling utilities. No monkey patching, no global side effects.
 *
 * Exports:
 *   handleAuthError(status, data)  — call from axios response interceptors or socket events
 *   verifyOfficerStatus(force?)    — call from App.tsx socket listener to re-check account status
 *   setupAxiosInterceptors(axios)  — call ONCE in App.tsx to attach auth interceptor to default axios
 */

import { Alert } from "react-native";
import store from "@/services/reducxStore";
import { logoutUser } from "@/store/authSlice";
import { navigationRef } from "@/navigationRef";
import socketService from "@/services/socket/socket.service";
import environment from "@/environment/environment";
import i18n from "@/i18n/i18n";
import axios, { AxiosInstance } from "axios";

// ─── Module-level flags ───────────────────────────────────────────────────────
let isSessionAlertShown = false;
let isCheckingStatus = false;
let lastStatusCheckTime = 0;

// ─── Auth screen names — errors on these screens are silently ignored ─────────
const AUTH_SCREENS = ["Login", "Lanuage", "Splash", "BannedScreen", "Logout"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isOnAuthScreen = (): boolean => {
  if (!navigationRef.isReady()) return true;
  const name = (navigationRef.getCurrentRoute() as any)?.name || "";
  return AUTH_SCREENS.includes(name);
};

const doLogout = (): void => {
  try {
    store.dispatch(logoutUser());
    socketService.disconnect();
  } catch (e) {
    console.error("[Auth] Logout error:", e);
  }
};

const navigateToBannedScreen = (statusType: string, message: string): void => {
  const attempt = (attemptsLeft = 10) => {
    if (navigationRef.isReady()) {
      navigationRef.reset({
        index: 0,
        routes: [{ name: "BannedScreen", params: { statusType, message } }],
      });
    } else if (attemptsLeft > 0) {
      setTimeout(() => attempt(attemptsLeft - 1), 100);
    }
  };
  attempt();
};

const navigateToLogin = (): void => {
  if (navigationRef.isReady()) {
    navigationRef.reset({ index: 0, routes: [{ name: "Login" }] });
  }
};

// ─── Main auth error handler ──────────────────────────────────────────────────

/**
 * Processes a 401 or 403 API response and takes the appropriate action:
 *   - Rejected / banned account   → logout + BannedScreen
 *   - Not-approved account        → logout + BannedScreen
 *   - Domain / role 403           → ignored (returns false)
 *   - Wrong password 401          → ignored (returns false)
 *   - Token expired / force logout → logout + "Session Expired" alert + Login screen
 *
 * Returns true if handled (caller should swallow the error),
 * returns false if the caller should re-throw.
 */
export const handleAuthError = (status: number, data: any): boolean => {
  if (isOnAuthScreen()) return false;

  const t = i18n.t.bind(i18n);
  const msg = (data?.message || "").toLowerCase();
  const code = (data?.code || data?.reason || "").toUpperCase();

  // Resolve account status from various response shapes
  const accStatus = (
    data?.accountStatus ||
    (typeof data?.status === "string" ? data.status : "")
  ).toLowerCase();
  const statusTypeLower = (data?.statusType || "").toLowerCase();

  // ── 1. Rejected / banned ──────────────────────────────────────────────────
  const isRejected =
    accStatus === "rejected" ||
    accStatus === "banned" ||
    statusTypeLower === "rejected" ||
    statusTypeLower === "banned" ||
    code === "OFFICER_REJECTED" ||
    msg === "rejected" ||
    msg === "banned";

  if (isRejected) {
    doLogout();
    navigateToBannedScreen(
      "rejected",
      data?.message || t("Error.This EMP ID is Rejected", "This EMP ID is Rejected")
    );
    return true;
  }

  // ── 2. Not approved ───────────────────────────────────────────────────────
  // Only match exact account-status values, NOT substring of arbitrary messages.
  const isNotApproved =
    accStatus === "not approved" ||
    accStatus === "not_approved" ||
    statusTypeLower === "not_approved" ||
    statusTypeLower === "not approved" ||
    code === "NOT_APPROVED";

  if (isNotApproved) {
    doLogout();
    navigateToBannedScreen(
      "not_approved",
      data?.message || t("Error.This EMP ID is not approved.", "This EMP ID is not approved.")
    );
    return true;
  }

  // ── 3. Domain / role / operational errors — NOT a session issue ───────────
  //    These are business-logic 401/403s that the screen handles itself.
  const isDomainError =
    code === "CENTER_MISMATCH" ||
    code === "NO_OFFICER_ASSIGNED" ||
    code === "STATION_OCCUPIED" ||
    code === "POSITION_BUSY" ||
    code === "POSITION_1_BUSY" ||
    code === "MAIN_CONTAINER_PENDING" ||
    code === "ROLE_NOT_ALLOWED" ||
    code === "UNAUTHORIZED_STATUS" ||
    code === "UNAUTHORIZED_ROLE" ||
    msg.includes("access denied") ||
    msg.includes("not authorized") ||
    msg.includes("role") ||
    msg.includes("center") ||
    msg.includes("centre") ||
    msg.includes("assigned") ||
    msg.includes("occupied") ||
    msg.includes("busy") ||
    msg.includes("driver");

  if (isDomainError) return false;

  // ── 4. Wrong password — NOT a session issue ───────────────────────────────
  const isPasswordError =
    msg.includes("password") ||
    msg.includes("incorrect") ||
    code === "INVALID_PASSWORD" ||
    code === "INCORRECT_PASSWORD";

  if (isPasswordError) return false;

  // ── 5. No token in store → not logged in, nothing to do ──────────────────
  if (!store.getState().auth.token) return false;

  // ── 6. Token expired / session expired / force logout ────────────────────
  const isTokenExpired =
    code === "TOKEN_EXPIRED" ||
    code === "INVALID_TOKEN" ||
    code === "FORCE_LOGOUT" ||
    code === "SESSION_EXPIRED" ||
    data?.type === "force_logout" ||
    msg.includes("jwt") ||
    msg.includes("token expired") ||
    msg.includes("invalid token") ||
    msg.includes("token not found") ||
    msg.includes("force logout") ||
    msg.includes("session expired") ||
    msg.includes("no token provided") ||
    msg.includes("authorization token is missing") ||
    // 401 where the message explicitly mentions token/jwt (empty body NOT included)
    (status === 401 &&
      (msg.includes("token") || msg.includes("jwt")) &&
      !msg.includes("password") &&
      !msg.includes("incorrect") &&
      !msg.includes("not found") &&
      !msg.includes("officer id"));

  if (!isTokenExpired) return false;

  // Session expired — log out and redirect to Login
  doLogout();

  if (!isSessionAlertShown) {
    isSessionAlertShown = true;
    Alert.alert(
      t("Error.Session Expired", "Session Expired"),
      t(
        "Error.Your token has expired. Please log in again.",
        "Your token has expired. Please log in again."
      ),
      [
        {
          text: "OK",
          onPress: () => {
            isSessionAlertShown = false;
            navigateToLogin();
          },
        },
      ],
      { cancelable: false }
    );
  } else {
    navigateToLogin();
  }

  return true;
};

// ─── Axios interceptor setup ──────────────────────────────────────────────────

/**
 * Attaches the auth response interceptor to the given axios instance.
 * Call this ONCE in App.tsx on the default axios instance:
 *
 *   import axios from "axios";
 *   import { setupAxiosInterceptors } from "@/services/apiInterceptor";
 *   setupAxiosInterceptors(axios);
 *
 * Screens that need to bypass the interceptor (e.g. ChangePassword)
 * should create their own isolated instance:
 *   const plainAxios = axios.create();   // created AFTER setup — has no interceptors
 *
 * Note: setupAxiosInterceptors() does NOT patch axios.create or globalThis.fetch.
 * Only the specific instance passed in gets the interceptor.
 */
export const setupAxiosInterceptors = (instance: AxiosInstance): void => {
  // Auto-inject Bearer token on every request
  instance.interceptors.request.use(
    (config) => {
      const token = store.getState().auth.token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Handle 401 / 403 responses globally
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      const res = error.response;
      if (res && (res.status === 401 || res.status === 403)) {
        const isHandled = handleAuthError(res.status, res.data);
        if (isHandled) {
          // Swallow — navigation already triggered
          return new Promise(() => {});
        }
      }
    }
  );
};

export const setupGlobalApiInterceptors = (instance: AxiosInstance = axios): void => {
  setupAxiosInterceptors(instance);
};

// Auto-attach to default axios instance
setupAxiosInterceptors(axios);

// ─── Officer status verification (for socket events) ─────────────────────────

/**
 * Proactively checks if the current officer's account is still active.
 * Called from App.tsx when the socket emits an officer-status-changed event.
 *
 * Uses a raw fetch (bypasses axios interceptors) with its own 401/403 handling
 * to avoid double-processing. Throttled to once per 25 seconds unless forced.
 */
export const verifyOfficerStatus = async (force = false): Promise<boolean> => {
  const now = Date.now();
  if (isCheckingStatus || (!force && now - lastStatusCheckTime < 25000)) {
    return false;
  }

  const token = store.getState().auth.token;
  if (!token || isOnAuthScreen()) return false;

  isCheckingStatus = true;
  lastStatusCheckTime = now;

  try {
    // Use raw fetch — we handle the response manually below
    const response = await fetch(
      `${environment.API_BASE_URL}api/collection-officer/password-update`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.status === 403) {
      const data = await response.json().catch(() => ({}));
      return handleAuthError(403, data);
    }

    if (response.status === 401) {
      const data = await response.json().catch(() => ({}));
      const msg = (data?.message || "").toLowerCase();
      // Only treat 401 as expired if message explicitly says token/jwt
      if (
        msg.includes("token") ||
        msg.includes("jwt expired") ||
        data?.code === "TOKEN_EXPIRED" ||
        data?.code === "INVALID_TOKEN"
      ) {
        return handleAuthError(401, data);
      }
    }

    return false;
  } catch {
    // Network error — do not log out on temporary connectivity loss
    return false;
  } finally {
    isCheckingStatus = false;
  }
};
