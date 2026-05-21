import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import axios from "axios";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system";
import { environment } from "@/environment/environment";


export const fetchOrderDetailsByIds = async (orderIds, authToken) => {
  try {
    const orderPromises = orderIds.map(async (orderId) => {
      try {
        const response = await axios.get(
          `${environment.API_BASE_URL}api/distribution-manager/get-order/${orderId}`,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
              "Content-Type": "application/json",
            },
            timeout: 30000,
          },
        );
        if (response.data.success) {
          return { orderId, orderData: response.data.data, success: true };
        } else {
          console.error(`Failed to fetch order ${orderId}:`, response.data.message);
          return { orderId, error: response.data.message || "Failed to fetch order", success: false };
        }
      } catch (error) {
        console.error(`Error fetching order ${orderId}:`, error);
        return { orderId, error: error.message, success: false };
      }
    });

    const results = await Promise.allSettled(orderPromises);
    const successfulOrders = [];
    const failedOrders = [];

    results.forEach((result, index) => {
      if (result.status === "fulfilled" && result.value.success) {
        successfulOrders.push(result.value.orderData);
      } else {
        const orderId = orderIds[index];
        const error =
          result.status === "rejected" ? result.reason.message : result.value.error;
        failedOrders.push({ orderId, error });
      }
    });

    return { successful: successfulOrders, failed: failedOrders };
  } catch (error) {
    console.error("Error in fetchOrderDetailsByIds:", error);
    throw new Error("Failed to fetch order details: " + error.message);
  }
};

export const getDeliveryFeeFromOrder = async (orderData, authToken) => {
  try {
    if (!orderData || !authToken) {
      throw new Error("Missing required parameters: orderData or authToken");
    }

    if (orderData.delivaryMethod === "Pickup") {
      return { deliveryFee: 0, city: null };
    }

    let cityFromAddress = null;
    if (orderData.fullAddress && typeof orderData.fullAddress === "string") {
      const addressParts = orderData.fullAddress.split(",").map((part) => part.trim());
      if (addressParts.length > 0) {
        cityFromAddress = addressParts[addressParts.length - 1];
      }
    }

    let deliveryFee = 0;
    if (cityFromAddress && cityFromAddress.trim() !== "") {
      try {
        deliveryFee = await fetchDeliveryFeeForCity(cityFromAddress.trim(), authToken);
      } catch (deliveryError) {
        console.error("❌ ERROR fetching delivery fee:", deliveryError);
        deliveryFee = 0;
      }
    } else {
      console.warn("⚠️ WARN: No city found in order address");
    }

    return { deliveryFee: parseFloat(deliveryFee) || 0, city: cityFromAddress };
  } catch (error) {
    console.error("💥 ERROR in getDeliveryFeeFromOrder:", error);
    throw error;
  }
};

