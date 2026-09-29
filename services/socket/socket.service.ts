import { io, Socket } from "socket.io-client";
import environment from "@/environment/environment";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { AppState, AppStateStatus } from "react-native";
import { DCMNotificationItem } from "@/services/notification/notification.types";
import store from "@/services/reducxStore";

// The key Collector uses to persist auth state
const AUTH_STORAGE_KEY = "@auth_state";

type NotificationCallback = (notification: DCMNotificationItem) => void;
type OfficerStatusCallback = (data: any) => void;

class SocketService {
  private socket: Socket | null = null;
  private notificationListeners: Set<NotificationCallback> = new Set();
  private officerStatusListeners: Set<OfficerStatusCallback> = new Set();
  private isConnecting: boolean = false;
  private currentUserId: number | null = null;

  private currentEmpId: string | null = null;

  // Track the latest ID we have already alerted on this session.
  // -1 = first poll (baseline sync, don't alert on pre-existing items)
  // 0+ = highest ID we have shown a banner for
  private lastSeenId: number = -1;

  private hasLoggedConnectionNotice: boolean = false;
  private appStateSubscription: any = null;
  private isPollingActive: boolean = false;

  constructor() {
    this.setupAppStateListener();
  }

  private setupAppStateListener() {
    if (this.appStateSubscription) return;
    this.appStateSubscription = AppState.addEventListener(
      "change",
      (state: AppStateStatus) => {
        if (state === "active") {
          this.checkNewNotifications();
        }
      }
    );
  }

