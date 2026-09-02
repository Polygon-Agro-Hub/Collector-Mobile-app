/**
 * Tspllabelbuilder.ts
 *
 * Single Unified TSPL Label Builder for 50mm width x 30mm height thermal label stickers.
 * Uses exact calibrated Web Theme 2 design:
 * - Invoice Number: Font 3 (3.0mm) @ x=2.0, y=2.0
 * - Hub Category: Font 1 (1.5mm) @ x=2.0, y=5.6
 * - Order Type: Font 1 (1.5mm) @ x=2.0, y=9.2
 * - Date: Font 1 (1.5mm) @ x=2.0, y=12.6
 * - Time Slot: Font 1 (1.5mm) @ x=2.0, y=16.0
 * - Step Section: Font 1 (1.5mm) @ x=2.0, y=19.4
 * - QR Code: 22x22mm (Cell size 8) @ x=28.2, y=2.0
 * - Full Divider Line: Len 46mm, Thk 0.3mm @ x=2.0, y=24.0
 * - Package Name (Bottom): Font 1 (1.5mm) @ x=3.0, y=25.8
 */

const DOTS_PER_MM = 8; // 203 dpi resolution (8 dots per mm)

const mm = (value: number) => Math.round(value * DOTS_PER_MM);

export type LabelField =
  | {
      type: "text";
      x: number;
      y: number;
      content: string;
      font?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8";
      scale?: 1 | 2 | 3 | 4;
      rotation?: 0 | 90 | 180 | 270;
    }
  | { type: "qrcode"; x: number; y: number; content: string; cellSize?: number }
  | {
      type: "barcode";
      x: number;
      y: number;
      content: string;
      heightMm?: number;
    }
  | {
      type: "line";
      x: number;
      y: number;
      lengthMm: number;
      thicknessMm?: number;
    };

export type LabelOptions = {
  widthMm?: number; // 50mm
  heightMm?: number; // 30mm
  gapMm?: number; // 2mm gap
  darkness?: number; // 0-15, default 10
  speedIps?: number; // 4 ips
  copies?: number; // default 1
};

export type LabelThemeData = {
  qrValue: string;
  orderNumber: string;
  orderType: string;
  category?: string;
  date: string;
  timeSlot: string;
  stepLabel: string;
  stepIndex: string;
};

export function buildLabel(
  fields: LabelField[],
  options: LabelOptions = {},
): string {
  const {
    widthMm = 50,
    heightMm = 30,
    gapMm = 2,
    darkness = 10,
    speedIps = 4,
    copies = 1,
  } = options;

  const lines: string[] = [
    `SIZE ${widthMm} mm, ${heightMm} mm`,
    `GAP ${gapMm} mm, 0 mm`,
    `REFERENCE 0,0`,
    `DIRECTION 1`,
    `DENSITY ${darkness}`,
    `SPEED ${speedIps}`,
    `CLS`,
    ...fields.map(fieldToTspl),
    `PRINT 1,${copies}`,
  ];

  return lines.join("\r\n") + "\r\n";
}

function fieldToTspl(field: LabelField): string {
  switch (field.type) {
    case "text": {
      const font = field.font ?? "2";
      const scale = field.scale ?? 1;
      const rotation = field.rotation ?? 0;
      const escaped = sanitizeTsplText(field.content);
      return `TEXT ${mm(field.x)},${mm(field.y)},"${font}",${rotation},${scale},${scale},"${escaped}"`;
    }
    case "qrcode": {
      const cell = field.cellSize ?? 8;
      const content = field.content || "12345678";
      const escaped = sanitizeTsplText(content);
      return `QRCODE ${mm(field.x)},${mm(field.y)},L,${cell},A,0,"${escaped}"`;
    }
    case "barcode": {
      const height = mm(field.heightMm ?? 10);
      const escaped = sanitizeTsplText(field.content);
      return `BARCODE ${mm(field.x)},${mm(field.y)},"128",${height},1,0,2,2,"${escaped}"`;
    }
    case "line": {
      const thickness = mm(field.thicknessMm ?? 0.3);
      return `BAR ${mm(field.x)},${mm(field.y)},${mm(field.lengthMm)},${thickness}`;
    }
  }
}

function sanitizeTsplText(text: string): string {
  if (!text) return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove combining diacritical marks
    .replace(/[ÀÁÂÃÄÅ]/g, "A")
    .replace(/[àáâãäå]/g, "a")
    .replace(/[ÈÉÊË]/g, "E")
    .replace(/[èéêë]/g, "e")
    .replace(/[ÌÍÎÏ]/g, "I")
    .replace(/[ìíîï]/g, "i")
    .replace(/[ÒÓÔÕÖ]/g, "O")
    .replace(/[òóôõö]/g, "o")
    .replace(/[ÙÚÛÜ]/g, "U")
    .replace(/[ùúûü]/g, "u")
    .replace(/[Ç]/g, "C")
    .replace(/[ç]/g, "c")
    .replace(/[Ñ]/g, "N")
    .replace(/[ñ]/g, "n")
    .replace(/"/g, '\\"');
}

function escapeQuotes(text: string): string {
  return sanitizeTsplText(text);
}

/**
 * Single Standard TSPL Label Builder (Web Theme 2 design)
 */
export function buildTSPLLabel(data: LabelThemeData): string {
  const cleanOrderNo = data.orderNumber.replace(/\s*\([^\)]*\)/g, "").trim();
  const fields: LabelField[] = [
    // Top Left Order Details
    { type: "text", x: 2.0, y: 2.0, font: "3", content: cleanOrderNo, scale: 1 },
    { type: "text", x: 2.0, y: 5.6, font: "1", content: data.category || "Moragahahena", scale: 1 },
    { type: "text", x: 2.0, y: 9.2, font: "1", content: data.orderType || "Wholesale", scale: 1 },
    { type: "text", x: 2.0, y: 12.6, font: "1", content: data.date, scale: 1 },
    { type: "text", x: 2.0, y: 16.0, font: "1", content: data.timeSlot, scale: 1 },

    // Step Section right after Time Slot
    { type: "text", x: 2.0, y: 19.4, font: "1", content: data.stepIndex || "Step 1/1", scale: 1 },

    // Top Right QR Code (x=28.2mm, y=2.0mm, 22x22mm)
    { type: "qrcode", x: 28.2, y: 2.0, content: data.qrValue || cleanOrderNo, cellSize: 8 },

    // Full-Width Divider Line
    { type: "line", x: 2.0, y: 24.0, lengthMm: 46, thicknessMm: 0.3 },

    // Package Name at the very bottom (Font 1 - compact, clean & readable)
    { type: "text", x: 3.0, y: 25.8, font: "1", content: data.stepLabel || "Main Container", scale: 1 },
  ];
  return buildLabel(fields, { widthMm: 50, heightMm: 30, gapMm: 2 });
}

// Backward compatibility exports
export const buildTheme2TSPL = buildTSPLLabel;
export const buildTheme1TSPL = buildTSPLLabel;
