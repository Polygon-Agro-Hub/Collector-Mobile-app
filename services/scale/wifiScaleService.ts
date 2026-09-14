import Constants from "expo-constants";
import NetInfo from "@react-native-community/netinfo";
import i18n from "i18next";
import { SavedScale, saveSelectedScale, getSavedScale, clearSavedScale } from "@/utils/scale/scale-storage";

export interface ScaleStatus {
  connected: boolean;
  scale: SavedScale | null;
  currentWeight: number;
  unit: string;
  isStable: boolean;
  error?: string | null;
}

type ScaleWeightListener = (status: ScaleStatus) => void;

/**
 * Lazily resolve react-native-tcp-socket only when a connection is attempted.
 *
 * In Expo Go (appOwnership === "expo") the native TcpSockets module is absent.
 * react-native-tcp-socket's Globals.js calls `new NativeEventEmitter(...)` at
 * module load time, which calls `invariant(...)` and throws before our
 * try/catch can intercept it. So we must skip the require entirely in Expo Go.
 */
function getTcpSocket(): any {
  // Never attempt to load the native module inside the Expo Go sandbox
  const isExpoGo = Constants.appOwnership === "expo";
  if (isExpoGo) {
    return null;
  }

  try {
    const mod = require("react-native-tcp-socket");
    const TcpSocket = mod.default || mod;
    if (TcpSocket && typeof TcpSocket.createConnection === "function") {
      return TcpSocket;
    }
    return null;
  } catch (_) {
    return null;
  }
}

class WifiScaleService {
  private currentScale: SavedScale | null = null;
  private currentWeight: number = 0.0;
  private isConnected: boolean = false;
  private listeners: Set<ScaleWeightListener> = new Set();
  private tcpClient: any = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private isConnecting: boolean = false;
  private pendingConnectionReject: ((err: any) => void) | null = null;

  constructor() {
    // Wrap in try/catch so a failed auto-connect never prevents app startup
    try {
      this.initSavedScale();
    } catch (err) {
      console.warn("Scale auto-connect skipped:", err);
    }
    this.initNetInfoListener();
  }

  private initNetInfoListener() {
    NetInfo.addEventListener((state) => {
      // Only disconnect if the device is explicitly offline / disconnected.
      // Do NOT check state.isWifiEnabled, because on Android isWifiEnabled returns false
      // when location permission is denied ("Don't Allow"), even if Wi-Fi is actively connected.
      const isOffline = state.isConnected === false || state.type === "none";
      if (isOffline) {
        if (this.isConnected || this.isConnecting) {
          console.log("[WifiScaleService] Network disconnected - disconnecting scale");
          this.closeSocket();
          this.stopHttpPolling();
          this.isConnected = false;
          this.isConnecting = false;
          if (this.currentScale) {
            this.currentScale.connected = false;
          }
          this.currentWeight = 0;
          this.notifyListeners();
        }
      }
    });
  }

  private async initSavedScale() {
    const saved = await getSavedScale();
    if (saved && saved.ip) {
      let targetIp = saved.ip;
      let targetPort = saved.port || 33581;

      // In Expo Go, the physical scale IP (192.168.1.23:33581) cannot be fetched directly via HTTP.
      // Automatically redirect to the PC bridge (192.168.1.13:3001).
      if (Constants.appOwnership === "expo" && targetIp === "192.168.1.23") {
        targetIp = "192.168.1.13";
        targetPort = 3001;
      }

      try {
        await this.connectWifiScale(targetIp, targetPort);
      } catch (_) {
        this.currentScale = { ...saved, connected: false };
        this.isConnected = false;
        this.notifyListeners();
      }
    }
  }

