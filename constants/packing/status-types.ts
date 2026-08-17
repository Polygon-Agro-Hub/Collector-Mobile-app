/**
 * Packing & QC Status Constants & Types for Frontend
 */
export const PACKING_STATUS = {
  NO_TARGET: "no_target",
  WAITING: "waiting",
  NO_ITEMS: "no_items",
  HAS_ITEMS: "has_items",
  MAIN_CONTAINER: "main_container",
} as const;

export type PackingStatus = typeof PACKING_STATUS[keyof typeof PACKING_STATUS];

export const QC_STATUS = {
  NO_TARGET: "no_target",
  WAITING: "waiting",
  NO_ITEMS: "no_items",
  QC_CHECKLIST: "qc_checklist",
} as const;

export type QCStatus = typeof QC_STATUS[keyof typeof QC_STATUS];