  /** Safe base64 payload decode from JWT token */
  private decodeTokenPayload(token: string): any {
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        while (base64.length % 4) {
          base64 += "=";
        }
        if (typeof atob === "function") {
          return JSON.parse(atob(base64));
        }
      }
    } catch (_) {}
    return null;
  }

  /** Read token from Redux, @auth_state, or direct 'token' key in AsyncStorage */
  private async getToken(): Promise<string | null> {
    try {
      // 1. Check Redux store directly
      const reduxToken = store.getState()?.auth?.token;
      if (reduxToken) return reduxToken;

      // 2. Check @auth_state in AsyncStorage
      const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.token) return parsed.token;
      }

      // 3. Fallback to direct 'token' key
      const directToken = await AsyncStorage.getItem("token");
      if (directToken) return directToken;
    } catch (_) {}
    return null;
  }

  async connect() {
    if (this.socket?.connected || this.isConnecting) return;

    const token = await this.getToken();
    if (!token) return;

    this.isConnecting = true;
    try {
      // Resolve user ID & empId from Redux, AsyncStorage, or JWT
      if (!this.currentUserId || !this.currentEmpId) {
        try {
          const authState = store.getState()?.auth;
          if (authState?.id) this.currentUserId = Number(authState.id);
          if (authState?.empId) this.currentEmpId = authState.empId;
        } catch (_) {}

        if (!this.currentUserId || !this.currentEmpId) {
          try {
            const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
            if (stored) {
              const parsed = JSON.parse(stored);
              if (parsed?.id && !this.currentUserId) this.currentUserId = Number(parsed.id);
              if (parsed?.empId && !this.currentEmpId) this.currentEmpId = parsed.empId;
            }
          } catch (_) {}
        }

        if (!this.currentEmpId) {
          try {
            const directEmp = await AsyncStorage.getItem("empid");
            if (directEmp) this.currentEmpId = directEmp;
          } catch (_) {}
        }

        // Try decoding JWT payload directly
        if (!this.currentUserId || !this.currentEmpId) {
          const decoded = this.decodeTokenPayload(token);
          if (decoded) {
            if (decoded.id && !this.currentUserId) this.currentUserId = Number(decoded.id);
            if (decoded.empId && !this.currentEmpId) this.currentEmpId = decoded.empId;
          }
        }

        // Fallback: fetch from API
        if (!this.currentUserId) {
          try {
            const res = await axios.get(
              `${environment.API_BASE_URL}api/distribution-manager/user-profile`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.data?.data?.id) {
              this.currentUserId = res.data.data.id;
            }
          } catch (_) {}
        }
      }

      const baseUrl = environment.API_BASE_URL || "http://localhost:3000";
      const urlMatch = baseUrl.match(/^(https?:\/\/[^/]+)/);
      const socketUrl = urlMatch ? urlMatch[1] : baseUrl;

      console.log(`[SocketService] Connecting to: ${socketUrl} (userId: ${this.currentUserId}, empId: ${this.currentEmpId})`);

      this.socket = io(socketUrl, {
        path: "/socket.io",
        transports: ["polling", "websocket"],
        extraHeaders: { Authorization: `Bearer ${token}` },
        auth: { token },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 3000,
        timeout: 5000,
      });

      this.socket.on("connect", () => {
        this.isConnecting = false;
        this.hasLoggedConnectionNotice = false;
        console.log(`[SocketService] Connected: ${this.socket?.id}, userId: ${this.currentUserId}, empId: ${this.currentEmpId}`);

        const resolvedId = this.currentUserId;
        const resolvedEmpId = this.currentEmpId;

        if (resolvedId) {
          this.socket?.emit("join_user", resolvedId);
          this.socket?.emit("join_officer", resolvedId);
        }
        if (resolvedEmpId) {
          this.socket?.emit("join_user", resolvedEmpId);
          this.socket?.emit("join_officer", resolvedEmpId);
        }
        // Send registration payload matching Govi Transport architecture
        this.socket?.emit("register_user", {
          userId: resolvedId,
          empId: resolvedEmpId,
          token,
        });

        // One-time baseline sync upon connection (Zero polling)
        this.syncBaseline(token);
      });

      const handleSocketNotification = (data: DCMNotificationItem) => {
        console.log("[SocketService] Real-time event received:", JSON.stringify(data));
        // Update high-water mark
        if (data?.id && data.id > Math.max(0, this.lastSeenId)) {
          this.lastSeenId = data.id;
        }
        this.dispatchToListeners(data);
      };

      this.socket.on("new_notification", handleSocketNotification);
      this.socket.on("new_return_otp", handleSocketNotification);
      this.socket.on("handover_return_otp", handleSocketNotification);
      this.socket.on("newNotification", handleSocketNotification);

      // Real-time officer and account status listeners
      const handleOfficerStatusChange = (data: any) => {
        console.log("[SocketService] Real-time officer status event received:", JSON.stringify(data));
        this.dispatchOfficerStatusToListeners(data);
      };

      this.socket.on("officer_status_changed", handleOfficerStatusChange);
      this.socket.on("account_status_changed", handleOfficerStatusChange);
      this.socket.on("user_status_changed", handleOfficerStatusChange);
      this.socket.on("force_logout", handleOfficerStatusChange);
      this.socket.on("session_expired", handleOfficerStatusChange);
      this.socket.on("officer_banned", handleOfficerStatusChange);
      this.socket.on("officer_rejected", handleOfficerStatusChange);

      this.socket.on("connect_error", (err) => {
        this.isConnecting = false;
        if (!this.hasLoggedConnectionNotice) {
          this.hasLoggedConnectionNotice = true;
          console.log("[SocketService] Socket connection error:", err?.message);
        }
      });

      this.socket.on("disconnect", (reason) => {
        this.isConnecting = false;
      });

    } catch (e) {
      this.isConnecting = false;
    }
  }

  private dispatchToListeners(item: DCMNotificationItem) {
    this.notificationListeners.forEach((listener) => {
      try { listener(item); } catch (e) {}
    });
  }

  public async checkNewNotifications() {
    const token = await this.getToken();
    if (!token) return;
    try { await this.syncBaseline(token); } catch (_) {}
  }

  /**
   * One-time baseline sync on connect or foreground to align existing notification high-water mark.
   * All subsequent notifications are delivered in pure real-time over WebSocket (Zero polling).
   */
  private async syncBaseline(token?: string) {
    if (this.isPollingActive) return;
    this.isPollingActive = true;

    try {
      const resolvedToken = token || (await this.getToken());
      if (!resolvedToken) return;

      const response = await axios.get(
        `${environment.API_BASE_URL}api/distribution-manager/notifications`,
        {
          headers: {
            Authorization: `Bearer ${resolvedToken}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          timeout: 8000,
        }
      );

      const notifications: DCMNotificationItem[] = response.data?.data || [];

      if (!Array.isArray(notifications) || notifications.length === 0) {
        if (this.lastSeenId === -1) this.lastSeenId = 0;
        return;
      }

      const sorted = [...notifications].sort((a, b) => (b.id || 0) - (a.id || 0));
      const latestId = sorted[0]?.id || 0;

      if (this.lastSeenId === -1) {
        this.lastSeenId = latestId;
        console.log("[SocketService] Baseline synced. lastSeenId:", this.lastSeenId);
        return;
      }

      const newItems = notifications.filter((n) => (n.id || 0) > this.lastSeenId);
      if (newItems.length > 0) {
        newItems.forEach((item) => this.dispatchToListeners(item));
        this.lastSeenId = latestId;
      }
    } catch (err: any) {
      console.warn("[SocketService] Baseline sync error:", err?.message);
    } finally {
      this.isPollingActive = false;
    }
  }

  private dispatchOfficerStatusToListeners(data: any) {
    this.officerStatusListeners.forEach((listener) => {
      try {
        listener(data);
      } catch (e) {
        console.error("[SocketService] Error in officer status listener:", e);
      }
    });
  }

  onOfficerStatusChanged(callback: OfficerStatusCallback): () => void {
    this.officerStatusListeners.add(callback);
    return () => {
      this.officerStatusListeners.delete(callback);
    };
  }

  onNewNotification(callback: NotificationCallback): () => void {
    this.notificationListeners.add(callback);
    return () => { this.notificationListeners.delete(callback); };
  }

  disconnect() {
    if (this.socket) { this.socket.disconnect(); this.socket = null; }
    this.isConnecting = false;
    this.hasLoggedConnectionNotice = false;
    this.lastSeenId = -1;
    this.currentUserId = null;
    this.isPollingActive = false;
  }
}

export default new SocketService();