  /**
   * Parse raw TCP chunk from the BUDRY MFD-300 scale.
   *
   * Packet format:
   *   XD1\tSDT
   *   SDT\t1\t1\t0\t0\t0\t0,0\t0,0\t0,0\t0,0\t8.3kg\t0.0kg
   *   END\tSDT
   *
   * The FIRST "kg" value in the packet is always the measured weight (e.g. 8.3kg).
   * The SECOND "kg" value is the tare weight (e.g. 0.0kg) — never read it.
   *
   * Root cause of the old 8.3 → 0 oscillation:
   *   When weight was stable (8.3 === currentWeight), the original code did NOT return
   *   early, fell through to a secondary loop, and found the tare 0.0kg instead.
   *
   * Fix: match the FIRST kg in the raw chunk and ALWAYS return — even when the value
   * hasn't changed — so we never accidentally read the tare column.
   */
  private parseScaleData(rawChunk: string) {
    if (!rawChunk) return;

    const match = rawChunk.match(/([+-]?\s*\d+(?:\.\d+)?)\s*kg/i);
    if (match && match[1]) {
      const val = parseFloat(match[1].replace(/\s+/g, ""));
      if (!isNaN(val)) {
        if (val !== this.currentWeight) {
          this.currentWeight = val;
          this.notifyListeners();
        }
        // ← Always return here. Never fall through to secondary kg values (tare).
        return;
      }
    }
  }