export const processOrdersForDelivery = async (selectedOrders, authToken, orderSource = null) => {
  try {
    const emailsData = [];
    const errors = [];

    const detectOrderSource = (order) => {
      if (orderSource) return orderSource;
      if (order.orderApp) return order.orderApp === "Dash" ? "dash" : "marketplace";
      return "regular";
    };

    for (let i = 0; i < selectedOrders.length; i++) {
      const order = selectedOrders[i];

      if (!order) {
        console.error(`❌ Order at index ${i} is null or undefined`);
        errors.push({ orderId: `unknown-${i}`, error: "Order is null or undefined" });
        continue;
      }

      const invoiceNo =
        order.invoiceNo ||
        order.invoiceNumber ||
        order?.orderStatus?.invoiceNumber ||
        order.id ||
        `INV-${Date.now()}-${i}`;
      const detectedSource = detectOrderSource(order);

      try {
        let orderForPDF = order;
        let deliveryFee = 0;

        try {
          const deliveryResult = await getDeliveryFeeFromOrder(order, authToken);
          deliveryFee = parseFloat(deliveryResult.deliveryFee) || 0;
          if (isNaN(deliveryFee) || deliveryFee < 0) {
            console.warn(`⚠️ Invalid delivery fee for ${invoiceNo}, using 0`);
            deliveryFee = 0;
          }
        } catch (deliveryError) {
          console.error(`❌ Error fetching delivery fee for ${invoiceNo}:`, deliveryError.message);
          deliveryFee = 0;
        }

        const pdfBase64 = await generateOrderPDF(orderForPDF, deliveryFee);
        if (!pdfBase64) throw new Error("Empty PDF generated");

        let emailAddress = order.customerEmail || order.customerInfo?.email || order.email || null;
        if (!emailAddress) {
          console.warn(`⚠️ No email found for order ${invoiceNo}, using fallback email`);
          emailAddress = "hashinikadilrukshi15@gmail.com";
        }

        const customerName =
          order.customerName ||
          `${order.customerInfo?.firstName || ""} ${order.customerInfo?.lastName || ""}`.trim() ||
          order.name ||
          "Valued Customer";

        emailsData.push({
          email: emailAddress,
          subject: `Order ${invoiceNo} - Out for Delivery`,
          fileName: `Invoice_${invoiceNo}_${new Date().toISOString().split("T")[0]}.pdf`,
          pdfBase64,
          customerName,
          invoiceNo,
        });
      } catch (pdfError) {
        console.error(`❌ Error processing order ${invoiceNo}:`, pdfError);
        errors.push({ orderId: invoiceNo, error: pdfError.message });
      }
    }

    if (emailsData.length > 0) {
      try {
        const emailResponse = await sendPDFEmails(emailsData, authToken);
        return {
          success: true,
          emailsSent: emailsData.length,
          details: emailResponse,
          errors: errors.length > 0 ? errors : undefined,
        };
      } catch (emailError) {
        console.error("❌ Email sending failed:", emailError);
        return {
          success: false,
          emailsSent: 0,
          error: "Failed to send emails",
          details: emailError.message,
          errors,
        };
      }
    } else {
      return { success: false, emailsSent: 0, message: "No valid email data prepared", errors };
    }
  } catch (error) {
    console.error("💥 Process orders failed:", error);
    throw error;
  }
};

export const fetchDeliveryFeeForCity = async (cityName, authToken) => {
  try {
    if (!cityName || typeof cityName !== "string") {
      console.warn("❌ Invalid city name provided:", cityName);
      return 0;
    }

    const cityResponse = await axios.get(
      `${environment.API_BASE_URL}api/distribution-manager/get-city`,
      { headers: { Authorization: `Bearer ${authToken}` }, timeout: 10000 },
    );

    if (!cityResponse.data?.data || !Array.isArray(cityResponse.data.data)) {
      console.warn("❌ No city data received from API or data is not an array");
      return 0;
    }

    const cities = cityResponse.data.data;
    const searchCityName = cityName.toLowerCase().trim();

    const cityData = cities.find((c) => {
      if (!c.city) return false;
      return c.city.toLowerCase().trim() === searchCityName;
    });

    const extractFee = (charge) => {
      if (charge === null || charge === undefined) return 0;
      if (typeof charge === "number") return charge;
      if (typeof charge === "string") return parseFloat(charge.replace(/[^\d.]/g, "")) || 0;
      return 0;
    };

    if (cityData) return extractFee(cityData.charge);

    console.warn(`❌ City '${cityName}' not found in delivery charges list`);
    const partialMatch = cities.find((c) => {
      if (!c.city) return false;
      const dbCityName = c.city.toLowerCase().trim();
      return dbCityName.includes(searchCityName) || searchCityName.includes(dbCityName);
    });

    return partialMatch ? extractFee(partialMatch.charge) : 0;
  } catch (error) {
    console.error("💥 ERROR fetching delivery fee:", error);
    return 0;
  }
};

export const getOrderDeliveryFee = async (orderData, authToken) => {
  try {
    if (!orderData || !authToken) throw new Error("Missing required parameters");
    const result = await getDeliveryFeeFromOrder(orderData, authToken);
    return result.deliveryFee;
  } catch (error) {
    console.error("Error getting order delivery fee:", error);
    return 0;
  }
};

const calculatePackageTotal = (pkg) => {
  const productPrice = parseFloat(pkg.productPrice || 0);
  const packingFee = parseFloat(pkg.packingFee || 0);
  const serviceFee = parseFloat(pkg.serviceFee || 0);
  return productPrice + packingFee + serviceFee;
};


