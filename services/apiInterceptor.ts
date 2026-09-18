import axios, { AxiosInstance } from "axios";
import { Alert } from "react-native";
import store from "@/services/reducxStore";
import { logoutUser } from "@/store/authSlice";
import { navigationRef } from "@/navigationRef";
import socketService from "@/services/socket/socket.service";
import environment from "@/environment/environment";

let isSessionAlertShown = false;
let isCheckingStatus = false;
let lastStatusCheckTime = 0;
let isInterceptorsSetup = false;

/**
 * Handles HTTP 401 and 403 responses globally.
 * Returns true if the error was handled (e.g. account banned or session expired),
 * or false if it is a domain validation error or unhandled.
 */
export const handleAuthError = (status: number, data: any): boolean => {
  let currentRouteName = "";
  if (navigationRef.isReady()) {
    const route = navigationRef.getCurrentRoute() as any;
    currentRouteName = route?.name || "";
  }

  const userToken = store.getState().auth.token;
  if (
    !userToken ||
    currentRouteName === "Login" ||
    currentRouteName === "Lanuage" ||
    currentRouteName === "Splash" ||
    currentRouteName === "BannedScreen" ||
    currentRouteName === "Logout"
  ) {
    return false;
  }

  const msg = (data?.message || "").toLowerCase();
  const code = (data?.code || data?.reason || "").toUpperCase();
  const accStatus = (data?.accountStatus || "").toLowerCase();

  // 1. Account Rejection / Not Approved check
  const isAccountRejected =
    accStatus === "rejected" ||
    msg.includes("this account is rejected") ||
    msg.includes("account is rejected");

  const isAccountNotApproved =
    accStatus === "not approved" ||
    msg.includes("this account is not approved") ||
    msg.includes("account is not approved");

  if (isAccountRejected || isAccountNotApproved) {
    try {
      store.dispatch(logoutUser());
      socketService.disconnect();
    } catch (e) {
      console.error("Error logging out rejected officer:", e);
    }

    const statusType = isAccountRejected ? "rejected" : "not_approved";
    const message = isAccountRejected
      ? data?.message || "This EMP ID is Rejected"
      : data?.message || "This EMP ID is not approved.";

    if (navigationRef.isReady()) {
      navigationRef.reset({
        index: 0,
        routes: [
          {
            name: "BannedScreen",
            params: {
              statusType,
              message,
            },
          },
        ],
      });
    }
    return true;
  }

  // 2. Operational / Domain validation errors (e.g. scanning driver, center mismatch, etc.)
  const isDomainValidationError =
    code === "CENTER_MISMATCH" ||
    code === "NO_OFFICER_ASSIGNED" ||
    code === "STATION_OCCUPIED" ||
    code === "MAIN_CONTAINER_PENDING" ||
    code === "OFFICER_REJECTED" ||
    code === "ROLE_NOT_ALLOWED" ||
    code === "UNAUTHORIZED_STATUS" ||
    code === "UNAUTHORIZED_ROLE" ||
    msg.includes("center") ||
    msg.includes("centre") ||
    msg.includes("assigned") ||
    msg.includes("occupied") ||
    msg.includes("busy") ||
    msg.includes("driver access has been rejected") ||
    msg.includes("driver");

  if (isDomainValidationError) {
    return false;
  }

  // 3. Token expiration / invalid token
  const isTokenExpired =
    code === "TOKEN_EXPIRED" ||
    code === "INVALID_TOKEN" ||
    msg.includes("jwt expired") ||
    msg.includes("token expired") ||
    msg.includes("invalid token") ||
    msg.includes("token not found") ||
    status === 401;

  if (!isTokenExpired) {
    return false;
  }

  try {
    store.dispatch(logoutUser());
    socketService.disconnect();
  } catch (e) {
    console.error("Error dispatching logout on token expiration:", e);
  }

  if (!isSessionAlertShown) {
    isSessionAlertShown = true;
    Alert.alert(
      "Session Expired",
      "Your token has expired. Please log in again.",
      [
        {
          text: "OK",
          onPress: () => {
            isSessionAlertShown = false;
            if (navigationRef.isReady()) {
              navigationRef.reset({
                index: 0,
                routes: [{ name: "Login" }],
              });
            }
          },
        },
      ],
      { cancelable: false }
    );
  } else {
    if (navigationRef.isReady()) {
      navigationRef.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    }
  }

  return true;
};

/**
 * Attaches the auth response interceptor to any Axios instance.
 */
export const attachAuthInterceptor = (instance: AxiosInstance) => {
  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const errorResponse = error.response;
      if (
        errorResponse &&
        (errorResponse.status === 401 || errorResponse.status === 403)
      ) {
        const isHandled = handleAuthError(
          errorResponse.status,
          errorResponse.data
        );
        if (isHandled) {
          return new Promise(() => {});
        }
      }
      return Promise.reject(error);
    }
  );
};

/**
 * Proactively verifies if the current logged-in officer is still approved in the database.
 * If rejected or banned, automatically logs them out and redirects to BannedScreen.
 */
export const verifyOfficerStatus = async (force: boolean = false): Promise<boolean> => {
  const now = Date.now();
  if (isCheckingStatus || (!force && now - lastStatusCheckTime < 3000)) {
    return false;
  }

  const token = store.getState().auth.token;
  if (!token) {
    return false;
  }

  let currentRouteName = "";
  if (navigationRef.isReady()) {
    const route = navigationRef.getCurrentRoute() as any;
    currentRouteName = route?.name || "";
  }
  if (
    currentRouteName === "Login" ||
    currentRouteName === "Lanuage" ||
    currentRouteName === "Splash" ||
    currentRouteName === "BannedScreen" ||
    currentRouteName === "Logout"
  ) {
    return false;
  }

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

    if (response.status === 403) {
      const data = await response.json().catch(() => ({}));
      return handleAuthError(403, data);
    } else if (response.status === 401) {
      const data = await response.json().catch(() => ({}));
      return handleAuthError(401, data);
    }

    return false;
  } catch (err) {
    // Network or offline error: do not force logout on temporary network loss
    return false;
  } finally {
    isCheckingStatus = false;
  }
};

/**
 * Initializes global interceptors for default axios, patched axios.create, and fetch.
 */
export const setupGlobalApiInterceptors = () => {
  if (isInterceptorsSetup) return;
  isInterceptorsSetup = true;

  // 1. Intercept default axios
  attachAuthInterceptor(axios);

  // 2. Monkeypatch axios.create so all screen modules get the interceptor
  const originalAxiosCreate = axios.create;
  axios.create = function (config?: any) {
    const instance = originalAxiosCreate.call(this, config);
    attachAuthInterceptor(instance);
    return instance;
  };

  // 3. Monkeypatch global fetch
  const originalFetch = (globalThis as any).fetch;
  (globalThis as any).fetch = async (...args: any[]) => {
    const response = await originalFetch(...args);

    if (response.status === 401 || response.status === 403) {
      try {
        const cloned = response.clone();
        const data = await cloned.json();
        handleAuthError(response.status, data);
      } catch (e) {
        handleAuthError(response.status, {});
      }
    }

    return response;
  };
};

// Auto-run interceptor setup when this module is loaded
setupGlobalApiInterceptors();
