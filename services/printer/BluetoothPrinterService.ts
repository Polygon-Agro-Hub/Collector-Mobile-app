import { Platform, PermissionsAndroid } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

import { encode as encodeBase64 } from "base64-arraybuffer";

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
        this.connectedDevice = device;
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
    const manager = getBleManager();
    if (!manager) {
      if (onError) {
        onError(
          new Error(
            "Bluetooth BLE scanning requires a native development build (APK). It is not supported in Expo Go."
          )
        );
      }
      return;
    }

    const hasPermission = await requestBluetoothPermissions();
    if (!hasPermission) {
      if (onError) onError(new Error("Bluetooth permissions not granted"));
      return;
    }

    const discoveredIds = new Set<string>();

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

    try {
      this.stopScan();

      if (manager && device.nativeDevice) {
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

        let writeChar: any = null;

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

        if (!writeChar) {
          throw new Error("No writable BLE data channel found on printer. Please power cycle printer and retry.");
        }

        this.targetCharacteristic = writeChar;
      }

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

    if (!this.targetCharacteristic) {
      throw new Error("Printer connected but data channel is not open. Please disconnect and reconnect your printer.");
    }

    try {
      const CHUNK_SIZE = 100;
      for (let i = 0; i < tsplCommand.length; i += CHUNK_SIZE) {
        const chunk = tsplCommand.slice(i, i + CHUNK_SIZE);
        const base64Data = stringToBase64(chunk);

        if (this.targetCharacteristic.isWritableWithoutResponse) {
          await this.targetCharacteristic.writeWithoutResponse(base64Data);
        } else {
          await this.targetCharacteristic.writeWithResponse(base64Data);
        }
        await new Promise((resolve) => setTimeout(() => resolve(true), 20));
      }
      return true;
    } catch (err: any) {
      console.error("Failed to write TSPL command to BLE printer:", err);
      throw new Error(err?.message || "Failed to transmit TSPL label data to Bluetooth printer.");
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
