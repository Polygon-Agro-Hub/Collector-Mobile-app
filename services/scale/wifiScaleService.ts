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
  private dataWatchdogTimeout: NodeJS.Timeout | null = null;
  private readonly DATA_TIMEOUT_MS = 3500;

  constructor() {
    // Wrap in try/catch so a failed auto-connect never prevents app startup
    try {
      this.initSavedScale();
    } catch (err) {
      console.warn("Scale auto-connect skipped:", err);
    }
    this.initNetInfoListener();
  }

  private resetDataWatchdog() {
    if (this.dataWatchdogTimeout) {
      clearTimeout(this.dataWatchdogTimeout);
    }
    this.dataWatchdogTimeout = setTimeout(() => {
      // If connected but no scale data received for DATA_TIMEOUT_MS, reset weight to 0
      if (this.isConnected && this.currentWeight !== 0) {
        console.log("[WifiScaleService] No scale data received recently, setting weight to 0");
        this.currentWeight = 0;
        this.notifyListeners();
      }
    }, this.DATA_TIMEOUT_MS);
  }

  private stopDataWatchdog() {
    if (this.dataWatchdogTimeout) {
      clearTimeout(this.dataWatchdogTimeout);
      this.dataWatchdogTimeout = null;
    }
  }

  private initNetInfoListener() {
    NetInfo.addEventListener((state) => {
      // Scale is only reachable over Wi-Fi LAN.
      // If Wi-Fi is turned off or network disconnected, disconnect scale.
      const isWifi = state.type === "wifi" || (state.isWifiEnabled === true && state.isConnected === true);
      if (!isWifi) {
        if (this.isConnected || this.isConnecting) {
          console.log("[WifiScaleService] Wi-Fi lost/disconnected - disconnecting scale");
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

      // In Expo Go, physical scale / bridge IP defaults to 192.168.1.30
      if (Constants.appOwnership === "expo" && (targetIp === "192.168.1.23" || targetIp === "192.168.1.13")) {
        targetIp = "192.168.1.30";
        targetPort = 3001;
      }

      try {
        await this.connectWifiScale(targetIp, targetPort);
      } catch (_) {
        this.currentScale = { ...saved, connected: false };
        this.isConnected = false;
        this.currentWeight = 0;
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
   * The FIRST "kg" value in each SDT line is the measured weight (e.g. 8.3kg).
   * The SECOND "kg" value is tare (e.g. 0.0kg) — never read it.
   *
   * TCP chunks may contain multiple packets or lines. We split by newlines and inspect
   * from newest (bottom) to oldest line to find the most recent valid packet,
   * matching its FIRST "kg" value.
   */
  private parseScaleData(rawChunk: string) {
    if (!rawChunk) return;

    this.resetDataWatchdog();

    // Split chunk into lines to handle concatenated TCP packets and get latest reading
    const lines = rawChunk.split(/[\r\n]+/);
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (!line) continue;

      // Match the first kg value on this line (measured weight)
      const match = line.match(/([+-]?\s*\d+(?:[\.,]\d+)?)\s*kg/i);
      if (match && match[1]) {
        let val = parseFloat(match[1].replace(/\s+/g, "").replace(",", "."));
        if (!isNaN(val)) {
          // Clamp negative drift or values extremely close to zero
          if (Math.abs(val) < 0.005 || val < 0 || Object.is(val, -0)) {
            val = 0;
          }
          if (val !== this.currentWeight) {
            this.currentWeight = val;
            this.notifyListeners();
          }
          // Found latest valid packet on this chunk, return early
          return;
        }
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
            this.resetDataWatchdog();

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

        client.on("timeout", () => {
          console.warn("Scale TCP socket timeout (no data received)");
          this.stopDataWatchdog();
          this.isConnected = false;
          this.currentWeight = 0;
          if (this.currentScale) this.currentScale.connected = false;
          this.notifyListeners();
          this.closeSocket();
        });

        client.on("error", (err: any) => {
          console.error("Scale TCP socket error:", err);
          this.stopDataWatchdog();
          this.currentWeight = 0;
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
          this.stopDataWatchdog();
          this.isConnected = false;
          this.currentWeight = 0;
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
            let newWeight = parseFloat(data.weight);
            if (isNaN(newWeight) || Math.abs(newWeight) < 0.005 || newWeight < 0 || Object.is(newWeight, -0)) {
              newWeight = 0;
            }
            if (newWeight !== this.currentWeight) {
              this.currentWeight = newWeight;
              this.notifyListeners();
            }
          }
          if (data.connected === false || data.stale === true) {
            if (this.currentWeight !== 0) {
              this.currentWeight = 0;
              this.notifyListeners();
            }
          }
          if (!this.isConnected) {
            this.isConnected = true;
            this.notifyListeners();
          }
        } else {
          this.failedPollCount++;
          if (this.failedPollCount >= 6 && this.isConnected) {
            this.isConnected = false;
            this.currentWeight = 0;
            if (this.currentScale) this.currentScale.connected = false;
            this.notifyListeners();
          }
        }
      } catch (_) {
        this.failedPollCount++;
        // Only mark disconnected after 6 consecutive failed requests (3 seconds)
        if (this.failedPollCount >= 6 && this.isConnected) {
          this.isConnected = false;
          this.currentWeight = 0;
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
    this.stopDataWatchdog();
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