  /**
   * Connect to Wi-Fi scale using TCP Raw Socket (port 33581 or custom)
   */
  async connectWifiScale(ip: string, port: number = 33581): Promise<ScaleStatus> {
    const cleanIp = ip.trim();
    if (!cleanIp) {
      throw new Error(i18n.t("WifiScaleService.InvalidIpError"));
    }

    // Clean up any previous socket or polling
    this.closeSocket();
    this.stopHttpPolling();

    // Resolve native TCP socket lazily — returns null in Expo Go
    const TcpSocket = getTcpSocket();

    if (!TcpSocket) {
      // In Expo Go or if native module is absent, fall back to HTTP bridge
      return this.connectHttpFallback(cleanIp, port);
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      let isSettled = false;

      this.pendingConnectionReject = (err: any) => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timeoutId);
          this.isConnecting = false;
          this.isConnected = false;
          this.notifyListeners();
          reject(err);
        }
      };

      const timeoutId = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          this.pendingConnectionReject = null;
          this.closeSocket();
          this.isConnecting = false;
          this.isConnected = false;
          this.notifyListeners();
          reject(
            new Error(
              i18n.t("WifiScaleService.ConnectionTimedOut", { ip: cleanIp, port })
            )
          );
        }
      }, 7000);

      try {
        const client = TcpSocket.createConnection(
          {
            host: cleanIp,
            port: port,
            timeout: 6000,
          },
          () => {
            if (isSettled) return;
            isSettled = true;
            this.pendingConnectionReject = null;
            clearTimeout(timeoutId);

            this.tcpClient = client;
            this.isConnected = true;
            this.isConnecting = false;

            const scaleConfig: SavedScale = {
              id: `wifi_${cleanIp}_${port}`,
              name: "BUDRY MFD-300",
              type: "wifi",
              ip: cleanIp,
              port,
              connected: true,
              lastWeight: this.currentWeight,
            };

            this.currentScale = scaleConfig;
            saveSelectedScale(scaleConfig).catch(() => {});
            this.notifyListeners();

            resolve(this.getStatus());
          }
        );

        client.on("data", (data: any) => {
          const str = typeof data === "string" ? data : data.toString("utf8");
          this.parseScaleData(str);
        });

        client.on("error", (err: any) => {
          console.error("Scale TCP socket error:", err);
          if (!isSettled) {
            isSettled = true;
            this.pendingConnectionReject = null;
            clearTimeout(timeoutId);
            this.closeSocket();
            this.isConnecting = false;
            this.isConnected = false;
            this.notifyListeners();
            reject(
              new Error(
                i18n.t("WifiScaleService.ConnectionRefused", {
                  ip: cleanIp,
                  port,
                  reason: err.message || i18n.t("WifiScaleService.ConnectionRefusedDefaultReason"),
                })
              )
            );
          } else {
            this.isConnected = false;
            if (this.currentScale) this.currentScale.connected = false;
            this.notifyListeners();
          }
        });

        client.on("close", () => {
          this.isConnected = false;
          if (this.currentScale) this.currentScale.connected = false;
          this.notifyListeners();
        });
      } catch (err: any) {
        if (!isSettled) {
          isSettled = true;
          this.pendingConnectionReject = null;
          clearTimeout(timeoutId);
          this.isConnecting = false;
          this.closeSocket();
          reject(err);
        }
      }
    });
  }

  /**
   * HTTP Bridge Fallback — for Expo Go development
   *
   * In Expo Go, native TCP sockets are unavailable. Run `scale-bridge.js` on
   * your PC (same Wi-Fi as the phone) and enter the PC's IP + port 3001.
   * The bridge connects to the scale via TCP and serves the weight over HTTP.
   */
  private async connectHttpFallback(ip: string, port: number): Promise<ScaleStatus> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    let res: Response;
    try {
      res = await fetch(`http://${ip}:${port}/api/weight`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      throw new Error(i18n.t("WifiScaleService.BridgeUnreachable", { ip, port }));
    }

    if (!res.ok) {
      throw new Error(i18n.t("WifiScaleService.BridgeBadStatus", { ip, port, status: res.status }));
    }

    let data: any;
    try {
      data = await res.json();
    } catch {
      throw new Error(i18n.t("WifiScaleService.BridgeInvalidResponse", { ip, port }));
    }

    // Bridge is reachable — mark as connected even if scale is still reconnecting
    this.isConnected = true;
    if (data.weight !== undefined) {
      this.currentWeight = parseFloat(data.weight) || 0;
    }

    const scaleConfig: SavedScale = {
      id: `wifi_bridge_${ip}_${port}`,
      name: "BUDRY MFD-300",
      type: "wifi",
      ip,
      port,
      connected: true,
      lastWeight: this.currentWeight,
    };
    this.currentScale = scaleConfig;
    await saveSelectedScale(scaleConfig);
    this.startHttpPolling();
    this.notifyListeners();
    return this.getStatus();
  }

  private failedPollCount = 0;

  private startHttpPolling() {
    this.stopHttpPolling();
    this.failedPollCount = 0;
    this.pollInterval = setInterval(async () => {
      if (!this.isConnected || !this.currentScale?.ip) return;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        const res = await fetch(
          `http://${this.currentScale.ip}:${this.currentScale.port}/api/weight`,
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);
        if (res.ok) {
          this.failedPollCount = 0;
          const data = await res.json();
          if (data.weight !== undefined) {
            const newWeight = parseFloat(data.weight);
            if (!isNaN(newWeight) && newWeight !== this.currentWeight) {
              this.currentWeight = newWeight;
              this.notifyListeners();
            }
          }
          if (!this.isConnected) {
            this.isConnected = true;
            this.notifyListeners();
          }
        } else {
          this.failedPollCount++;
        }
      } catch (_) {
        this.failedPollCount++;
        // Only mark disconnected after 6 consecutive failed requests (3 seconds)
        if (this.failedPollCount >= 6 && this.isConnected) {
          this.isConnected = false;
          if (this.currentScale) this.currentScale.connected = false;
          this.notifyListeners();
        }
      }
    }, 500);
  }

  private stopHttpPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private closeSocket() {
    if (this.pendingConnectionReject) {
      const rejectFn = this.pendingConnectionReject;
      this.pendingConnectionReject = null;
      rejectFn(new Error(i18n.t("WifiScaleService.Disconnected") || "Scale connection closed"));
    }
    if (this.tcpClient) {
      try {
        this.tcpClient.destroy();
      } catch (_) {}
      this.tcpClient = null;
    }
  }

  /**
   * Disconnect from Wi-Fi scale
   */
  async disconnectScale(): Promise<void> {
    this.closeSocket();
    this.stopHttpPolling();
    this.isConnected = false;
    if (this.currentScale) {
      this.currentScale.connected = false;
    }
    await clearSavedScale();
    this.currentScale = null;
    this.currentWeight = 0;
    this.notifyListeners();
  }

  /**
   * Get current scale connection status
   */
  getStatus(): ScaleStatus {
    return {
      connected: this.isConnected,
      scale: this.currentScale,
      currentWeight: this.currentWeight,
      unit: "kg",
      isStable: true,
    };
  }

  /**
   * Subscribe to weight & status updates
   */
  subscribe(listener: ScaleWeightListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const status = this.getStatus();
    this.listeners.forEach((listener) => {
      try {
        listener(status);
      } catch (err) {
        console.error("Error in scale listener:", err);
      }
    });
  }
}

export const wifiScaleService = new WifiScaleService();