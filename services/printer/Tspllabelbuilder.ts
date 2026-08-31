/**
 * Tspllabelbuilder.ts
 *
 * Builds TSPL commands strictly for 50mm width x 30mm height thermal labels
 * with 28mm x 28mm QR code specifications.
 */

const DOTS_PER_MM = 8; // 203 dpi resolution (8 dots per mm)

const mm = (value: number) => Math.round(value * DOTS_PER_MM);

export type LabelField =
  | {
      type: "text";
      x: number;
      y: number;
      content: string;
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
    `SIZE ${widthMm}mm,${heightMm}mm`,
    `GAP ${gapMm}mm,0mm`,
    `REFERENCE 0,0`,
    `DIRECTION 1,0`,
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
      const scale = field.scale ?? 1;
      const rotation = field.rotation ?? 0;
      const escaped = escapeQuotes(field.content);
      return `TEXT ${mm(field.x)},${mm(field.y)},"3",${rotation},${scale},${scale},"${escaped}"`;
    }
    case "qrcode": {
      const cell = field.cellSize ?? 6;
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
      const thickness = mm(field.thicknessMm ?? 0.5);
      return `BAR ${mm(field.x)},${mm(field.y)},${mm(field.lengthMm)},${thickness}`;
    }
  }
}

function escapeQuotes(text: string): string {
  return text.replace(/"/g, '\\"');
}

/**
 * THEME 1: Standard Horizontal Layout (50mm x 30mm Sticker)
 * - QR Code: 28mm x 28mm on Right (x=21mm, y=1mm)
 * - Text Area: Left 20mm
 */
export function buildTheme1TSPL(data: LabelThemeData): string {
  const cleanOrderNo = data.orderNumber.replace(/\s*\([^\)]*\)/g, "").trim();
  const fields: LabelField[] = [
    { type: "text", x: 1.0, y: 1.0, content: cleanOrderNo, scale: 2 },
    { type: "text", x: 1.0, y: 5.5, content: data.category || "Moragahahena", scale: 1 },
    { type: "text", x: 1.0, y: 9.5, content: data.orderType || "Wholesale", scale: 1 },
    { type: "text", x: 1.0, y: 14.5, content: data.date, scale: 1 },
    { type: "text", x: 1.0, y: 18.5, content: data.timeSlot, scale: 1 },
    { type: "line", x: 1.0, y: 22.0, lengthMm: 19, thicknessMm: 0.3 },
    { type: "text", x: 1.0, y: 23.0, content: data.stepLabel || "à la carte", scale: 1 },
    { type: "text", x: 1.0, y: 26.5, content: data.stepIndex || "Step 1/1", scale: 1 },
    { type: "qrcode", x: 21.0, y: 1.0, content: data.qrValue || cleanOrderNo, cellSize: 7 },
  ];
  return buildLabel(fields, { widthMm: 50, heightMm: 30, gapMm: 2 });
}

/**
 * THEME 2: 90° Rotated Vertical Text (50mm x 30mm Sticker)
 * - QR Code: 28mm x 28mm on Right (x=21mm, y=1mm)
 * - Text Area: Left 20mm with rotated text
 */
export function buildTheme2TSPL(data: LabelThemeData): string {
  const cleanOrderNo = data.orderNumber.replace(/\s*\([^\)]*\)/g, "").trim();
  const fields: LabelField[] = [
    { type: "text", x: 1.0, y: 28.0, content: cleanOrderNo, scale: 2, rotation: 90 },
    { type: "text", x: 6.0, y: 28.0, content: `${data.category || "Moragahahena"} - ${data.orderType}`, scale: 1, rotation: 90 },
    { type: "text", x: 11.0, y: 28.0, content: `${data.date} ${data.timeSlot}`, scale: 1, rotation: 90 },
    { type: "text", x: 16.0, y: 28.0, content: `${data.stepLabel} (${data.stepIndex})`, scale: 1, rotation: 90 },
    { type: "qrcode", x: 21.0, y: 1.0, content: data.qrValue || cleanOrderNo, cellSize: 7 },
  ];
  return buildLabel(fields, { widthMm: 50, heightMm: 30, gapMm: 2 });
}
