import { useState, useCallback, useEffect } from "react";
import {
  bluetoothPrinterService,
  PrinterDevice,
} from "./BluetoothPrinterService";

export function usePrinter() {
  const [discoveredDevices, setDiscoveredDevices] = useState<PrinterDevice[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<PrinterDevice | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-restore saved printer on hook mount
  useEffect(() => {
    bluetoothPrinterService.getSavedConnectedPrinter().then((device) => {
      if (device) {
        setConnectedDevice(device);
      }
    });
  }, []);

  const startScan = useCallback(async () => {
    setError(null);
    setDiscoveredDevices([]);
    setIsScanning(true);

    try {
      await bluetoothPrinterService.scanForPrinters(
        (device) => {
          setDiscoveredDevices((prev) => {
            if (prev.some((d) => d.id === device.id)) return prev;
            return [...prev, device];
          });
        },
        (err) => {
          setError(err.message || "Failed during bluetooth device scan");
          setIsScanning(false);
        }
      );
      // Automatically finish scanning indicator after scan window
      setTimeout(() => {
        setIsScanning(false);
      }, 8000);
    } catch (err: any) {
      setError(err.message || "Could not start bluetooth scan");
      setIsScanning(false);
    }
  }, []);

  const stopScan = useCallback(() => {
    bluetoothPrinterService.stopScan();
    setIsScanning(false);
  }, []);

  const connectToDevice = useCallback(async (device: PrinterDevice) => {
    setError(null);
    setIsConnecting(true);

    try {
      await bluetoothPrinterService.connectToPrinter(device);
      setConnectedDevice(device);
      setIsConnecting(false);
      return true;
    } catch (err: any) {
      setError(err.message || "Failed to connect to printer");
      setIsConnecting(false);
      return false;
    }
  }, []);

  const printTSPL = useCallback(async (tsplCommand: string) => {
    setError(null);
    setIsPrinting(true);

    try {
      await bluetoothPrinterService.printTSPL(tsplCommand);
      setIsPrinting(false);
      return true;
    } catch (err: any) {
      setError(err.message || "Failed to print label");
      setIsPrinting(false);
      throw err;
    }
  }, []);

  const disconnect = useCallback(async () => {
    await bluetoothPrinterService.disconnect();
    setConnectedDevice(null);
  }, []);

  return {
    discoveredDevices,
    connectedDevice,
    isScanning,
    isConnecting,
    isPrinting,
    error,
    startScan,
    stopScan,
    connectToDevice,
    printTSPL,
    disconnect,
  };
}
