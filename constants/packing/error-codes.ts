/**
 * Centralized Packing Error Codes for Frontend
 */
export const PACKING_ERROR_CODES = {
  STATION_OCCUPIED: "STATION_OCCUPIED",
  NO_OFFICER_ASSIGNED: "NO_OFFICER_ASSIGNED",
  MAIN_CONTAINER_PENDING: "MAIN_CONTAINER_PENDING",
} as const;

export type PackingErrorCode = keyof typeof PACKING_ERROR_CODES;
