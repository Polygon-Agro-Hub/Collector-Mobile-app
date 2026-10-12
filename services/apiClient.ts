/**
 * apiClient.ts
 *
 * The single shared Axios instance for the entire app.
 *
 * WHY THIS EXISTS (replaces monkey patching):
 *   Previously the app patched `axios.create` and `globalThis.fetch` globally
 *   so that every HTTP call would get auth interceptors. That approach is fragile,
 *   hard to debug, and requires maintaining a URL whitelist to prevent false logouts.
 *
 *   This file creates ONE configured axios instance. All screens import it instead
 *   of raw `axios`. The instance:
 *     1. Sets baseURL automatically (no more `${environment.API_BASE_URL}` in every call)
 *     2. Injects the Bearer token on every request automatically (no manual headers)
 *     3. Handles 401/403 responses globally (session expiry, banned account, etc.)
 *
 * USAGE in screens:
 *   import apiClient from "@/services/apiClient";
 *   const res = await apiClient.get("api/collection-officer/something");
 *   const res = await apiClient.post("api/...", body);
 *
 * SPECIAL CASES:
 *   - Login: uses plain `fetch` (no token needed, handles own errors)
 *   - ChangePassword: uses `plainAxios` (needs to bypass auth error handler)
 *   - App.tsx / Login.tsx online-status: uses plain `fetch` (fire-and-forget)
 *   - socket.service.ts syncBaseline: role-specific endpoint, uses its own instance
 */

import axios from "axios";
import store from "@/services/reducxStore";
import { handleAuthError } from "@/services/apiInterceptor";
import environment from "@/environment/environment";

const apiClient = axios.create({
  baseURL: environment.API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ─── Request interceptor — inject Bearer token automatically ─────────────────
apiClient.interceptors.request.use(
  (config) => {
    const token = store.getState().auth.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor — handle auth errors globally ──────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorResponse = error.response;
    if (
      errorResponse &&
      (errorResponse.status === 401 || errorResponse.status === 403)
    ) {
      const isHandled = handleAuthError(errorResponse.status, errorResponse.data);
      if (isHandled) {
        // Swallow the error — auth handler has already navigated away
        return new Promise(() => {});
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
