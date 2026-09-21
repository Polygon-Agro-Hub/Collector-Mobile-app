import { io, Socket } from "socket.io-client";
import environment from "@/environment/environment";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { AppState, AppStateStatus } from "react-native";
import { DCMNotificationItem } from "@/services/notification/notification.types";

// The key Collector uses to persist auth state
const AUTH_STORAGE_KEY = "@auth_state";

type NotificationCallback = (notification: DCMNotificationItem) => void;

class SocketService {
  private socket: Socket | null = null;
  private notificationListeners: Set<NotificationCallback> = new Set();
  private isConnecting: boolean = false;
  private currentUserId: number | null = null;

  // Track the latest ID we have already alerted on this session.
  // -1 = first poll (baseline sync, don't alert on pre-existing items)
  // 0+ = highest ID we have shown a banner for
  private lastSeenId: number = -1;

  private fallbackPollingTimer: any = null;
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

  /** Read token from AsyncStorage (works even before Redux rehydrates) */
  private async getToken(): Promise<string | null> {
    try {
      const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.token) return parsed.token;
      }
    } catch (_) {}
    return null;
  }

  async connect() {
    if (this.socket?.connected || this.isConnecting) return;

    const token = await this.getToken();
    if (!token) return;

    this.isConnecting = true;
    try {
      // Resolve user ID from stored auth state
      if (!this.currentUserId) {
        try {
          const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed?.id) {
              this.currentUserId = Number(parsed.id);
            }
          }
        } catch (_) {}

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

      console.log(`[SocketService] Connecting to: ${socketUrl}`);

      this.socket = io(socketUrl, {
        path: "/socket.io",
        transports: ["polling", "websocket"],
        extraHeaders: { Authorization: `Bearer ${token}` },
        auth: { token },
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 5000,
        timeout: 5000,
      });

      this.socket.on("connect", () => {
        this.isConnecting = false;
        this.hasLoggedConnectionNotice = false;
        this.stopFallbackPolling();
        console.log(`[SocketService] Connected: ${this.socket?.id}, userId: ${this.currentUserId}`);
        if (this.currentUserId) {
          this.socket?.emit("join_user", this.currentUserId);
          this.socket?.emit("join_officer", this.currentUserId);
          this.socket?.emit("register_user", this.currentUserId);
        }
        // Still start polling even when socket works - catches any race conditions
        this.startFallbackPolling(token);
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

      this.socket.on("connect_error", (err) => {
        this.isConnecting = false;
        if (!this.hasLoggedConnectionNotice) {
          this.hasLoggedConnectionNotice = true;
          console.log("[SocketService] Socket not reachable, using REST polling. Error:", err?.message);
        }
        this.startFallbackPolling(token);
      });

      this.socket.on("disconnect", (reason) => {
        this.isConnecting = false;
        if (reason !== "io client disconnect") {
          this.startFallbackPolling(token);
        }
      });

      // Always start polling immediately as a safety net
      this.startFallbackPolling(token);

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
    try { await this.pollNotifications(token); } catch (_) {}
  }

  private async pollNotifications(token: string) {
    if (this.isPollingActive) return;
    this.isPollingActive = true;

    try {
      const response = await axios.get(
        `${environment.API_BASE_URL}api/distribution-manager/notifications`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      const notifications: DCMNotificationItem[] = response.data?.data || [];

      if (!Array.isArray(notifications) || notifications.length === 0) {
        // No notifications at all - just initialize baseline
        if (this.lastSeenId === -1) this.lastSeenId = 0;
        return;
      }

      // Sort by id descending to find the latest
      const sorted = [...notifications].sort((a, b) => (b.id || 0) - (a.id || 0));
      const latestId = sorted[0]?.id || 0;

      console.log(`[SocketService] Poll: total=${notifications.length}, latestId=${latestId}, lastSeenId=${this.lastSeenId}`);

      // ── BASELINE SYNC (first poll this session) ──────────────────────────
      // Don't alert on pre-existing notifications when app opens
      if (this.lastSeenId === -1) {
        this.lastSeenId = latestId;
        console.log("[SocketService] Baseline synced. lastSeenId:", this.lastSeenId);
        return;
      }

      // ── DETECT NEW ITEMS (id > lastSeenId) ───────────────────────────────
      const newItems = notifications.filter((n) => (n.id || 0) > this.lastSeenId);
      if (newItems.length > 0) {
        console.log(`[SocketService] ${newItems.length} new notification(s) detected via poll`);
        newItems.forEach((item) => {
          this.dispatchToListeners(item);
        });
        this.lastSeenId = latestId;
      }

    } catch (err: any) {
      console.warn("[SocketService] Poll error:", err?.message);
    } finally {
      this.isPollingActive = false;
    }
  }

  private startFallbackPolling(token: string) {
    if (this.fallbackPollingTimer) return;
    // Poll immediately
    this.pollNotifications(token);
    // Then every 8 seconds
    this.fallbackPollingTimer = setInterval(() => {
      this.pollNotifications(token);
    }, 8000);
  }

  private stopFallbackPolling() {
    if (this.fallbackPollingTimer) {
      clearInterval(this.fallbackPollingTimer);
      this.fallbackPollingTimer = null;
    }
  }

  onNewNotification(callback: NotificationCallback): () => void {
    this.notificationListeners.add(callback);
    return () => { this.notificationListeners.delete(callback); };
  }

  disconnect() {
    this.stopFallbackPolling();
    if (this.socket) { this.socket.disconnect(); this.socket = null; }
    this.isConnecting = false;
    this.hasLoggedConnectionNotice = false;
    this.lastSeenId = -1;
    this.currentUserId = null;
    this.isPollingActive = false;
  }
}

export default new SocketService();
