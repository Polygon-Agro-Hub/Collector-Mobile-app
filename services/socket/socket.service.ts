import { io, Socket } from "socket.io-client";
import environment from "@/environment/environment";
import { AppState, AppStateStatus } from "react-native";
import { DCMNotificationItem } from "@/services/notification/notification.types";
import store from "@/services/reducxStore";
import axios from "axios";

const LAST_NOTIFIED_ID_KEY = "@collector_dcm_last_notified_id";

type NotificationCallback = (notification: DCMNotificationItem) => void;

class SocketService {
  private socket: Socket | null = null;
  private notificationListeners: Set<NotificationCallback> = new Set();
  private isConnecting: boolean = false;

  // Session-only tracking - resets on every app launch
  private shownBannerUpToId: number = 0;
  private lastKnownUnreadCount: number = -1;

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

  private getToken(): string | null {
    return store.getState().auth.token;
  }

  async connect() {
    if (this.socket?.connected || this.isConnecting) return;
    const token = this.getToken();
    if (!token) return;

    this.isConnecting = true;
    try {
      const baseUrl = environment.API_BASE_URL || "http://localhost:3000";
      const urlMatch = baseUrl.match(/^(https?:\/\/[^/]+)/);
      const socketUrl = urlMatch ? urlMatch[1] : baseUrl;

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
        console.log(`Connected: ${this.socket?.id}`);
        const userId = store.getState().auth.id;
        if (userId) {
          this.socket?.emit("join_user", userId);
          this.socket?.emit("join_officer", userId);
          this.socket?.emit("register_user", userId);
        }
      });

      const handleSocketNotification = (data: DCMNotificationItem) => {
        if (data?.id && data.id > this.shownBannerUpToId) {
          this.shownBannerUpToId = data.id;
        }
        if (typeof data?.unreadCount === "number") {
          this.lastKnownUnreadCount = data.unreadCount;
        } else if (this.lastKnownUnreadCount >= 0) {
          this.lastKnownUnreadCount += 1;
        }
        this.dispatchToListeners(data);
      };

      this.socket.on("new_notification", handleSocketNotification);
      this.socket.on("new_return_otp", handleSocketNotification);
      this.socket.on("handover_return_otp", handleSocketNotification);
      this.socket.on("newNotification", handleSocketNotification);

      this.socket.on("connect_error", () => {
        this.isConnecting = false;
        if (!this.hasLoggedConnectionNotice) {
          this.hasLoggedConnectionNotice = true;
          console.log("Socket not reachable, using REST polling.");
        }
        this.startFallbackPolling();
      });

      this.socket.on("disconnect", (reason) => {
        this.isConnecting = false;
        if (reason !== "io client disconnect") {
          this.startFallbackPolling();
        }
      });

      this.startFallbackPolling();
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
    try { await this.pollNotifications(); } catch (_) {}
  }

  private async pollNotifications() {
    if (this.isPollingActive) return;
    const token = this.getToken();
    if (!token) return;

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
      if (!notifications || notifications.length === 0) {
        this.lastKnownUnreadCount = 0;
        return;
      }

      const unreadItems = notifications.filter(
        (n) => n.readStatus === 0 || n.readStatus === false || (n.readStatus as any) === "0"
      );
      const unreadCount = unreadItems.length;
      const latestUnreadId = unreadItems.length > 0 ? Math.max(...unreadItems.map((n) => n.id || 0)) : 0;

      if (this.lastKnownUnreadCount === -1) {
        this.shownBannerUpToId = Math.max(this.shownBannerUpToId, latestUnreadId);
        this.lastKnownUnreadCount = unreadCount;
        return;
      }

      if (latestUnreadId > this.shownBannerUpToId) {
        const newItems = unreadItems.filter((n) => (n.id || 0) > this.shownBannerUpToId);
        newItems.forEach((item) => {
          this.dispatchToListeners({ ...item, unreadCount });
        });
        this.shownBannerUpToId = latestUnreadId;
      }

      this.lastKnownUnreadCount = unreadCount;
    } catch (_) {
    } finally {
      this.isPollingActive = false;
    }
  }

  private startFallbackPolling() {
    if (this.fallbackPollingTimer) return;
    this.pollNotifications();
    this.fallbackPollingTimer = setInterval(() => { this.pollNotifications(); }, 10000);
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
    this.lastKnownUnreadCount = -1;
    this.shownBannerUpToId = 0;
    this.isPollingActive = false;
  }
}

export default new SocketService();
