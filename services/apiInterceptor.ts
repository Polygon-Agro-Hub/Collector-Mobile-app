import axios, { AxiosInstance } from "axios";
import { Alert } from "react-native";
import store from "@/services/reducxStore";
import { logoutUser } from "@/store/authSlice";
import { navigationRef } from "@/navigationRef";
import socketService from "@/services/socket/socket.service";
import environment from "@/environment/environment";
import { useTranslation } from "react-i18next";

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

  // If already on auth/banned screens, ignore duplicate triggers
  if (
    currentRouteName === "Login" ||
    currentRouteName === "Lanuage" ||
    currentRouteName === "Splash" ||
    currentRouteName === "BannedScreen" ||
    currentRouteName === "Logout"
  ) {
    return false;
  }

  const { t } = useTranslation();

  const msg = (data?.message || "").toLowerCase();
  const code = (data?.code || data?.reason || "").toUpperCase();
  const accStatus = (
    data?.accountStatus ||
    (typeof data?.status === "string" ? data.status : "")
  ).toLowerCase();
  const statusTypeLower = (data?.statusType || "").toLowerCase();

  // 1. Account Rejection / Not Approved check
  const isAccountRejected =
    accStatus === "rejected" ||
    accStatus === "banned" ||
    statusTypeLower === "rejected" ||
    statusTypeLower === "banned" ||
    msg.includes("rejected") ||
    msg.includes("banned");

  const isAccountNotApproved =
    accStatus === "not approved" ||
    statusTypeLower === "not_approved" ||
    statusTypeLower === "not approved" ||
    msg.includes("not approved");

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

    const navigateToBanned = (attemptsLeft = 10) => {
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
      } else if (attemptsLeft > 0) {
        setTimeout(() => navigateToBanned(attemptsLeft - 1), 100);
      }
    };
    navigateToBanned();
    return true;
  }

  const userToken = store.getState().auth.token;
  if (!userToken) {
    return false;
  }

  // 2. Operational / Domain validation errors (e.g. scanning driver, center mismatch, etc.)
  const isDomainValidationError =
    code === "CENTER_MISMATCH" ||
    code === "NO_OFFICER_ASSIGNED" ||
    code === "STATION_OCCUPIED" ||
    code === "POSITION_BUSY" ||
    code === "POSITION_1_BUSY" ||
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

  // 2b. Password validation errors (e.g. incorrect current password on Change Password)
  const isPasswordValidationError =
    msg.includes("password") ||
    msg.includes("incorrect") ||
    code === "INVALID_PASSWORD" ||
    code === "INCORRECT_PASSWORD";

  if (isPasswordValidationError) {
    return false;
  }

  // 3. Token expiration / invalid token / force logout
  const isExplicitTokenError =
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
    msg.includes("authorization token is missing");

  const isTokenExpired =
    isExplicitTokenError ||
    (status === 401 &&
      (msg.includes("token") || msg.includes("jwt") || !msg) &&
      !msg.includes("password") &&
      !msg.includes("incorrect") &&
      !msg.includes("not found") &&
      !msg.includes("user not found") &&
      !msg.includes("officer id"));

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
      t("Error.Session Expired", "Session Expired"),
       t("Error.Your token has expired. Please log in again.", "Your token has expired. Please log in again."),
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
  if (isCheckingStatus || (!force && now - lastStatusCheckTime < 25000)) {
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
      const msg = (data?.message || "").toString().toLowerCase();
      // Only treat 401 as expired if it explicitly says token expired / invalid token
      if (
        msg.includes("token") ||
        msg.includes("jwt expired") ||
        data?.code === "TOKEN_EXPIRED" ||
        data?.code === "INVALID_TOKEN"
      ) {
        return handleAuthError(401, data);
      }
      return false;
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
