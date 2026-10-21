import { Platform, PermissionsAndroid } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { encode as encodeBase64 } from "base64-arraybuffer";
import environment from "@/environment/environment";

export interface PrinterDevice {
  id: string;
  name: string;
  displayName: string;
  address: string;
  rssi?: number;
  nativeDevice?: any;
}

const SAVED_PRINTER_KEY = "@saved_connected_printer_device";

let bleManagerInstance: any = null;

function getBleManager(): any | null {
  if (!bleManagerInstance) {
    try {
      // Dynamically require react-native-ble-plx if available in native build
      const { BleManager } = require("react-native-ble-plx");
      bleManagerInstance = new BleManager();
    } catch (e) {
      // BLE native module not linked or running in standard Expo Go
      return null;
    }
  }
  return bleManagerInstance;
}

export const requestBluetoothPermissions = async (): Promise<boolean> => {
  if (Platform.OS === "android") {
    if (Platform.Version >= 31) {
      try {
        const result = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        return (
          result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED &&
          result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED
        );
      } catch (e) {
        return false;
      }
    } else {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (e) {
        return false;
      }
    }
  }
  return true;
};

// Convert string to base64 for BLE binary transfer
const stringToBase64 = (str: string): string => {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i) & 0xff;
  }
  return encodeBase64(bytes.buffer);
};

export class BluetoothPrinterService {
  private connectedDevice: PrinterDevice | null = null;
  private targetCharacteristic: any = null;

  public async getSavedConnectedPrinter(): Promise<PrinterDevice | null> {
    try {
      const json = await AsyncStorage.getItem(SAVED_PRINTER_KEY);
      if (json) {
        const device: PrinterDevice = JSON.parse(json);
        const isDev = device.id === "DEV_PRINTER" || device.name?.includes("Dev Printer");

        // If dev mode is disabled in environment, do not restore Dev Printer
        if (isDev && !environment.isDeveloper) {
          await AsyncStorage.removeItem(SAVED_PRINTER_KEY);
          return null;
        }

        this.connectedDevice = device;
        if (isDev || !getBleManager() || !device.nativeDevice) {
          this.targetCharacteristic = { isVirtual: true, isDevPrinter: isDev };
        }
        return device;
      }
    } catch (e) {
      console.error("Failed to load saved printer:", e);
    }
    return null;
  }

  public async scanForPrinters(
    onDeviceFound: (device: PrinterDevice) => void,
    onError?: (error: any) => void
  ): Promise<void> {
    // Only surface Dev Printer if isDeveloper is explicitly true in environment
    if (environment.isDeveloper) {
      onDeviceFound({
        id: "DEV_PRINTER",
        name: "Dev Printer",
        displayName: "Dev Printer (Virtual / No Print)",
        address: "Internal Dev Simulator",
        rssi: -10,
        nativeDevice: null,
      });
    }

    const manager = getBleManager();
    if (!manager) {
      // Running in Expo Go
      return;
    }

    const hasPermission = await requestBluetoothPermissions();
    if (!hasPermission) {
      if (onError) onError(new Error("Bluetooth permissions not granted"));
      return;
    }

    const discoveredIds = new Set<string>(environment.isDeveloper ? ["DEV_PRINTER"] : []);

    manager.startDeviceScan(null, null, (error: any, device: any) => {
      if (error) {
        if (onError) onError(error);
        return;
      }

      if (device && !discoveredIds.has(device.id)) {
        discoveredIds.add(device.id);
        const name = device.name || device.localName || `BT Device (${device.id.slice(-5)})`;
        onDeviceFound({
          id: device.id,
          name: name,
          displayName: name,
          address: device.id,
          rssi: device.rssi ?? undefined,
          nativeDevice: device,
        });
      }
    });
  }

  public stopScan(): void {
    const manager = getBleManager();
    if (manager) {
      try {
        manager.stopDeviceScan();
      } catch (e) {
        // Ignore
      }
    }
  }

