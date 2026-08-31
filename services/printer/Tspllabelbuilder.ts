/**
 * Tspllabelbuilder.ts
 *
 * Builds TSPL commands strictly for 50mm width x 30mm height thermal label stickers
 * with exact 25mm x 25mm QR code specifications, vertically centered content,
 * and strict column separation to prevent any overlapping.
 */

const DOTS_PER_MM = 8; // 203 dpi resolution (8 dots per mm)

const mm = (value: number) => Math.round(value * DOTS_PER_MM);

export type LabelField =
  | {
      type: "text";
      x: number;
      y: number;
      content: string;
      font?: "1" | "2" | "3" | "4" | "5";
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
      const escaped = escapeQuotes(field.content);
      return `TEXT ${mm(field.x)},${mm(field.y)},"${font}",${rotation},${scale},${scale},"${escaped}"`;
    }
    case "qrcode": {
      // Cell width 9 dots = ~25mm x 25mm footprint on 203 DPI (2mm smaller than 27mm)
      const cell = field.cellSize ?? 9;
      const content = field.content || "12345678";
      const escaped = escapeQuotes(content);
      return `QRCODE ${mm(field.x)},${mm(field.y)},L,${cell},A,0,"${escaped}"`;
    }
    case "barcode": {
      const height = mm(field.heightMm ?? 10);
      const escaped = escapeQuotes(field.content);
      return `BARCODE ${mm(field.x)},${mm(field.y)},"128",${height},1,0,2,2,"${escaped}"`;
    }
    case "line": {
      const thickness = mm(field.thicknessMm ?? 0.3);
      return `BAR ${mm(field.x)},${mm(field.y)},${mm(field.lengthMm)},${thickness}`;
    }
  }
}

function escapeQuotes(text: string): string {
  return text.replace(/"/g, '\\"');
}

/**
 * THEME 1: Standard Horizontal Layout (50mm x 30mm Sticker)
 * - Text Area: Left Column with 2mm left gap (x=2.0mm to 21.0mm, vertically centered)
 * - QR Code: Right Column (x=23.5mm, y=2.5mm, cellSize=9 -> 25mm x 25mm, vertically centered)
 * - Separation Gap: 2.5mm between text and QR code (No Overlap)
 */
export function buildTheme1TSPL(data: LabelThemeData): string {
  const cleanOrderNo = data.orderNumber.replace(/\s*\([^\)]*\)/g, "").trim();
  const fields: LabelField[] = [
    { type: "text", x: 2.0, y: 2.5, font: "2", content: cleanOrderNo, scale: 1 },
    { type: "text", x: 2.0, y: 5.8, font: "2", content: data.category || "Moragahahena", scale: 1 },
    { type: "text", x: 2.0, y: 9.0, font: "1", content: data.orderType || "Wholesale", scale: 1 },
    { type: "text", x: 2.0, y: 12.2, font: "1", content: data.date, scale: 1 },
    { type: "text", x: 2.0, y: 15.2, font: "1", content: data.timeSlot, scale: 1 },
    { type: "line", x: 2.0, y: 18.2, lengthMm: 18, thicknessMm: 0.3 },
    { type: "text", x: 2.0, y: 19.8, font: "1", content: data.stepLabel || "à la carte", scale: 1 },
    { type: "text", x: 2.0, y: 23.2, font: "1", content: data.stepIndex || "Step 1/1", scale: 1 },
    { type: "qrcode", x: 23.5, y: 2.5, content: data.qrValue || cleanOrderNo, cellSize: 9 },
  ];
  return buildLabel(fields, { widthMm: 50, heightMm: 30, gapMm: 2 });
}

/**
 * THEME 2: 90° Rotated Vertical Text (50mm x 30mm Sticker)
 * - Text Area: Left Column with 2mm left gap (rotated 90°, vertically centered)
 * - QR Code: Right Column (x=23.5mm, y=2.5mm, cellSize=9 -> 25mm x 25mm, vertically centered)
 */
export function buildTheme2TSPL(data: LabelThemeData): string {
  const cleanOrderNo = data.orderNumber.replace(/\s*\([^\)]*\)/g, "").trim();
  const fields: LabelField[] = [
    { type: "text", x: 2.0, y: 2.5, font: "2", content: cleanOrderNo, scale: 1, rotation: 90 },
    { type: "text", x: 5.8, y: 2.5, font: "1", content: `${data.category || "Moragahahena"} • ${data.orderType}`, scale: 1, rotation: 90 },
    { type: "text", x: 9.0, y: 2.5, font: "1", content: `${data.date} ${data.timeSlot}`, scale: 1, rotation: 90 },
    { type: "line", x: 12.2, y: 2.5, lengthMm: 25, thicknessMm: 0.3 },
    { type: "text", x: 14.0, y: 2.5, font: "1", content: `${data.stepLabel} (${data.stepIndex})`, scale: 1, rotation: 90 },
    { type: "qrcode", x: 23.5, y: 2.5, content: data.qrValue || cleanOrderNo, cellSize: 9 },
  ];
  return buildLabel(fields, { widthMm: 50, heightMm: 30, gapMm: 2 });
}
