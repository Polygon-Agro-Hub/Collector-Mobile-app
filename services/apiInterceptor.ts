/**
 * apiInterceptor.ts
 *
 * Global auth error handling for all axios requests.
 *
 * Exports:
 *   handleAuthError(status, data)       — interprets 401/403 and takes action
 *   verifyOfficerStatus(force?)         — called on app foreground to re-check status
 *   setupGlobalApiInterceptors()        — call ONCE in App.tsx to attach to default axios
 */

import { Alert } from "react-native";
import store from "@/services/reducxStore";
import { logoutUser } from "@/store/authSlice";
import { navigationRef } from "@/navigationRef";
import socketService from "@/services/socket/socket.service";
import environment from "@/environment/environment";
import i18n from "@/i18n/i18n";
import axios, { AxiosInstance } from "axios";

// ─── Guard flags ──────────────────────────────────────────────────────────────
let isSessionAlertShown = false;
let isCheckingStatus = false;
let lastStatusCheckTime = 0;
const STATUS_CHECK_THROTTLE_MS = 15_000; // min gap between background re-checks

// ─── Auth screens — errors on these screens are silently ignored ──────────────
const AUTH_SCREENS = ["Login", "Lanuage", "Splash", "BannedScreen", "Logout"];

const isOnAuthScreen = (): boolean => {
  if (!navigationRef.isReady()) return true;
  const name = (navigationRef.getCurrentRoute() as any)?.name || "";
  return AUTH_SCREENS.includes(name);
};

// ─── Navigation helpers ───────────────────────────────────────────────────────

