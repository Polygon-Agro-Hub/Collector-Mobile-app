import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import axios from "axios";
import { Asset } from "expo-asset";
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
          console.error(
            `Failed to fetch order ${orderId}:`,
            response.data.message,
          );
          return {
            orderId,
            error: response.data.message || "Failed to fetch order",
            success: false,
          };
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
          result.status === "rejected"
            ? result.reason.message
            : result.value.error;
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
      const addressParts = orderData.fullAddress
        .split(",")
        .map((part) => part.trim());
      if (addressParts.length > 0) {
        cityFromAddress = addressParts[addressParts.length - 1];
      }
    }

    if (!cityFromAddress || cityFromAddress.trim() === "") {
      const customerInfo = orderData.customerInfo || {};
      cityFromAddress = customerInfo.city || orderData.city || null;
    }

    let deliveryFee = 0;
    if (cityFromAddress && cityFromAddress.trim() !== "") {
      try {
        deliveryFee = await fetchDeliveryFeeForCity(
          cityFromAddress.trim(),
          authToken,
        );
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

export const processOrdersForDelivery = async (
  selectedOrders,
  authToken,
  orderSource = null,
) => {
  try {
    const emailsData = [];
    const errors = [];

    const detectOrderSource = (order) => {
      if (orderSource) return orderSource;
      if (order.orderApp)
        return order.orderApp === "Dash" ? "dash" : "marketplace";
      return "regular";
    };

    for (let i = 0; i < selectedOrders.length; i++) {
      const order = selectedOrders[i];

      if (!order) {
        console.error(`❌ Order at index ${i} is null or undefined`);
        errors.push({
          orderId: `unknown-${i}`,
          error: "Order is null or undefined",
        });
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

        const isFreeDelivery =
          order.isCoupon === 1 && order.couponType === "Free Delivery";

        if (isFreeDelivery) {
          deliveryFee = 0;
        } else {
          try {
            const deliveryResult = await getDeliveryFeeFromOrder(
              order,
              authToken,
            );
            deliveryFee = parseFloat(deliveryResult.deliveryFee) || 0;
            if (isNaN(deliveryFee) || deliveryFee < 0) {
              console.warn(`⚠️ Invalid delivery fee for ${invoiceNo}, using 0`);
              deliveryFee = 0;
            }
          } catch (deliveryError) {
            console.error(
              `❌ Error fetching delivery fee for ${invoiceNo}:`,
              deliveryError.message,
            );
            deliveryFee = 0;
          }
        }

        const pdfBase64 = await generateOrderPDF(orderForPDF, deliveryFee);
        if (!pdfBase64) throw new Error("Empty PDF generated");

        let emailAddress =
          order.customerEmail ||
          order.customerInfo?.email ||
          order.email ||
          null;
        if (!emailAddress) {
          console.warn(
            `⚠️ No email found for order ${invoiceNo}, using fallback email`,
          );
          emailAddress = "hashinikadilrukshi15@gmail.com";
        }

        const customerName =
          order.customerInfo?.fullName ||
          order.fullName ||
          order.customerName ||
          "Valued Customer";

        const firstName = customerName.split(" ")[0] || "Valued";
        const lastName =
          customerName.split(" ").length > 1
            ? customerName.split(" ").slice(1).join(" ")
            : "Customer";

        let calculatedTotal = 0;

        if (order.packages && Array.isArray(order.packages)) {
          order.packages.forEach((pkg) => {
            calculatedTotal +=
              parseFloat(pkg.productPrice || 0) +
              parseFloat(pkg.packingFee || 0) +
              parseFloat(pkg.serviceFee || 0);
          });
        }

        if (order.additionalItems && Array.isArray(order.additionalItems)) {
          order.additionalItems.forEach((item) => {
            calculatedTotal +=
              parseFloat(item.price || 0) + parseFloat(item.discount || 0);
          });
        }

        if (!isFreeDelivery) {
          calculatedTotal += deliveryFee;
        }

        if (
          order.orderApp === "Dash" &&
          order.isPackage === 0 &&
          !order.couponValue &&
          !order.serviceFee
        ) {
          calculatedTotal += 180;
        }

        calculatedTotal -= parseFloat(order.discount || 0);

        if (
          order.orderApp === "Marketplace" &&
          parseFloat(order.couponValue || 0) > 0 &&
          !order.serviceFee
        ) {
          calculatedTotal -= parseFloat(order.couponValue || 0);
        }

        emailsData.push({
          email: emailAddress,
          subject: `Order ${invoiceNo} - Out for Delivery`,
          fileName: `Invoice_${invoiceNo}_${new Date().toISOString().split("T")[0]}.pdf`,
          pdfBase64,
          customerName,
          firstName,
          lastName,
          invoiceNo,
          totalAmount: calculatedTotal,
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
      return {
        success: false,
        emailsSent: 0,
        message: "No valid email data prepared",
        errors,
      };
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
      if (typeof charge === "string")
        return parseFloat(charge.replace(/[^\d.]/g, "")) || 0;
      return 0;
    };

    if (cityData) return extractFee(cityData.charge);

    console.warn(`❌ City '${cityName}' not found in delivery charges list`);
    const partialMatch = cities.find((c) => {
      if (!c.city) return false;
      const dbCityName = c.city.toLowerCase().trim();
      return (
        dbCityName.includes(searchCityName) ||
        searchCityName.includes(dbCityName)
      );
    });

    return partialMatch ? extractFee(partialMatch.charge) : 0;
  } catch (error) {
    console.error("💥 ERROR fetching delivery fee:", error);
    return 0;
  }
};

export const getOrderDeliveryFee = async (orderData, authToken) => {
  try {
    if (!orderData || !authToken)
      throw new Error("Missing required parameters");
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

const generateInvoiceHTML = (
  orderData,
  customerData = null,
  deliveryFee = 0,
  logoBase64 = null,
) => {
  if (!orderData) throw new Error("Order data is required for PDF generation");
  if (typeof orderData !== "object") {
    throw new Error(
      `Invalid order data type. Expected object, received ${typeof orderData}`,
    );
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

  if (
    order.isPackage === 1 &&
    order.packages &&
    Array.isArray(order.packages) &&
    order.packages.length > 0
  ) {
    order.packages.forEach((pkg) => {
      totalPackagePrice += calculatePackageTotal(pkg);
      totalPackingFee += parseFloat(pkg.packingFee || 0);
      totalServiceFee += parseFloat(pkg.serviceFee || 0);
    });
  } else if (order.isPackage === 1) {
    console.warn(
      "Order marked as package but packages array is missing or empty",
    );
  } else {
    totalServiceFee = 0;
  }

  if (
    order.additionalItems &&
    Array.isArray(order.additionalItems) &&
    order.additionalItems.length > 0
  ) {
    additionalItemsTotal =
      order.additionalItems.reduce((sum, item) => {
        const price = parseFloat(item.price?.toString() || "0");
        const discount = parseFloat(item.discount?.toString() || "0");
        return sum + price + discount;
      }, 0) || 0;
  }

  const subtotal = totalPackagePrice + additionalItemsTotal;

  const isFreeDelivery =
    order.isCoupon === 1 && order.couponType === "Free Delivery";
  const deliveryFeeAmount = isFreeDelivery ? 0 : parseFloat(deliveryFee || 0);

  let totalAmount = subtotal + deliveryFeeAmount;

  const shouldAddServiceFee =
    order.orderApp === "Dash" &&
    order.isPackage === 0 &&
    !order.couponValue &&
    !order.serviceFee;

  if (shouldAddServiceFee) {
    totalAmount += 180;
    totalServiceFee = 180;
  }

  totalAmount -= totaldiscount;

  if (
    order.orderApp === "Marketplace" &&
    couponDiscount > 0 &&
    !order.serviceFee
  ) {
    totalAmount -= couponDiscount;
  }

  const shouldShowServiceFee = () => shouldAddServiceFee;
  const shouldShowCouponDiscount = () =>
    order.orderApp === "Marketplace" && couponDiscount > 0 && !order.serviceFee;

  const generatePackageSections = () => {
    if (
      !order.isPackage ||
      !order.packages ||
      !Array.isArray(order.packages) ||
      order.packages.length === 0
    ) {
      return "";
    }
    return order.packages
      .map((pkg, packageIndex) => {
        const packageTotal = calculatePackageTotal(pkg);
        const packageItemsCount =
          pkg.packageItems && Array.isArray(pkg.packageItems)
            ? pkg.packageItems.length
            : 0;

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
    additionalItemsRows = order.additionalItems.map((item, index) => {
      const price = parseFloat(item.price?.toString() || "0");
      const discount = parseFloat(item.discount?.toString() || "0");
      const qty = parseFloat(item.qty?.toString() || "0");
      const unit = (item.unit || "kg").toLowerCase().trim();
      const actualAmount = price + discount;
      const unitPrice = parseFloat(item.normalPrice?.toString() || "0");

      let formattedQty = "";
      if (unit === "g") {
        if (qty >= 1000) {
          formattedQty = `${(qty / 1000).toFixed(qty % 1000 === 0 ? 0 : 1)}kg`;
        } else {
          formattedQty = `${qty}g`;
        }
      } else {
        formattedQty = `${qty}${unit}`;
      }

      return `
      <tr>
        <td style="text-align: center; padding: 12px 8px;" class="tabledata">${index + 1}</td>
        <td style="padding: 12px 8px;" class="tabledata">${item.displayName || item.name || "Item"}</td>
        <td style="text-align: right; padding: 12px 8px;" class="tabledata">${formatNumber(unitPrice)}</td>
        <td style="text-align: center; padding: 12px 8px;" class="tabledata">${formattedQty}</td>
        <td style="text-align: right; padding: 12px 8px;" class="tabledata">${formatCurrency(actualAmount)}</td>
      </tr>`;
    }).join("");
  }

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString)
        .toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
        .replace(/ /g, "-");
    } catch (e) {
      return "N/A";
    }
  };

  const customerInfo = order.customerInfo || {};

  const customerEmail =
    order.customerEmail ||
    order.email ||
    customerInfo.email ||
    customerData?.email ||
    "No email provided";

  const isPickup = order.delivaryMethod === "Pickup";
  const deliveryMethodLabel = isPickup ? "Instore Pickup" : "Home Delivery";

  const buildAddressBlock = () => {
    const buildingType = orderData.customerInfo?.buildingType;

    if (buildingType === "Apartment" && orderData.apartmentAddress) {
      const apt = orderData.apartmentAddress;
      const hasData =
        apt.buildingNo ||
        apt.buildingName ||
        apt.unitNo ||
        apt.floorNo ||
        apt.houseNo ||
        apt.streetName ||
        apt.city;

      if (!hasData) {
        return `<p class="addr-line" style="color:#999;">Address not provided</p>`;
      }

      return `
        <p class="bold" style="margin-bottom:4px;">Apartment Address :</p>
        ${apt.buildingNo ? `<p class="addr-line" style="margin:2px 0;"><span class="addr-label">No :</span> ${apt.buildingNo}</p>` : ""}
        ${apt.buildingName ? `<p class="addr-line" style="margin:2px 0;"><span class="addr-label">Name :</span> ${apt.buildingName}</p>` : ""}
        ${apt.unitNo ? `<p class="addr-line" style="margin:2px 0;"><span class="addr-label">Flat :</span> ${apt.unitNo}</p>` : ""}
        ${apt.floorNo ? `<p class="addr-line" style="margin:2px 0;"><span class="addr-label">Floor :</span> ${apt.floorNo}</p>` : ""}
        ${apt.houseNo ? `<p class="addr-line" style="margin:2px 0;"><span class="addr-label">House No :</span> ${apt.houseNo}</p>` : ""}
        ${apt.streetName ? `<p class="addr-line" style="margin:2px 0;"><span class="addr-label">Street Name :</span> ${apt.streetName}</p>` : ""}
        ${apt.city ? `<p class="addr-line" style="margin:2px 0;"><span class="addr-label">City :</span> ${apt.city}</p>` : ""}
      `;
    }

    const parts = (orderData.fullAddress || "")
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);

    const houseNo = parts[0] || null;
    const streetName = parts[1] || null;
    const city = parts[parts.length - 1] || null;

    if (!houseNo && !streetName && !city) {
      return `<p class="addr-line" style="color:#999;">Address not provided</p>`;
    }

    return `
      <p class="bold" style="margin-bottom:4px;">House Address :</p>
      ${houseNo ? `<p class="addr-line" style="margin:2px 0;"><span class="addr-label">House No :</span> ${houseNo}</p>` : ""}
      ${streetName ? `<p class="addr-line" style="margin:2px 0;"><span class="addr-label">Street Name :</span> ${streetName}</p>` : ""}
      ${city ? `<p class="addr-line" style="margin:2px 0;"><span class="addr-label">City :</span> ${city}</p>` : ""}
    `;
  };

  const grandTotalPackageLabel = (() => {
    if (!order.packages || order.packages.length === 0) return "Package";
    if (order.packages.length === 1)
      return order.packages[0].displayName || "Package";
    const uniquePackageIds = new Set(order.packages.map((p) => p.packageId));
    if (uniquePackageIds.size === 1) return "Total Price for Packages";
    return "Total Price for Packages";
  })();

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Purchase Invoice</title>
    <style>
      @page { 
        margin-top: 20px;
        size: A4;
      }
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body { 
        font-family: Arial, sans-serif; 
        padding: 10px; 
        margin: 0; 
        background-color: #ffffff; 
      }
      .invoice-container { 
        width: 100%; 
        max-width: 730px; 
        margin: 0 auto; 
        background: white; 
        padding: 20px; 
      }
      .header { 
        display: flex; 
        justify-content: space-between; 
        align-items: flex-start; 
        margin-top: 30px; 
      }
      .top h1 { 
        color: #3e206d; 
        font-size: 20px; 
        text-align: center; 
        margin: 0 0 10px 0;
      }
      .headerp { 
        font-size: 14px; 
        margin: 2px 0; 
        line-height: 1.4; 
      }
      .addr-line { 
        font-size: 14px; 
        margin: 2px 0; 
        line-height: 1.4; 
        color: #000; 
      }
      .addr-label { 
        color: #666666; 
        font-weight: 500; 
        min-width: 85px;
        display: inline-block;
      }
      .label { 
        color: #929292; 
        font-weight: 500; 
      }
      .value { 
        color: #000000; 
        font-weight: normal; 
      }
      .logo { 
        width: 120px; 
        height: auto; 
      }
      .bold { 
        font-weight: 550; 
        font-size: 14px; 
        margin: 6px 0 2px 0; 
      }
      .table { 
        width: 100%; 
        border-collapse: collapse; 
        margin-bottom: 0px; 
      }
      .table th, .table td { 
        border: none;
        padding: 12px 8px;
      }
      .table th { 
        background-color: #f8f8f8; 
        font-size: 14px; 
        font-weight: 600;
        border-bottom: 1px solid #ddd; 
      }
      .tabledata { 
        font-size: 14px; 
        font-weight: normal; 
        color: #666666; 
      }
      .footer { text-align: center; font-size: 12px; margin-top: 60px; color: #8492A3; }
      .remarks-text p {
        margin: 8px 0;
        line-height: 1.6;
      }
      .section1 { margin-top: 20px; }
      .section2 { margin-top: 10px; }
      .section3 { margin-top: 10px; }
      .section { page-break-inside: avoid; }
      .section4 { page-break-inside: avoid; margin-bottom: 20px; }
      .ptext { 
        font-size: 14px; 
        margin: 0px 0; 
        padding: 6px 0;
      }
      @media print {
        body {
          padding: 0;
          margin: 0;
        }
        .invoice-container {
          padding: 10px;
        }
      }
    </style>
  </head>
  <body>
    <div class="invoice-container">
      <div class="top"><h1>INVOICE</h1></div>
      
      <!-- Header Section -->
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-top:10px;">
        <div>
          <p style="margin:0 0 4px 0;"><span style="font-weight:550;font-size:16px">Polygon Holdings (Private) Ltd</span></p>
          <p class="headerp">No. 42/46, Nawam Mawatha, Colombo 02.</p>
          <p class="headerp">Contact No : +94 770 111 999</p>
          <p class="headerp">Email Address : info@polygon.lk</p>
        </div>
        <div>
          ${logoBase64 ? `<img src="${logoBase64}" alt="Polygon Logo" class="logo" />` : ""}
        </div>
      </div>

      ${isPickup
      ? `
<!-- Delivery Layout -->
<div style="display:flex;justify-content:space-between;margin-top:30px;">
  <div style="flex: 1;">
    <p class="bold">Bill To :</p>
    <p class="headerp">${customerInfo.fullName || "N/A"}</p>
    <p class="headerp">${customerEmail}</p>
    <p class="headerp">${customerInfo.phoneCode1 || "+94"} ${customerInfo.phone1 || ""}${customerInfo.phone2 ? ` / ${customerInfo.phoneCode2 || "+94"} ${customerInfo.phone2}` : ""}</p>    
    <div style="margin-top:12px;">
      ${buildAddressBlock()}
    </div>
    <div style="margin-top:16px;">
      <p class="bold">Invoice No :</p>
      <p class="headerp">${invoiceNumber}</p>
    </div>
    <div style="margin-top:12px;">
      <p class="bold">Delivery Method :</p>
      <p class="headerp">${deliveryMethodLabel}</p>
    </div>
  </div>
  <div style="text-align: right; min-width: 200px;">
    <p class="bold">Grand Total :</p>
    <p style="font-weight:550;font-size:18px;margin:2px 0 16px 0;">${formatCurrency(totalAmount)}</p>
    
    <p class="bold">Payment Method :</p>
    <p class="headerp" style="margin-bottom:16px;">${formatPaymentMethod(orderData.orderStatus?.paymentMethod)}</p>
    
    <p class="bold">Ordered Date :</p>
    <p class="headerp" style="margin-bottom:16px;">${formatDate(order.createdAt)}</p>
    
    <p class="bold">Scheduled Date :</p>
    <p class="headerp">${formatDate(order.scheduleDate)}</p>
  </div>
</div>
`
      : `
      <!-- Delivery Layout -->
      <div style="display:flex;justify-content:space-between;margin-top:30px;">
        <div style="flex: 1;">
          <p class="bold">Bill To :</p>
          <p class="headerp">${customerInfo.fullName || "N/A"}</p>
          <p class="headerp">${customerEmail}</p>
          <p class="headerp">${customerInfo.phoneCode1 || "+94"} ${customerInfo.phone1 || ""}${customerInfo.phone2 ? ` / ${customerInfo.phoneCode2 || "+94"} ${customerInfo.phone2}` : ""}</p>    
          <div style="margin-top:16px;">
            ${buildAddressBlock()}
          </div>
        </div>
        <div style="text-align: right; min-width: 180px;">
          <p class="bold">Grand Total :</p>
          <p style="font-weight:550;font-size:18px;margin:2px 0 0 0;">${formatCurrency(totalAmount)}</p>
          <div style="margin-top:24px;">
            <p class="bold">Payment Method :</p>
            <p class="headerp">${formatPaymentMethod(orderData.orderStatus?.paymentMethod)}</p>
          </div>
        </div>
      </div>
      
      <!-- Info Row -->
      <div style="display:flex;justify-content:space-between;margin-top:24px;">
        <div>
          <p class="bold">Invoice No :</p>
          <p class="headerp">${invoiceNumber}</p>
        </div>
        <div style="text-align: right;">
          <p class="bold">Ordered Date :</p>
          <p class="headerp">${formatDate(order.createdAt)}</p>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:16px;">
        <div>
          <p class="bold">Delivery Method :</p>
          <p class="headerp">${deliveryMethodLabel}</p>
        </div>
        <div style="text-align: right;">
          <p class="bold">Scheduled Date :</p>
          <p class="headerp">${formatDate(order.scheduleDate)}</p>
        </div>
      </div>
      `
    }

      ${generatePackageSections()}

     ${order.additionalItems && Array.isArray(order.additionalItems) && order.additionalItems.length > 0
      ? `<div class="section4">
        <div style="display:flex;justify-content:space-between;margin-bottom:20px;border-bottom:1px solid #ccc;padding-bottom:10px;margin-top:40px;">
          <div class="bold">Additional Items (${order.additionalItems.length} Items)</div>
          <div style="font-weight:550;font-size:16px">${formatCurrency(additionalItemsTotal)}</div>
        </div>
        <div style="border:1px solid #ddd;border-radius:10px;overflow-x:auto;">
          <table style="width: 100%; border-collapse: collapse;" class="table">
            <thead>
              <tr>
                <th style="text-align:center;padding:12px 8px;background-color:#f8f8f8;border-bottom:1px solid #ddd;">#</th>
                <th style="text-align:left;padding:12px 8px;background-color:#f8f8f8;border-bottom:1px solid #ddd;">Item Description</th>
                <th style="text-align:right;padding:12px 8px;background-color:#f8f8f8;border-bottom:1px solid #ddd;">Unit Price (Rs.)</th>
                <th style="text-align:center;padding:12px 8px;background-color:#f8f8f8;border-bottom:1px solid #ddd;">QTY</th>
                <th style="text-align:right;padding:12px 8px;background-color:#f8f8f8;border-bottom:1px solid #ddd;">Amount (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              ${additionalItemsRows}
            </tbody>
          </table>
        </div>
      </div>`
      : ""
    }

      <!-- Totals Section -->
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
        ${order.additionalItems &&
      Array.isArray(order.additionalItems) &&
      order.additionalItems.length > 0
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
        ${!isFreeDelivery && deliveryFeeAmount > 0
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

      <div style="margin-top:-10px;display:flex;justify-content:space-between;font-size:16px;font-weight:600;margin-right:20px;">
        <p>Grand Total</p>
        <p>${formatCurrency(totalAmount)}</p>
      </div>


     <!-- Remarks Section -->
<div class="section">
  <p style="margin-top:50px;font-size:14px;font-weight:600;margin-bottom:12px;">Remarks :</p>
  <div class="remarks-text" style="color:#666666;font-size:12px;">
    <p style="margin-bottom: 12px;">Kindly inspect all goods at the time of delivery to ensure accuracy and condition.</p>
    <p style="margin-bottom: 12px;">Polygon does not accept returns under any circumstances.</p>
    <p style="margin-bottom: 12px;">Please report any issues or discrepancies within 24 hours of delivery to ensure prompt attention.</p>
    <p style="margin-bottom: 12px;">For any assistance, feel free to contact our customer service team.</p>
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
      const asset = Asset.fromModule(
        require("../../assets/images/disribution-manger/logo.webp"),
      );
      await asset.downloadAsync();

      const uri = asset.localUri || asset.uri;
      if (!uri) throw new Error("No URI available for logo asset");

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      logoBase64 = `data:image/webp;base64,${base64}`;
    } catch (logoError) {
      console.warn("⚠️ Failed to load local logo:", logoError.message);
      logoBase64 = null;
    }

    const htmlContent = generateInvoiceHTML(
      orderData,
      null,
      deliveryFee,
      logoBase64,
    );
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
      customerName: emailData.customerName,
      firstName: emailData.firstName,
      lastName: emailData.lastName,
      invoiceNo: emailData.invoiceNo,
      totalAmount: emailData.totalAmount,
    }));

    const response = await axios.post(
      `${environment.API_BASE_URL}api/email/send-pdf-email`,
      emailPayload,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      },
    );

    return response.data;
  } catch (error) {
    console.error("Error sending PDF emails:", error);
    if (error.response) {
      if (error.response.status === 401)
        throw new Error("Authentication failed. Please login again.");
      if (error.response.status === 413)
        throw new Error("File too large. Please reduce the PDF size.");
      if (error.response.data?.message)
        throw new Error(error.response.data.message);
    } else if (error.request) {
      throw new Error(
        "No response received from server. Please check your connection.",
      );
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
    }
  } catch (error) {
    console.error("Error sharing PDF:", error);
    throw error;
  }
};
