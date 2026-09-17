export const DRIVER_STATUS = {
  NOT_APPROVED: "Not Approved",
  APPROVED: "Approved",
  REJECTED: "Rejected",
} as const;

export type DriverStatus = (typeof DRIVER_STATUS)[keyof typeof DRIVER_STATUS];
