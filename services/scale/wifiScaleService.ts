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

class WifiScaleService {
  private currentScale: SavedScale | null = null;
  private currentWeight: number = 0.0;
  private isConnected: boolean = false;
  private listeners: Set<ScaleWeightListener> = new Set();
  private pollInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initSavedScale();
  }

  private async initSavedScale() {
    const saved = await getSavedScale();
    if (saved && saved.ip) {
      // Test if saved scale is reachable
      const reachable = await this.pingScale(saved.ip, saved.port || 8080);
      if (reachable) {
        this.currentScale = { ...saved, connected: true };
        this.isConnected = true;
        this.startWeightPolling();
      } else {
        this.currentScale = { ...saved, connected: false };
        this.isConnected = false;
      }
      this.notifyListeners();
    }
  }

  /**
   * Ping scale IP to verify physical network availability
   */
  private async pingScale(ip: string, port: number): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    try {
      // Try HTTP endpoint first
      const response = await fetch(`http://${ip}:${port}/api/weight`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response.ok;
    } catch (_) {
      clearTimeout(timeoutId);
      // Try root endpoint
      try {
        const rootController = new AbortController();
        const rootTimeout = setTimeout(() => rootController.abort(), 2000);
        const rootRes = await fetch(`http://${ip}:${port}/`, {
          signal: rootController.signal,
        });
        clearTimeout(rootTimeout);
        return rootRes.ok;
      } catch (_) {
        return false;
      }
    }
  }

  /**
   * Test connection and connect to BUDRY MFD-300 Wi-Fi Scale
   */
  async connectWifiScale(ip: string, port: number = 8080): Promise<ScaleStatus> {
    try {
      const cleanIp = ip.trim();
      if (!cleanIp) {
        throw new Error("Please enter a valid Wi-Fi Scale IP address");
      }

      // Strictly verify scale is reachable on Wi-Fi network
      const isReachable = await this.pingScale(cleanIp, port);

      if (!isReachable) {
        throw new Error(
          `Could not connect to BUDRY MFD-300 scale at ${cleanIp}:${port}.\n\nPlease ensure the scale is powered on and connected to your Wi-Fi network.`
        );
      }

      const scaleConfig: SavedScale = {
        id: `wifi_${cleanIp}_${port}`,
        name: "BUDRY MFD-300",
        type: "wifi",
        ip: cleanIp,
        port,
        connected: true,
        lastWeight: 0,
      };

      await saveSelectedScale(scaleConfig);
      this.currentScale = scaleConfig;
      this.isConnected = true;

      this.startWeightPolling();
      this.notifyListeners();

      return this.getStatus();
    } catch (err: any) {
      console.error("Scale connection failed:", err.message);
      this.isConnected = false;
      if (this.currentScale) {
        this.currentScale.connected = false;
      }
      this.notifyListeners();
      throw err;
    }
  }

  /**
   * Disconnect from Wi-Fi scale
   */
  async disconnectScale(): Promise<void> {
    this.stopWeightPolling();
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
    this.listeners.forEach((listener) => listener(status));
  }

  private startWeightPolling() {
    this.stopWeightPolling();
    this.pollInterval = setInterval(async () => {
      if (!this.isConnected || !this.currentScale?.ip) return;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(`http://${this.currentScale.ip}:${this.currentScale.port || 8080}/api/weight`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          if (data.weight !== undefined) {
            this.currentWeight = parseFloat(data.weight);
            this.notifyListeners();
          }
        }
      } catch (_) {
        // Keep connection state active
      }
    }, 3000);
  }

  private stopWeightPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }
}

export const wifiScaleService = new WifiScaleService();
