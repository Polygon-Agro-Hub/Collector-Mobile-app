import Constants from "expo-constants";
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

  constructor() {
    // Wrap in try/catch so a failed auto-connect never prevents app startup
    try {
      this.initSavedScale();
    } catch (err) {
      console.warn("Scale auto-connect skipped:", err);
    }
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
   * Parse incoming raw scale data stream (e.g. "SDT\t1\t...\t0.0kg\t0.0kg")
   */
  private parseScaleData(rawChunk: string) {
    if (!rawChunk) return;

    // Pattern 1: Matches "0.0kg" or " 12.35 kg" (BUDRY / SDT scale format)
    const matchKg = rawChunk.match(/([+-]?\s*\d+(?:\.\d+)?)\s*kg/i);
    if (matchKg && matchKg[1]) {
      const parsed = parseFloat(matchKg[1].replace(/\s+/g, ""));
      if (!isNaN(parsed) && parsed !== this.currentWeight) {
        this.currentWeight = parsed;
        this.notifyListeners();
        return;
      }
    }

    // Pattern 2: Tab-delimited tokens in SDT line
    const lines = rawChunk.split(/\r?\n/);
    for (const line of lines) {
      if (line.includes("SDT")) {
        const parts = line.split("\t");
        for (const part of parts) {
          const trimmed = part.trim();
          if (trimmed.toLowerCase().endsWith("kg")) {
            const val = parseFloat(trimmed.replace(/kg/i, "").trim());
            if (!isNaN(val) && val !== this.currentWeight) {
              this.currentWeight = val;
              this.notifyListeners();
              return;
            }
          }
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
      throw new Error("Please enter a valid Wi-Fi Scale IP address");
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
      const timeoutId = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          this.closeSocket();
          this.isConnecting = false;
          this.isConnected = false;
          this.notifyListeners();
          reject(
            new Error(
              `Connection timed out to scale at ${cleanIp}:${port}.\n\nPlease ensure your phone is on the same Wi-Fi network as the scale.`
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
            clearTimeout(timeoutId);
            this.closeSocket();
            this.isConnecting = false;
            this.isConnected = false;
            this.notifyListeners();
            reject(
              new Error(
                `Could not connect to scale at ${cleanIp}:${port}: ${err.message || "Connection refused"}`
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
      throw new Error(
        `Cannot reach scale bridge at ${ip}:${port}.\n\n` +
        `In Expo Go, run the bridge on your PC first:\n` +
        `  node services/scale/scale-bridge.js\n\n` +
        `Then enter your PC's Wi-Fi IP (e.g. 192.168.1.13) and port 3001 in the app.`
      );
    }

    if (!res.ok) {
      throw new Error(
        `Bridge at ${ip}:${port} returned HTTP ${res.status}.\n` +
        `Make sure scale-bridge.js is running on your PC.`
      );
    }

    let data: any;
    try {
      data = await res.json();
    } catch {
      throw new Error(`Bridge at ${ip}:${port} returned an invalid response.`);
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