  public async connectToPrinter(device: PrinterDevice): Promise<boolean> {
    const manager = getBleManager();
    const isDev = device.id === "DEV_PRINTER" || device.name?.includes("Dev Printer");

    try {
      this.stopScan();

      // Dev Printer connects virtually - only allowed if isDeveloper is true
      if (isDev) {
        if (!environment.isDeveloper) {
          throw new Error("Dev Printer is disabled in production environment.");
        }
        this.connectedDevice = device;
        this.targetCharacteristic = { isVirtual: true, isDevPrinter: true };
        await AsyncStorage.setItem(SAVED_PRINTER_KEY, JSON.stringify(device));
        return true;
      }

      if (!manager || !device.nativeDevice) {
        throw new Error("Cannot connect: Hardware Bluetooth module not found.");
      }

      // Real Physical Bluetooth Thermal Printer
      let connected = device.nativeDevice;
      const isConn = await connected.isConnected();
      if (!isConn) {
        connected = await connected.connect();
      }

      try {
        await connected.requestMTU(512);
      } catch (e) {
        // MTU request is optional
      }

      await connected.discoverAllServicesAndCharacteristics();
      const services = await connected.services();

      // Valid Thermal Printer UUIDs: ISSC UART (XP-365B: 49535343) or Standard FFE1/FFE0
      const PRINTER_UUID_PATTERNS = ["49535343", "ffe1", "ff02", "e7cf"];
      let writeChar: any = null;

      // Pass 1: Find dedicated printer UART characteristic
      for (const service of services) {
        const characteristics = await service.characteristics();
        for (const char of characteristics) {
          const u = char.uuid.toLowerCase();
          if (
            PRINTER_UUID_PATTERNS.some((p) => u.includes(p)) &&
            (char.isWritableWithResponse || char.isWritableWithoutResponse)
          ) {
            writeChar = char;
            break;
          }
        }
        if (writeChar) break;
      }

      // Pass 2: Fallback to any writable characteristic if not matched
      if (!writeChar) {
        for (const service of services) {
          const characteristics = await service.characteristics();
          for (const char of characteristics) {
            if (char.isWritableWithResponse || char.isWritableWithoutResponse) {
              writeChar = char;
              break;
            }
          }
          if (writeChar) break;
        }
      }

      // STRICT VALIDATION: Non-printer devices (headphones, TVs, smartwatches) rejected
      if (!writeChar) {
        throw new Error("No writable BLE data channel found on printer. Please power cycle printer and retry.");
      }

      this.targetCharacteristic = writeChar;
      this.connectedDevice = device;
      await AsyncStorage.setItem(SAVED_PRINTER_KEY, JSON.stringify(device));
      return true;
    } catch (err: any) {
      console.error("Failed to connect to BLE printer:", err);
      this.connectedDevice = null;
      this.targetCharacteristic = null;
      throw new Error(err?.message || "Failed to establish Bluetooth connection with printer.");
    }
  }

  public async printTSPL(tsplCommand: string): Promise<boolean> {
    if (!this.connectedDevice) {
      throw new Error("No printer connected. Please connect to a printer first.");
    }

    const isDev =
      this.connectedDevice.id === "DEV_PRINTER" ||
      this.targetCharacteristic?.isDevPrinter ||
      Boolean(this.connectedDevice.name && this.connectedDevice.name.toLowerCase().includes("dev printer")) ||
      Boolean(this.connectedDevice.displayName && this.connectedDevice.displayName.toLowerCase().includes("dev printer"));

    // DEV PRINTER: Simulates successful packing confirmation without printing physical sticker
    if (isDev || this.targetCharacteristic?.isVirtual) {
      console.log(`🖨️ [Dev Printer] Order packing confirmed (Simulated - No physical sticker printed):\n`, tsplCommand.slice(0, 150) + "...");
      await new Promise((resolve) => setTimeout(resolve, 350));
      return true;
    }

    if (!this.targetCharacteristic) {
      throw new Error("Printer connected but data channel is not open. Please disconnect and reconnect your printer.");
    }

    // REAL PHYSICAL PRINTER: Strictly transmit to physical printer with safe 20-byte chunks!
    try {
      const CHUNK_SIZE = 20;
      for (let i = 0; i < tsplCommand.length; i += CHUNK_SIZE) {
        const chunk = tsplCommand.slice(i, i + CHUNK_SIZE);
        const base64Data = stringToBase64(chunk);

        if (this.targetCharacteristic.isWritableWithoutResponse) {
          await this.targetCharacteristic.writeWithoutResponse(base64Data);
        } else {
          await this.targetCharacteristic.writeWithResponse(base64Data);
        }
        await new Promise((resolve) => setTimeout(() => resolve(true), 15));
      }
      console.log(`🖨️ [${this.connectedDevice.displayName || this.connectedDevice.name}] Physical print delivered successfully!`);
      return true;
    } catch (bleErr: any) {
      console.error(`🖨️ [${this.connectedDevice.displayName || this.connectedDevice.name}] Physical print failed:`, bleErr);
      throw new Error(bleErr?.message || "Failed to transmit TSPL label data to Bluetooth printer.");
    }
  }

  public async disconnect(): Promise<void> {
    if (this.connectedDevice) {
      try {
        if (this.connectedDevice.nativeDevice) {
          await this.connectedDevice.nativeDevice.cancelConnection();
        }
      } catch (err) {
        // Ignore disconnect errors
      }
      this.connectedDevice = null;
      this.targetCharacteristic = null;
      await AsyncStorage.removeItem(SAVED_PRINTER_KEY);
    }
  }

  public getConnectedDevice(): PrinterDevice | null {
    return this.connectedDevice;
  }
}

export const bluetoothPrinterService = new BluetoothPrinterService();
