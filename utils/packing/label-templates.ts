export type LabelTheme = "theme1" | "theme2";

export interface LabelData {
  cleanInv: string;
  category: string;
  orderType: string;
  date: string;
  timeSlot: string;
  stepLabel: string;
  stepIndex: string;
  qrValue: string;
}

/**
 * Generate 50mm x 30mm Label HTML
 * @param data Label data properties
 * @param theme 'theme1' (Horizontal) | 'theme2' (90° Rotated Vertically)
 */
export function generateLabelHTML(
  data: LabelData,
  theme: LabelTheme = "theme1"
): string {
  if (theme === "theme2") {
    // Theme 2: QR Code stays same (28x28mm on right), Text details rotated 90 degrees vertically
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            @page {
              size: auto;
              margin: 0mm !important;
            }
            @media print {
              html, body {
                width: 100% !important;
                height: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
              }
            }
            * {
              box-sizing: border-box !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #000000 !important;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
            .sticker-label {
              width: 50mm !important;
              height: 30mm !important;
              min-width: 50mm !important;
              min-height: 30mm !important;
              max-width: 50mm !important;
              max-height: 30mm !important;
              padding: 1mm 1.5mm !important;
              border: none !important;
              outline: none !important;
              display: flex !important;
              flex-direction: row !important;
              justify-content: space-between !important;
              align-items: center !important;
              background: #ffffff !important;
              overflow: hidden !important;
            }
            .left-col-container {
              width: 21mm !important;
              height: 28mm !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              overflow: visible !important;
            }
            .left-col-rotated {
              width: 28mm !important;
              height: 21mm !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              align-items: flex-start !important;
              transform: rotate(-90deg) !important;
              transform-origin: center center !important;
              white-space: nowrap !important;
            }
            .order-no {
              font-size: 11.5pt !important;
              font-weight: 900 !important;
              color: #000000 !important;
              line-height: 1.1 !important;
              letter-spacing: -0.3px !important;
              display: block !important;
            }
            .cat-type {
              font-size: 8pt !important;
              font-weight: 800 !important;
              color: #0b192c !important;
              line-height: 1.1 !important;
              margin-top: 1px !important;
            }
            .date-time {
              font-size: 7.5pt !important;
              font-weight: 700 !important;
              color: #0b192c !important;
              line-height: 1.1 !important;
              margin-top: 1px !important;
            }
            .divider {
              width: 100% !important;
              height: 0.5pt !important;
              background: #94a3b8 !important;
              margin: 1.5px 0 !important;
            }
            .step-info {
              font-size: 7.5pt !important;
              font-weight: 600 !important;
              color: #0b192c !important;
              line-height: 1.1 !important;
            }
            .right-col {
              width: 28mm !important;
              height: 28mm !important;
              min-width: 28mm !important;
              min-height: 28mm !important;
              max-width: 28mm !important;
              max-height: 28mm !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
            }
            .qr-img {
              width: 28mm !important;
              height: 28mm !important;
              min-width: 28mm !important;
              min-height: 28mm !important;
              max-width: 28mm !important;
              max-height: 28mm !important;
              object-fit: contain !important;
            }
          </style>
        </head>
        <body>
          <div class="sticker-label">
            <div class="left-col-container">
              <div class="left-col-rotated">
                <div class="order-no">${data.cleanInv}</div>
                <div class="cat-type">${data.category || "Moragahahena"} • ${data.orderType}</div>
                <div class="date-time">${data.date} &nbsp; ${data.timeSlot}</div>
                <div class="divider"></div>
                <div class="step-info">${data.stepLabel} (${data.stepIndex})</div>
              </div>
            </div>
            <div class="right-col">
              <img class="qr-img" src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data.qrValue)}" />
            </div>
          </div>
        </body>
      </html>
    `;
  }

  // Theme 1: Standard Horizontal Left Text, Right 28x28mm QR Code
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          @page {
            size: auto;
            margin: 0mm !important;
          }
          @media print {
            html, body {
              width: 100% !important;
              height: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
            }
          }
          * {
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          }
          .sticker-label {
            width: 50mm !important;
            height: 30mm !important;
            min-width: 50mm !important;
            min-height: 30mm !important;
            max-width: 50mm !important;
            max-height: 30mm !important;
            padding: 1mm 1.2mm !important;
            border: none !important;
            outline: none !important;
            display: flex !important;
            flex-direction: row !important;
            justify-content: space-between !important;
            align-items: center !important;
            background: #ffffff !important;
            overflow: hidden !important;
          }
          .left-col {
            width: 20.5mm !important;
            height: 28.5mm !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
          }
          .order-no {
            font-size: 11.5pt !important;
            font-weight: 900 !important;
            color: #000000 !important;
            line-height: 1.0 !important;
            letter-spacing: -0.3px !important;
          }
          .category {
            font-size: 8pt !important;
            font-weight: 700 !important;
            color: #0b192c !important;
            line-height: 1.15 !important;
            margin-top: 1px !important;
          }
          .order-type {
            font-size: 7.5pt !important;
            font-weight: 400 !important;
            color: #0b192c !important;
            line-height: 1.15 !important;
          }
          .mid-sec {
            font-size: 7pt !important;
            font-weight: 700 !important;
            line-height: 1.15 !important;
            color: #0b192c !important;
            margin-top: 2px !important;
          }
          .divider {
            width: 100% !important;
            height: 0.5pt !important;
            background: #94a3b8 !important;
            margin: 2px 0 !important;
          }
          .btm-sec {
            font-size: 7pt !important;
            font-weight: 400 !important;
            line-height: 1.15 !important;
            color: #0b192c !important;
          }
          .right-col {
            width: 28mm !important;
            height: 28mm !important;
            min-width: 28mm !important;
            min-height: 28mm !important;
            max-width: 28mm !important;
            max-height: 28mm !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
          .qr-img {
            width: 28mm !important;
            height: 28mm !important;
            min-width: 28mm !important;
            min-height: 28mm !important;
            max-width: 28mm !important;
            max-height: 28mm !important;
            object-fit: contain !important;
          }
        </style>
      </head>
      <body>
        <div class="sticker-label">
          <div class="left-col">
            <div>
              <div class="order-no">${data.cleanInv}</div>
              <div class="category">${data.category || "Moragahahena"}</div>
              <div class="order-type">${data.orderType}</div>
            </div>
            <div class="mid-sec">
              <div>${data.date}</div>
              <div>${data.timeSlot}</div>
            </div>
            <div class="divider"></div>
            <div class="btm-sec">
              <div>${data.stepLabel}</div>
              <div>${data.stepIndex}</div>
            </div>
          </div>
          <div class="right-col">
            <img class="qr-img" src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data.qrValue)}" />
          </div>
        </div>
      </body>
    </html>
  `;
}