const generateInvoiceHTML = (orderData, customerData = null, deliveryFee = 0, logoBase64 = null) => {
  if (!orderData) throw new Error("Order data is required for PDF generation");
  if (typeof orderData !== "object") {
    throw new Error(`Invalid order data type. Expected object, received ${typeof orderData}`);
  }

  let order = orderData;
  let invoiceNumber =
    orderData.orderStatus?.invoiceNumber ||
    orderData.invoiceNumber ||
    orderData.invoiceNo ||
    `INV-${orderData.orderId || Date.now()}`;

  const formatCurrency = (amount) => {
    const numAmount = parseFloat(amount) || 0;
    return `Rs. ${numAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  };

  // Number with commas, no currency prefix (for table cells)
  const formatNumber = (amount) => {
    const numAmount = parseFloat(amount) || 0;
    return numAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const formatItemCount = (count) => String(count).padStart(2, "0");

  function formatPaymentMethod(paymentMethod) {
    if (!paymentMethod) return "N/A";
    const map = { Cash: "Cash on Delivery", Card: "Debit / Credit Card" };
    return map[paymentMethod] || paymentMethod;
  }

  let totalPackagePrice = 0;
  let totalPackingFee = 0;
  let totalServiceFee = 0;
  let additionalItemsTotal = 0;
  let totaldiscount = parseFloat(order.discount || 0);
  let couponDiscount = parseFloat(order.couponValue || 0);

  if (order.isPackage === 1 && order.packages && Array.isArray(order.packages) && order.packages.length > 0) {
    order.packages.forEach((pkg) => {
      totalPackagePrice += calculatePackageTotal(pkg);
      totalPackingFee += parseFloat(pkg.packingFee || 0);
      totalServiceFee += parseFloat(pkg.serviceFee || 0);
    });
  } else if (order.isPackage === 1) {
    console.warn("Order marked as package but packages array is missing or empty");
  } else {
    totalServiceFee = 0;
  }

  if (order.additionalItems && Array.isArray(order.additionalItems) && order.additionalItems.length > 0) {
    additionalItemsTotal =
      order.additionalItems.reduce((sum, item) => {
        const price = parseFloat(item.price?.toString() || "0");
        const discount = parseFloat(item.discount?.toString() || "0");
        return sum + price + discount;
      }, 0) || 0;
  }

  const subtotal = totalPackagePrice + additionalItemsTotal;
  const deliveryFeeAmount = parseFloat(deliveryFee || 0);
  let totalAmount = subtotal + deliveryFeeAmount;

  const shouldAddServiceFee =
    order.orderApp === "Dash" && order.isPackage === 0 && !order.couponValue && !order.serviceFee;

  if (shouldAddServiceFee) {
    totalAmount += 180;
    totalServiceFee = 180;
  }

  totalAmount -= totaldiscount;

  if (order.orderApp === "Marketplace" && couponDiscount > 0 && !order.serviceFee) {
    totalAmount -= couponDiscount;
  }

  const shouldShowServiceFee = () => shouldAddServiceFee;
  const shouldShowCouponDiscount = () =>
    order.orderApp === "Marketplace" && couponDiscount > 0 && !order.serviceFee;

  const generatePackageSections = () => {
    if (!order.isPackage || !order.packages || !Array.isArray(order.packages) || order.packages.length === 0) {
      return "";
    }
    return order.packages
      .map((pkg, packageIndex) => {
        const packageTotal = calculatePackageTotal(pkg);
        const packageItemsCount =
          pkg.packageItems && Array.isArray(pkg.packageItems) ? pkg.packageItems.length : 0;

        let packageDetailsRows = "";
        if (pkg.packageItems && Array.isArray(pkg.packageItems)) {
          packageDetailsRows = pkg.packageItems
            .map((item, itemIndex) => {
              const itemPrice = parseFloat(item.price || 0);
              const itemQty = parseFloat(item.qty || 0);
              const itemTotal = itemPrice * itemQty;
              return `
                <tr>
                  <td style="text-align: center" class="tabledata">${itemIndex + 1}</td>
                  <td class="tabledata">${item.productTypeName || item.category || "N/A"}</td>
                  <td class="tabledata">${item.productDisplayName || "N/A"}</td>
                  <td class="tabledata">${formatNumber(itemPrice)}</td>
                  <td class="tabledata">${itemQty}${item.unit || ""}</td>
                  <td class="tabledata">${formatNumber(itemTotal)}</td>
                </tr>`;
            })
            .join("");
        }

        return `
          <div class="section4">
            <div style="display:flex;justify-content:space-between;margin-bottom:20px;border-bottom:1px solid #ccc;padding-bottom:10px;margin-top:40px;">
              <div class="bold">${pkg.displayName || `Package ${packageIndex + 1}`} (${formatItemCount(packageItemsCount)} Items)</div>
              <div style="font-weight:550;font-size:16px">${formatCurrency(packageTotal)}</div>
            </div>
            <div style="border:1px solid #ddd;border-radius:10px">
              ${packageDetailsRows
            ? `<table class="table">
                    <tr>
                      <th style="text-align:center;border-top-left-radius:10px">Index</th>
                      <th>Category</th>
                      <th>Item Description</th>
                      <th>Unit Price (Rs.)</th>
                      <th>QTY (Kg)</th>
                      <th style="border-top-right-radius:10px">Amount (Rs.)</th>
                    </tr>
                    ${packageDetailsRows}
                  </table>`
            : `<div style="padding:20px;text-align:center;color:#666;">Package items not available</div>`
          }
            </div>
          </div>`;
      })
      .join("");
  };

  let additionalItemsRows = "";
  if (order?.additionalItems && order.additionalItems.length > 0) {
    order.additionalItems.forEach((item, index) => {
      const price = parseFloat(item.price?.toString() || "0");
      const discount = parseFloat(item.discount?.toString() || "0");
      const quantity = parseFloat(item.qty?.toString() || "0");
      const actualAmount = price + discount;
      const unitPrice = quantity > 0 ? actualAmount / quantity : 0;
      additionalItemsRows += `
        <tr>
          <td style="text-align:center">${index + 1}</td>
          <td class="tabledata">${item.displayName || item.name || "Item"}</td>
          <td class="tabledata">${formatNumber(unitPrice)}</td>
          <td class="tabledata">${quantity}</td>
          <td class="tabledata">${formatNumber(actualAmount)}</td>
        </tr>`;
    });
  }

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString)
        .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        .replace(/ /g, "-");
    } catch (e) {
      return "N/A";
    }
  };

  const customerInfo = order.customerInfo || {};

  const customerEmail =
    order.customerEmail || order.email || customerInfo.email || customerData?.email || "No email provided";

  const isPickup = order.delivaryMethod === "Pickup";
  const deliveryMethodLabel = isPickup ? "Instore Pickup" : "Home Delivery";

  // ── Helper: render one address line (only if value exists) ────────
  const addrLine = (label, value) =>
    value ? `<p class="addr-line"><span class="addr-label">${label} :</span> ${value}</p>` : "";

  // ── Address block for HOME DELIVERY — line by line ────────────────
  const buildAddressBlock = () => {
    if (customerInfo.buildingType === "Apartment") {
      return `
        <p class="bold" style="margin-bottom:4px;">Apartment Address :</p>
        ${addrLine("No", customerInfo.no || customerInfo.unitNo)}
        ${addrLine("Name", customerInfo.buildingName || customerInfo.apartmentName)}
        ${addrLine("Flat", customerInfo.flatNo || customerInfo.flat || customerInfo.unit)}
        ${addrLine("Floor", customerInfo.floor || customerInfo.floorNo)}
        ${addrLine("House No", customerInfo.houseNo || customerInfo.houseNumber)}
        ${addrLine("Street Name", customerInfo.streetName || customerInfo.street)}
        ${addrLine("City", customerInfo.city)}
      `;
    } else {
      return `
        <p class="bold" style="margin-bottom:4px;">House Address :</p>
        ${addrLine("House No", customerInfo.houseNo || customerInfo.houseNumber)}
        ${addrLine("Street Name", customerInfo.streetName || customerInfo.street)}
        ${addrLine("City", customerInfo.city)}
      `;
    }
  };

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Purchase Invoice</title>
    <style>
      @page { margin-top: 20px; }
      body {
        font-family: Arial, sans-serif;
        padding: 10px;
        margin: 0;
        background-color: #ffffff;
      }
      .invoice-container {
        width: 100%;
        max-width: 730px;
        margin: auto;
        background: white;
        padding: 20px;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 30px;
      }
      .top h1 {
        color: #3e206d;
        font-size: 20px;
        text-align: center;
      }

      /* ── Tight line spacing for all descriptive text ── */
      .headerp {
        font-size: 14px;
        margin: 2px 0;
        line-height: 1.4;
      }

      /* ── Address lines: label in grey, value in black ── */
      .addr-line {
        font-size: 14px;
        margin: 2px 0;
        line-height: 1.4;
        color: #000;
      }
      .addr-label {
        color: #666666;
        font-weight: 500;
      }

      .label  { color: #929292; font-weight: 500; }
      .value  { color: #000000; font-weight: normal; }
      .logo   { width: 180px; height: auto; }
      .bold   { font-weight: 550; font-size: 14px; margin: 6px 0 2px 0; }

      .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
      .table th, .table td { border-left: none; border-right: none; padding: 15px; text-align: left; }
      .table th { background-color: #f8f8f8; font-size: 14px; border-bottom: 1px solid #ddd; }
      .tabledata { font-size: 14px; font-weight: bold; color: #666666; }
      .table td { text-align: left; }

      .footer { text-align: center; font-size: 12px; margin-top: 60px; color: #8492A3; }
      .section1 { margin-top: 10px; }
      .section2 { margin-top: 10px; }
      .section3 { margin-top: 10px; }
      .section  { page-break-inside: avoid; }
      .section4 { page-break-inside: avoid; margin-bottom: 20px; }
      .ptext    { font-size: 14px; }
    </style>
  </head>
  <body>
    <div class="invoice-container">

      <!-- Header -->
      <div class="top"><h1>INVOICE</h1></div>
      <div class="header">
        <div>
          <p style="margin:0 0 4px 0;"><span style="font-weight:550;font-size:16px">Polygon Agro Holdings (Private) Ltd</span></p>
          <p class="headerp">No. 42/46, Nawam Mawatha, Colombo 02.</p>
          <p class="headerp">Contact No : +94 770 111 999</p>
          <p class="headerp">Email Address : info@polygon.lk</p>
        </div>
        <div>
          <img src=${logoBase64} alt="Polygon Logo" class="logo" />
        </div>
      </div>

      ${isPickup ? `
      <!-- ══ INSTORE PICKUP LAYOUT ══════════════════════════════════════ -->
      <div class="section1" style="display:flex;justify-content:space-between;margin-top:20px;">

        <!-- Left: customer info + invoice meta + centre address -->
        <div>
          <p class="bold">Bill To :</p>
          <p class="headerp">${customerInfo.title || ""}.${customerInfo.firstName || ""} ${customerInfo.lastName || ""}</p>
          <p class="headerp">${customerEmail}</p>
          <p class="headerp">+94 ${customerInfo.phoneNumber || ""}</p>

          <div style="margin-top:16px;">
            <p class="bold">Invoice No :</p>
            <p class="headerp">${invoiceNumber}</p>
          </div>

          <div style="margin-top:10px;">
            <p class="bold">Delivery Method :</p>
            <p class="headerp">${deliveryMethodLabel}</p>
          </div>

          <div style="margin-top:10px;">
            <p class="bold">Centre : ${order.centerName}</p>
            <p class="headerp">${order.centerCity || ""}, ${order.centerDistrict || ""}</p>
            <p class="headerp">${order.centerProvince || ""}, ${order.centerCountry || ""}</p>
            
          </div>
        </div>

        <!-- Right: Grand Total + Payment Method + Dates -->
        <div style="margin-right:55px;">
          <p class="bold">Grand Total :</p>
          <p style="font-weight:550;font-size:16px;margin:2px 0 0 0;">${formatCurrency(totalAmount)}</p>

          <div style="margin-top:16px;">
            <p class="bold">Payment Method :</p>
            <p class="headerp">${formatPaymentMethod(orderData.orderStatus?.paymentMethod)}</p>
          </div>

          <div style="margin-top:16px;">
            <p class="bold">Ordered Date :</p>
            <p class="headerp">${formatDate(order.createdAt)}</p>
          </div>

          <div style="margin-top:16px;">
            <p class="bold">Scheduled Date :</p>
            <p class="headerp">${formatDate(order.scheduleDate)}</p>
          </div>
        </div>

      </div>

      ` : `
      <!-- ══ HOME DELIVERY LAYOUT ══════════════════════════════════════ -->

      <!-- Billing Section -->
      <div class="section1" style="display:flex;justify-content:space-between;">
        <div>
          <p class="bold">Bill To :</p>
          <p class="headerp">${customerInfo.title || ""}.${customerInfo.firstName || ""} ${customerInfo.lastName || ""}</p>
          <p class="headerp">+94 ${customerInfo.phoneNumber || ""}</p>
          <p class="headerp">${customerEmail}</p>
          <div style="margin-top:10px;">
            ${buildAddressBlock()}
          </div>
        </div>
        <div style="margin-right:55px;">
          <p class="bold">Grand Total :</p>
          <p style="font-weight:550;font-size:16px;margin:2px 0 0 0;">${formatCurrency(totalAmount)}</p>
          <div style="margin-top:24px;">
            <p class="bold">Payment Method :</p>
            <p class="headerp">${formatPaymentMethod(orderData.orderStatus?.paymentMethod)}</p>
          </div>
        </div>
      </div>

      <!-- Invoice Meta -->
      <div>
        <div class="section2" style="display:flex;justify-content:space-between;">
          <div>
            <p class="bold">Invoice No :</p>
            <p class="headerp">${invoiceNumber}</p>
          </div>
          <div style="margin-right:79px;">
            <p class="bold">Ordered Date :</p>
            <p class="headerp">${formatDate(order.createdAt)}</p>
          </div>
        </div>
        <div class="section2" style="display:flex;justify-content:space-between;">
          <div>
            <p class="bold">Delivery Method :</p>
            <p class="headerp">${deliveryMethodLabel}</p>
          </div>
          <div style="margin-right:64px;">
            <p class="bold">Scheduled Date :</p>
            <p class="headerp">${formatDate(order.scheduleDate)}</p>
          </div>
        </div>
      </div>
      `}

      <!-- Packages -->
      ${generatePackageSections()}

      <!-- Additional Items -->
      ${order.additionalItems && Array.isArray(order.additionalItems) && order.additionalItems.length > 0
      ? `<div class="section4">
            <div style="display:flex;justify-content:space-between;margin-bottom:20px;border-bottom:1px solid #ccc;padding-bottom:10px;margin-top:40px;">
              <div class="bold">Additional Items (${order.additionalItems.length} Items)</div>
              <div style="font-weight:550;font-size:16px">${formatCurrency(additionalItemsTotal)}</div>
            </div>
            <div style="border:1px solid #ddd;border-radius:10px">
              <table class="table">
                <tr>
                  <th style="text-align:center;border-top-left-radius:10px">Index</th>
                  <th>Item Description</th>
                  <th>Unit Price (Rs.)</th>
                  <th>QTY (Kg)</th>
                  <th style="border-top-right-radius:10px">Amount (Rs.)</th>
                </tr>
                ${additionalItemsRows}
              </table>
            </div>
          </div>`
      : ""
    }

      <!-- Grand Total Breakdown -->
      <div class="section" style="margin-top:30px;">
        <div style="margin-bottom:20px;border-bottom:1px solid #ccc;padding-bottom:10px;">
          <div class="bold">Grand Total for all items</div>
        </div>

        ${order.isPackage === 1 && totalPackagePrice > 0
      ? `<div style="display:flex;justify-content:space-between;margin-right:20px;" class="ptext">
              <p>${order.packages?.length === 1 ? order.packages[0].displayName || "Package" : "Total Price for Packages"}</p>
              <p>${formatCurrency(totalPackagePrice)}</p>
            </div>`
      : ""
    }

        ${order.additionalItems && Array.isArray(order.additionalItems) && order.additionalItems.length > 0
      ? `<div style="display:flex;justify-content:space-between;margin-right:20px;" class="ptext">
              <p>${order?.isPackage === 1 ? "Additional Items" : "Custom Items"}</p>
              <p>Rs. ${additionalItemsTotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</p>
            </div>`
      : ""
    }

        ${shouldShowServiceFee()
      ? `<div style="display:flex;justify-content:space-between;margin-right:20px;" class="ptext">
              <p>Service Fee</p><p>Rs. 180.00</p>
            </div>`
      : ""
    }

        ${deliveryFeeAmount > 0
      ? `<div style="display:flex;justify-content:space-between;margin-right:20px;" class="ptext">
              <p>Delivery Fee</p><p>${formatCurrency(deliveryFeeAmount)}</p>
            </div>`
      : ""
    }

        ${shouldShowCouponDiscount()
      ? `<div style="display:flex;justify-content:space-between;margin-right:20px;" class="ptext">
              <p>Coupon Discount</p><p>${formatCurrency(couponDiscount)}</p>
            </div>`
      : ""
    }
      </div>

      ${totaldiscount > 0
      ? `<div style="display:flex;justify-content:space-between;margin-right:20px;" class="ptext">
            <p>Discount</p><p>${formatCurrency(totaldiscount)}</p>
          </div>`
      : ""
    }

      <div style="margin-bottom:20px;border-bottom:2px solid #000;padding-bottom:10px;"></div>

      <!-- Grand Total -->
      <div style="margin-top:-10px;display:flex;justify-content:space-between;font-size:16px;font-weight:600;margin-right:20px;">
        <p>Grand Total</p>
        <p>${formatCurrency(totalAmount)}</p>
      </div>

      <!-- Remarks -->
      <div class="section">
        <p style="margin-top:50px;font-size:14px;font-weight:600;">Remarks :</p>
        <div style="color:#666666;font-size:12px;">
          <p style="margin:2px 0;">Kindly inspect all goods at the time of delivery to ensure accuracy and condition.</p>
          <p style="margin:2px 0;">Polygon does not accept returns under any circumstances.</p>
          <p style="margin:2px 0;">Please report any issues or discrepancies within 24 hours of delivery to ensure prompt attention.</p>
          <p style="margin:2px 0;">For any assistance, feel free to contact our customer service team.</p>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p style="margin-top:50px;font-size:16px;font-weight:600;color:#000;font-style:italic">Thank you for shopping with us!</p>
        <p style="margin-top:-5px;font-size:14px;font-weight:500;color:#4B4B4B;font-style:italic">WE WILL SEND YOU MORE OFFERS, LOWEST PRICED VEGGIES FROM US.</p>
        <p style="margin-top:50px;font-style:italic">- THIS IS A COMPUTER GENERATED INVOICE, THUS NO SIGNATURE REQUIRED -</p>
      </div>

    </div>
  </body>
</html>`;
};

export const generateOrderPDF = async (orderData, deliveryFee = 0) => {
  try {
    let logoBase64 = null;
    try {
      const asset = Asset.fromModule(require("../../assets/images/disribution-manger/logo.webp"));
      await asset.downloadAsync();
      const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
        encoding: "base64",
      });
      logoBase64 = `data:image/webp;base64,${base64}`;
    } catch (logoError) {
      console.warn("⚠️ Failed to load local logo, using fallback URL:", logoError.message);
      logoBase64 = "https://pub-79ee03a4a23e4dbbb70c7d799d3cb786.r2.dev/POLYGON%20ORIGINAL%20LOGO.png";
    }

    const htmlContent = generateInvoiceHTML(orderData, null, deliveryFee, logoBase64);
    const { base64 } = await Print.printToFileAsync({
      html: htmlContent,
      width: 595,
      height: 842,
      base64: true,
    });

    if (!base64) throw new Error("Failed to generate PDF base64");
    return base64;
  } catch (error) {
    console.error("PDF generation error:", error);
    throw error;
  }
};

export const sendPDFEmails = async (emailsData, authToken) => {
  try {
    const emailPayload = emailsData.map((emailData) => ({
      email: emailData.email,
      fileName: emailData.fileName,
      pdfBase64: emailData.pdfBase64,
    }));

    const response = await axios.post(
      `${environment.API_BASE_URL}api/email/send-pdf-email`,
      emailPayload,
      {
        headers: { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" },
        timeout: 30000,
      },
    );

    return response.data;
  } catch (error) {
    console.error("Error sending PDF emails:", error);

    if (error.response) {
      if (error.response.status === 401) throw new Error("Authentication failed. Please login again.");
      if (error.response.status === 413) throw new Error("File too large. Please reduce the PDF size.");
      if (error.response.data?.message) throw new Error(error.response.data.message);
    } else if (error.request) {
      throw new Error("No response received from server. Please check your connection.");
    } else {
      throw new Error("Error setting up request: " + error.message);
    }

    throw new Error("Failed to send emails. Please try again later.");
  }
};

export const sharePDF = async (pdfUri) => {
  try {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(pdfUri);
    } else {
      console.log("Sharing is not available on this platform");
    }
  } catch (error) {
    console.error("Error sharing PDF:", error);
    throw error;
  }
};