export const doLogout = (): void => {
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
 *
 *   Rejected / banned account     → doLogout + BannedScreen
 *   Not-approved account          → doLogout + BannedScreen
 *   Domain / role / business 403  → ignored (returns false — screen handles it)
 *   Wrong password 401            → ignored (returns false)
 *   Token expired / invalid       → doLogout + "Session Expired" alert + Login
 *   503 (DB down)                 → ignored (returns false — transient, don't log out)
 *
 * Returns true  → error handled (caller should swallow it).
 * Returns false → caller should re-throw.
 */
export const handleAuthError = (status: number, data: any): boolean => {
  if (isOnAuthScreen()) return false;

  const t = i18n.t.bind(i18n);
  const msg = (data?.message || "").toLowerCase();
  const reason = (data?.code || data?.reason || "").toUpperCase();
  const statusType = (data?.statusType || "").toLowerCase();
  const accStatus = (
    data?.accountStatus ||
    (typeof data?.status === "string" ? data.status : "")
  ).toLowerCase();

  // ── 1. Rejected / Banned ──────────────────────────────────────────────────
  if (
    accStatus === "rejected" ||
    accStatus === "banned" ||
    statusType === "rejected" ||
    statusType === "banned"
  ) {
    // Navigate FIRST — then clear auth state after navigation settles.
    // If doLogout() runs first, jobRole becomes null and withRoleGuard
    // redirects to Login before BannedScreen is reached.
    navigateToBannedScreen(
      "rejected",
      data?.message || t("Error.This EMP ID is Rejected", "This account has been rejected.")
    );
    setTimeout(() => doLogout(), 300);
    return true;
  }

  // ── 2. Not Approved ───────────────────────────────────────────────────────
  if (
    accStatus === "not approved" ||
    accStatus === "not_approved" ||
    statusType === "not_approved" ||
    reason === "NOT_APPROVED"
  ) {
    // Same: navigate first, then clear auth state.
    navigateToBannedScreen(
      "not_approved",
      data?.message || t("Error.This EMP ID is not approved.", "This account is not approved.")
    );
    setTimeout(() => doLogout(), 300);
    return true;
  }

  // ── 3. DB temporarily unavailable (503) ── never log out for this ─────────
  if (status === 503) return false;

  // ── 4. Business / domain / role errors — screen handles these itself ──────
  if (
    reason === "CENTER_MISMATCH" ||
    reason === "NO_OFFICER_ASSIGNED" ||
    reason === "STATION_OCCUPIED" ||
    reason === "POSITION_BUSY" ||
    reason === "POSITION_1_BUSY" ||
    reason === "MAIN_CONTAINER_PENDING" ||
    reason === "ROLE_NOT_ALLOWED" ||
    reason === "UNAUTHORIZED_ROLE" ||
    msg.includes("access denied") ||
    msg.includes("not authorized") ||
    msg.includes("role") ||
    msg.includes("center") ||
    msg.includes("centre") ||
    msg.includes("assigned") ||
    msg.includes("occupied") ||
    msg.includes("busy") ||
    msg.includes("driver")
  ) {
    return false;
  }

  // ── 5. Wrong password — not a session issue ───────────────────────────────
  if (
    msg.includes("password") ||
    msg.includes("incorrect") ||
    reason === "INVALID_PASSWORD"
  ) {
    return false;
  }

  // ── 6. No token in store → not logged in ─────────────────────────────────
  if (!store.getState().auth.token) return false;

  // ── 7. Token expired / invalid / missing ─────────────────────────────────
  const isTokenIssue =
    reason === "TOKEN_EXPIRED" ||
    reason === "INVALID_TOKEN" ||
    reason === "SESSION_EXPIRED" ||
    statusType === "not_found" ||
    msg.includes("jwt") ||
    msg.includes("token expired") ||
    msg.includes("invalid or expired token") ||
    msg.includes("invalid token") ||
    msg.includes("no token provided") ||
    msg.includes("token is missing officer id") ||
    (status === 401 &&
      (msg.includes("token") || msg.includes("jwt")) &&
      !msg.includes("password") &&
      !msg.includes("incorrect") &&
      !msg.includes("not found"));

  if (!isTokenIssue) return false;

  doLogout();
  if (!isSessionAlertShown) {
    isSessionAlertShown = true;
    Alert.alert(
      t("Error.Session Expired", "Session Expired"),
      t(
        "Error.Your token has expired. Please log in again.",
        "Your session has expired. Please log in again."
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

const setupAxiosInterceptors = (instance: AxiosInstance): void => {
  // Auto-inject Bearer token on all internal requests
  instance.interceptors.request.use(
    (config) => {
      const isExternal =
        config.url?.startsWith("http") &&
        !config.url?.includes(environment.API_BASE_URL);

      if (!isExternal && !config.headers.Authorization) {
        const token = store.getState().auth.token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Handle 401 / 403 globally (skip external API calls)
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      const res = error.response;
      const isExternal =
        error.config?.url?.startsWith("http") &&
        !error.config?.url?.includes(environment.API_BASE_URL);

      if (!isExternal && res && (res.status === 401 || res.status === 403)) {
        const handled = handleAuthError(res.status, res.data);
        if (handled) {
          // Navigation triggered — swallow the error so the screen doesn't crash
          return new Promise(() => {});
        }
      }
      return Promise.reject(error);
    }
  );
};

/**
 * Call ONCE in App.tsx to attach auth interceptors to the default axios instance.
 */
export const setupGlobalApiInterceptors = (): void => {
  setupAxiosInterceptors(axios);
};

// ─── Officer status verification (called on app foreground) ───────────────────

/**
 * Proactively checks if the logged-in officer's account is still active.
 * Called from App.tsx when the app returns from background (AppState → active).
 *
 * - Uses raw fetch (bypasses axios interceptors) to avoid double-handling.
 * - Throttled: at most once every STATUS_CHECK_THROTTLE_MS, unless force=true.
 * - On 403 → handleAuthError → logout + BannedScreen if rejected/not-approved.
 * - On 503 (DB down) or network error → silently skip, do NOT log the user out.
 */
export const verifyOfficerStatus = async (force = false): Promise<boolean> => {
  if (isCheckingStatus) return false;

  const now = Date.now();
  if (!force && now - lastStatusCheckTime < STATUS_CHECK_THROTTLE_MS) return false;

  const token = store.getState().auth.token;
  if (!token || isOnAuthScreen()) return false;

  isCheckingStatus = true;
  lastStatusCheckTime = now;

  try {
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

    // 403 → rejected / not-approved → doLogout + BannedScreen
    if (response.status === 403) {
      const data = await response.json().catch(() => ({}));
      return handleAuthError(403, data);
    }

    // 401 → token expired/invalid → Session Expired → Login
    if (response.status === 401) {
      const data = await response.json().catch(() => ({}));
      return handleAuthError(401, data);
    }

    // 503 → DB temporarily down — do NOT log out
    return false;
  } catch {
    // Network error — do not log out on temporary connectivity loss
    return false;
  } finally {
    isCheckingStatus = false;
  }
};
