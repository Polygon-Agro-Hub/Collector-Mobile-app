import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import axios from 'axios';
import { environment } from '@/environment/environment';
import * as FileSystem from 'expo-file-system';

// Function to fetch complete order details by order IDs
export const fetchOrderDetailsByIds = async (orderIds, authToken) => {
  try {
    console.log('Fetching order details for IDs:', orderIds);

    const orderPromises = orderIds.map(async (orderId) => {
      try {
        const response = await axios.get(
          `${environment.API_BASE_URL}api/distribution-manager/get-order/${orderId}`,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
            timeout: 30000
          }
        );

        console.log("..................................", response.data)

        if (response.data.success) {
          return {
            orderId,
            orderData: response.data.data,
            success: true
          };
        } else {
          console.error(`Failed to fetch order ${orderId}:`, response.data.message);
          return {
            orderId,
            error: response.data.message || 'Failed to fetch order',
            success: false
          };
        }
      } catch (error) {
        console.error(`Error fetching order ${orderId}:`, error);
        return {
          orderId,
          error: error.message,
          success: false
        };
      }
    });

    const results = await Promise.allSettled(orderPromises);

    const successfulOrders = [];
    const failedOrders = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        successfulOrders.push(result.value.orderData);
      } else {
        const orderId = orderIds[index];
        const error = result.status === 'rejected'
          ? result.reason.message
          : result.value.error;
        failedOrders.push({ orderId, error });
      }
    });

    return {
      successful: successfulOrders,
      failed: failedOrders
    };
  } catch (error) {
    console.error('Error in fetchOrderDetailsByIds:', error);
    throw new Error('Failed to fetch order details: ' + error.message);
  }
};


// Updated function to get delivery fee directly from order data
export const getDeliveryFeeFromOrder = async (orderData, authToken) => {
  try {
    console.log("=== DELIVERY FEE FROM ORDER DEBUG START ===");
    console.log("Processing order data for delivery fee:", {
      orderId: orderData.orderId,
      hasFullAddress: !!orderData.fullAddress,
      fullAddress: orderData.fullAddress
    });

    if (!orderData || !authToken) {
      throw new Error("Missing required parameters: orderData or authToken");
    }

    // Extract city from order's fullAddress
    let cityFromAddress = null;

    if (orderData.fullAddress && typeof orderData.fullAddress === 'string') {
      // Split the address by commas and get the last part as city
      const addressParts = orderData.fullAddress.split(',').map(part => part.trim());
      if (addressParts.length > 0) {
        // Get the last non-empty part as city
        cityFromAddress = addressParts[addressParts.length - 1];
      }
    }

    console.log("Extracted city from order address:", {
      fullAddress: orderData.fullAddress,
      extractedCity: cityFromAddress
    });

    let deliveryFee = 0;

    if (cityFromAddress && cityFromAddress.trim() !== '') {
      try {
        console.log(`🔄 Attempting to fetch delivery fee for city: "${cityFromAddress}"`);
        deliveryFee = await fetchDeliveryFeeForCity(cityFromAddress.trim(), authToken);
        console.log(`✅ SUCCESS: Delivery fee for "${cityFromAddress}": Rs.${deliveryFee}`);
      } catch (deliveryError) {
        console.error("❌ ERROR fetching delivery fee:", deliveryError);
        console.error("Will use 0 as default delivery fee");
        deliveryFee = 0;
      }
    } else {
      console.warn("⚠️ WARN: No city found in order address");
      console.log("Available order data:", {
        orderId: orderData.orderId,
        fullAddress: orderData.fullAddress,
        customerInfo: orderData.customerInfo ? 'present' : 'missing'
      });
    }

    console.log("=== DELIVERY FEE FROM ORDER DEBUG END ===");
    console.log("FINAL RESULT:", {
      city: cityFromAddress,
      deliveryFee: deliveryFee,
      deliveryFeeType: typeof deliveryFee,
      deliveryFeeValid: !isNaN(deliveryFee) && deliveryFee >= 0
    });

    return {
      deliveryFee: parseFloat(deliveryFee) || 0,
      city: cityFromAddress
    };

  } catch (error) {
    console.error('💥 ERROR in getDeliveryFeeFromOrder:', error);
    console.error('Stack trace:', error.stack);
    throw error;
  }
};

// FIXED: Updated processOrdersForDelivery function with better order source detection
export const processOrdersForDelivery = async (selectedOrders, authToken, orderSource = null) => {
  try {
    console.log('🚀 Processing orders for delivery:', {
      orderCount: selectedOrders.length,
      orderSource: orderSource
    });

    const emailsData = [];
    const errors = [];

    // FIXED: Detect order source if not provided
    const detectOrderSource = (order) => {
      if (orderSource) return orderSource;

      // Check order properties to determine source
      if (order.orderApp) {
        return order.orderApp === 'Dash' ? 'dash' : 'marketplace';
      }

      // Default to regular if cannot determine
      return 'regular';
    };

    for (let i = 0; i < selectedOrders.length; i++) {
      const order = selectedOrders[i];

      if (!order) {
        console.error(`❌ Order at index ${i} is null or undefined`);
        errors.push({
          orderId: `unknown-${i}`,
          error: 'Order is null or undefined'
        });
        continue;
      }

      const invoiceNo = order.invoiceNo || order.invoiceNumber || order?.orderStatus?.invoiceNumber || order.id || `INV-${Date.now()}-${i}`;
      const detectedSource = detectOrderSource(order);

      console.log(`📋 Processing order ${i + 1}/${selectedOrders.length}:`, {
        invoiceNo,
        orderId: order.orderId,
        orderSource: detectedSource,
        orderApp: order.orderApp,
        hasFullAddress: !!order.fullAddress
      });

      try {
        let orderForPDF = order;
        let deliveryFee = 0;

        // Get delivery fee from order data directly
        try {
          console.log(`🔍 Fetching delivery fee for order ${invoiceNo}`);

          const deliveryResult = await getDeliveryFeeFromOrder(order, authToken);

          console.log(`📊 Delivery fee result for ${invoiceNo}:`, {
            city: deliveryResult.city,
            deliveryFee: deliveryResult.deliveryFee,
            deliveryFeeType: typeof deliveryResult.deliveryFee
          });

          deliveryFee = parseFloat(deliveryResult.deliveryFee) || 0;

          // Validate delivery fee
          if (isNaN(deliveryFee) || deliveryFee < 0) {
            console.warn(`⚠️ Invalid delivery fee for ${invoiceNo}, using 0`);
            deliveryFee = 0;
          }

        } catch (deliveryError) {
          console.error(`❌ Error fetching delivery fee for ${invoiceNo}:`, deliveryError.message);
          deliveryFee = 0;
        }

        console.log(`💰 Final delivery fee for ${invoiceNo}: Rs.${deliveryFee}`);

        // Generate PDF with delivery fee
        const pdfBase64 = await generateOrderPDF(orderForPDF, deliveryFee);

        if (!pdfBase64) {
          throw new Error('Empty PDF generated');
        }

        console.log(`✅ PDF generated successfully for ${invoiceNo}, delivery fee included: Rs.${deliveryFee}`);

        // Extract email address
        let emailAddress = order.customerEmail ||
          order.customerInfo?.email ||
          order.email ||
          null;

        if (!emailAddress) {
          console.warn(`⚠️ No email found for order ${invoiceNo}, using fallback email`);
          emailAddress = 'hashinikadilrukshi15@gmail.com';
        }

        const customerName = order.customerName ||
          `${order.customerInfo?.firstName || ''} ${order.customerInfo?.lastName || ''}`.trim() ||
          order.name ||
          'Valued Customer';

        emailsData.push({
          email: emailAddress,
          subject: `Order ${invoiceNo} - Out for Delivery`,
          fileName: `Invoice_${invoiceNo}_${new Date().toISOString().split('T')[0]}.pdf`,
          pdfBase64: pdfBase64,
          customerName: customerName,
          invoiceNo: invoiceNo
        });

      } catch (pdfError) {
        console.error(`❌ Error processing order ${invoiceNo}:`, pdfError);
        errors.push({
          orderId: invoiceNo,
          error: pdfError.message
        });
      }
    }

    console.log(`📊 Summary: Prepared ${emailsData.length} emails, encountered ${errors.length} errors`);

    if (emailsData.length > 0) {
      try {
        const emailResponse = await sendPDFEmails(emailsData, authToken);
        return {
          success: true,
          emailsSent: emailsData.length,
          details: emailResponse,
          errors: errors.length > 0 ? errors : undefined
        };
      } catch (emailError) {
        console.error('❌ Email sending failed:', emailError);
        return {
          success: false,
          emailsSent: 0,
          error: 'Failed to send emails',
          details: emailError.message,
          errors: errors
        };
      }
    } else {
      return {
        success: false,
        emailsSent: 0,
        message: 'No valid email data prepared',
        errors: errors
      };
    }
  } catch (error) {
    console.error('💥 Process orders failed:', error);
    throw error;
  }
};

export const fetchDeliveryFeeForCity = async (cityName, authToken) => {
  try {
    console.log(`🔍 Searching delivery fee for city: "${cityName}"`);

    if (!cityName || typeof cityName !== 'string') {
      console.warn('❌ Invalid city name provided:', cityName);
      return 0;
    }

    // Fetch all cities with delivery charges
    const cityResponse = await axios.get(
      `${environment.API_BASE_URL}api/distribution-manager/get-city`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        timeout: 10000
      }
    );

    console.log("Cities API response:", {
      success: !!cityResponse.data,
      hasData: !!cityResponse.data?.data,
      dataType: Array.isArray(cityResponse.data?.data) ? 'array' : typeof cityResponse.data?.data,
      citiesCount: cityResponse.data?.data?.length || 0
    });

    if (!cityResponse.data?.data || !Array.isArray(cityResponse.data.data)) {
      console.warn("❌ No city data received from API or data is not an array");
      return 0;
    }

    const cities = cityResponse.data.data;
    console.log(`📍 Searching in ${cities.length} cities for: "${cityName}"`);

    // Clean the city name for better matching
    const searchCityName = cityName.toLowerCase().trim();

    // Log first few cities for debugging
    if (cities.length > 0) {
      console.log("Sample cities data:", cities.slice(0, 3).map(c => ({
        id: c.id,
        city: c.city,
        charge: c.charge,
        cityType: typeof c.city,
        chargeType: typeof c.charge
      })));
    }

    // Find the specific city with enhanced matching
    const cityData = cities.find(c => {
      if (!c.city) {
        console.log('City object missing city field:', c);
        return false;
      }

      const dbCityName = c.city.toLowerCase().trim();
      const exactMatch = dbCityName === searchCityName;

      if (exactMatch) {
        console.log(`✅ EXACT MATCH FOUND: "${c.city}" with charge: ${c.charge} (Type: ${typeof c.charge})`);
        return true;
      }

      return false;
    });

    if (cityData) {
      // Enhanced charge parsing
      let fee = 0;

      if (cityData.charge !== null && cityData.charge !== undefined) {
        if (typeof cityData.charge === 'number') {
          fee = cityData.charge;
        } else if (typeof cityData.charge === 'string') {
          // Remove any non-numeric characters except decimal point
          const cleanCharge = cityData.charge.replace(/[^\d.]/g, '');
          fee = parseFloat(cleanCharge) || 0;
        }
      }

      console.log(`💰 Final delivery fee: Rs.${fee} for city: "${cityName}" (Original charge: ${cityData.charge})`);
      return fee;

    } else {
      console.warn(`❌ City '${cityName}' not found in delivery charges list`);
      console.log("Available cities:", cities.map(c => `"${c.city}"`).join(', '));

      // Try partial match as fallback with better logging
      const partialMatch = cities.find(c => {
        if (!c.city) return false;

        const dbCityName = c.city.toLowerCase().trim();
        const partialMatch1 = dbCityName.includes(searchCityName);
        const partialMatch2 = searchCityName.includes(dbCityName);

        if (partialMatch1 || partialMatch2) {
          console.log(`🎯 Partial match candidate: DB:"${c.city}" vs Search:"${cityName}"`);
          return true;
        }

        return false;
      });

      if (partialMatch) {
        console.log(`🎯 Using partial match: "${partialMatch.city}" for "${cityName}"`);

        let fee = 0;
        if (partialMatch.charge !== null && partialMatch.charge !== undefined) {
          if (typeof partialMatch.charge === 'number') {
            fee = partialMatch.charge;
          } else if (typeof partialMatch.charge === 'string') {
            const cleanCharge = partialMatch.charge.replace(/[^\d.]/g, '');
            fee = parseFloat(cleanCharge) || 0;
          }
        }

        console.log(`💰 Using partial match delivery fee: Rs.${fee}`);
        return fee;
      }

      console.log(`🚫 No match found for city: "${cityName}"`);
      return 0;
    }

  } catch (error) {
    console.error('💥 ERROR fetching delivery fee:', error);
    console.error('Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      url: error.config?.url
    });

    // Don't throw error, return 0 to continue processing
    console.log('⚠️ Returning 0 delivery fee due to error');
    return 0;
  }
};

// Updated function for getting delivery fee directly from a single order
export const getOrderDeliveryFee = async (orderData, authToken) => {
  try {
    if (!orderData || !authToken) {
      throw new Error("Missing required parameters: orderData or authToken");
    }

    const result = await getDeliveryFeeFromOrder(orderData, authToken);
    return result.deliveryFee;
  } catch (error) {
    console.error('Error getting order delivery fee:', error);
    return 0;
  }
};

// FIXED: Helper function to calculate total package price including all fees
const calculatePackageTotal = (pkg) => {
  const productPrice = parseFloat(pkg.productPrice || 0);
  const packingFee = parseFloat(pkg.packingFee || 0);
  const serviceFee = parseFloat(pkg.serviceFee || 0);
  return productPrice + packingFee + serviceFee;
};

// FIXED: Updated generateInvoiceHTML with conditional logic for service fee and coupon display
const generateInvoiceHTML = (orderData, customerData = null, deliveryFee = 0) => {
  console.log('generateInvoiceHTML called with:', {
    orderDataType: typeof orderData,
    isObject: typeof orderData === 'object' && orderData !== null,
    hasOrderId: !!orderData?.orderId,
    hasCustomerInfo: !!orderData?.customerInfo,
    packagesCount: orderData?.packages?.length || 0,
    deliveryFee: deliveryFee,
    invoiceNumber: orderData?.orderStatus?.invoiceNumber || orderData?.invoiceNumber || orderData?.invoiceNo || 'missing',
    orderApp: orderData?.orderApp,
    isPackage: orderData?.isPackage,
    couponValue: orderData?.couponValue
  });

  // Validate input data
  if (!orderData) {
    console.error('orderData is null or undefined');
    throw new Error('Order data is required for PDF generation');
  }

  if (typeof orderData !== 'object') {
    console.error('orderData is not an object, received:', typeof orderData, orderData);
    throw new Error(`Invalid order data type. Expected object, received ${typeof orderData}`);
  }

  // Handle the backend data structure - it's already a flat order object
  let order = orderData;
  let invoiceNumber = orderData.orderStatus?.invoiceNumber ||
    orderData.invoiceNumber ||
    orderData.invoiceNo ||
    `INV-${orderData.orderId || Date.now()}`;

  console.log('Successfully parsed order:', {
    orderId: order.orderId,
    invoiceNumber: invoiceNumber,
    customerInfo: order.customerInfo ? 'present' : 'missing',
    isPackage: order.isPackage,
    packagesCount: order.packages?.length || 0,
    additionalItems: order.additionalItems?.length || 0,
    deliveryFee: deliveryFee,
    orderApp: order.orderApp,
    couponValue: order.couponValue
  });

  const formatCurrency = (amount) => {
    const numAmount = parseFloat(amount) || 0;
    return `Rs. ${numAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };
  const formatItemCount = (count) => {
    return String(count).padStart(2, '0');
  };

  function formatPaymentMethod(paymentMethod) {
    if (!paymentMethod) return 'N/A';

    const paymentMethodMap = {
      'Cash': 'Cash on Delivery',
      'Card': 'Debit / Credit Card'
    };

    return paymentMethodMap[paymentMethod] || paymentMethod;
  }

  // FIXED: Calculate totals with conditional logic for service fee and coupon
  let totalPackagePrice = 0;
  let totalPackingFee = 0;
  let totalServiceFee = 0;
  let additionalItemsTotal = 0;
  let totaldiscount = parseFloat(order.discount || 0);
  let couponDiscount = parseFloat(order.couponValue || 0);

  // FIXED: Calculate totals from multiple packages - now includes all fees
  if (order.isPackage === 1 && order.packages && Array.isArray(order.packages) && order.packages.length > 0) {
    console.log(`Processing ${order.packages.length} packages`);

    order.packages.forEach((pkg, index) => {
      const packageTotal = calculatePackageTotal(pkg);
      console.log(`Package ${index + 1}:`, {
        packageId: pkg.packageId,
        displayName: pkg.displayName,
        productPrice: pkg.productPrice,
        packingFee: pkg.packingFee,
        serviceFee: pkg.serviceFee,
        packageTotal: packageTotal
      });

      totalPackagePrice += packageTotal; // Now includes productPrice + packingFee + serviceFee
      totalPackingFee += parseFloat(pkg.packingFee || 0);
      totalServiceFee += parseFloat(pkg.serviceFee || 0);
    });
  } else if (order.isPackage === 1) {
    console.warn('Order marked as package but packages array is missing or empty');
  } else {
    // For non-package orders, don't automatically add service fee
    totalServiceFee = 0;
  }

  // Calculate additional items total
  if (order.additionalItems && Array.isArray(order.additionalItems) && order.additionalItems.length > 0) {
    additionalItemsTotal = order?.additionalItems?.reduce((sum, item) => {
      const price = parseFloat(item.price?.toString() || '0');
      const discount = parseFloat(item.discount?.toString() || '0');
      const actualAmount = price + discount; // Use actual amount (price + discount)
      return sum + actualAmount;
    }, 0) || 0;
  }

  // FIXED: Calculate subtotal and total with conditional logic
  const subtotal = totalPackagePrice + additionalItemsTotal;
  const deliveryFeeAmount = parseFloat(deliveryFee || 0);

  // FIXED: Total calculation - DON'T add service fee or coupon if they have values in order
  let totalAmount = subtotal + deliveryFeeAmount;

  // FIXED: Only add service fee for Dash orders with isPackage = 0 AND if order doesn't already have service fee/coupon values
  const shouldAddServiceFee = order.orderApp === 'Dash' &&
    order.isPackage === 0 &&
    !order.couponValue &&
    !order.serviceFee;

  if (shouldAddServiceFee) {
    totalAmount += 180; // Add service fee to total
    totalServiceFee = 180; // Track for display
  }

  // Subtract discounts
  totalAmount -= totaldiscount;

  // FIXED: Only subtract coupon discount if order is Marketplace AND has coupon value AND we haven't already counted it
  if (order.orderApp === 'Marketplace' && couponDiscount > 0 && !order.serviceFee) {
    totalAmount -= couponDiscount;
  }

  console.log('FIXED Calculated totals:', {
    totalPackagePrice,
    totalPackingFee,
    additionalItemsTotal,
    totalServiceFee,
    discount: totaldiscount,
    couponDiscount: couponDiscount,
    deliveryFee: deliveryFeeAmount,
    subtotal,
    totalAmount,
    orderApp: order.orderApp,
    isPackage: order.isPackage,
    shouldAddServiceFee: shouldAddServiceFee,
    hasOrderServiceFee: !!order.serviceFee,
    hasOrderCouponValue: !!order.couponValue
  });

  // FIXED: Determine what to show based on order data
  const shouldShowServiceFee = () => {
    // Only show if we calculated it AND order doesn't have existing service fee/coupon values
    return shouldAddServiceFee;
  };

  const shouldShowCouponDiscount = () => {
    // Only show if order is Marketplace AND has coupon value AND no existing service fee
    return order.orderApp === 'Marketplace' && couponDiscount > 0 && !order.serviceFee;
  };



  const generatePackageSections = () => {
    if (!order.isPackage || !order.packages || !Array.isArray(order.packages) || order.packages.length === 0) {
      return '';
    }

    return order.packages.map((pkg, packageIndex) => {
      const packageTotal = calculatePackageTotal(pkg);
      console.log(`Generating section for package ${packageIndex + 1}:`, pkg.displayName, 'Total:', packageTotal);

      // FIXED: Calculate package items count
      const packageItemsCount = pkg.packageItems && Array.isArray(pkg.packageItems) ? pkg.packageItems.length : 0;

      // Generate package details rows for this specific package
      let packageDetailsRows = '';
      if (pkg.packageItems && Array.isArray(pkg.packageItems)) {
        packageDetailsRows = pkg.packageItems.map((item, itemIndex) => {
          const itemPrice = parseFloat(item.price || 0);
          const itemQty = parseFloat(item.qty || 0);
          const itemTotal = itemPrice * itemQty;

          return `
            <tr>
              <td style="text-align: center" class="tabledata">${itemIndex + 1}</td>
              <td class="tabledata">${item.productTypeName || item.category || 'N/A'}</td>
              <td class="tabledata">${item.productDisplayName || 'N/A'}</td>
              <td class="tabledata">${itemPrice.toFixed(2)}</td>
              <td class="tabledata">${itemQty}${item.unit || ''}</td>
              <td class="tabledata">${itemTotal.toFixed(2)}</td>
            </tr>
          `;
        }).join('');
      }

      return `
        <div class="section4">
          <div
            style="
              display: flex;
              justify-content: space-between;
              margin-bottom: 20px;
              border-bottom: 1px solid #ccc;
              padding-bottom: 10px;
              margin-top: 40px;
            "
          >
            <div class="bold">
              ${pkg.displayName || `Package ${packageIndex + 1}`} (${formatItemCount(packageItemsCount)} Items)
            
            </div>
            <div style="font-weight: 550; font-size: 16px">
              ${formatCurrency(packageTotal)}
            </div>
          </div>
          <div style="border: 1px solid #ddd; border-radius: 10px">
            ${packageDetailsRows ? `
              <table class="table">
                <tr>
                  <th style="text-align: center; border-top-left-radius: 10px">
                    Index
                  </th>
                  <th>Category</th>
                  <th>Item Description</th>
                  <th>Unit Price (Rs.)</th>
                  <th>QTY (Kg)</th>
                  <th style="border-top-right-radius: 10px">Amount (Rs.)</th>
                </tr>
                ${packageDetailsRows}
              </table>
            ` : `
              <div style="padding: 20px; text-align: center; color: #666;">
                Package items not available
              </div>
            `}
          </div>
        </div>
      `;
    }).join('');
  };

  // Generate additional items rows
  let additionalItemsRows = '';
  if (order?.additionalItems && order.additionalItems.length > 0) {
    order.additionalItems.forEach((item, index) => {
      const price = parseFloat(item.price?.toString() || '0');
      const discount = parseFloat(item.discount?.toString() || '0');
      const quantity = parseFloat(item.qty?.toString() || '0');
      const actualAmount = price + discount;
      const unitPrice = quantity > 0 ? (actualAmount / quantity) : 0;

      additionalItemsRows += `
      <tr>
        <td style="text-align: center">${index + 1}</td>
        <td class="tabledata">${item.displayName || item.name || 'Item'}</td>
        <td class="tabledata">${unitPrice.toFixed(2)}</td>
        <td class="tabledata">${quantity} </td>
        <td class="tabledata">${actualAmount.toFixed(2)}</td>
      </tr>`;
    });
  }

  // Safe date formatting
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).replace(/ /g, '-');
    } catch (e) {
      return 'N/A';
    }
  };

  // Safe customer info extraction
  const customerInfo = order.customerInfo || {};

  // Extract customer email properly from the order data
  const customerEmail = order.customerEmail ||
    order.email ||
    customerInfo.email ||
    customerData?.email ||
    'No email provided';

  return `
    <!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Purchase Invoice</title>

    <style>
    @page{
    margin-top:20px;
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
        justify-items: center;
        align-items: center;
      }
      .headerp {
        font-size: 14px;
        line-height: 10px;
      }
         .label {
    color: #929292; /* Gray color for labels */
    font-weight: 500;
  }
  
  .value {
    color: #000000; /* Dark color for values */
    font-weight: normal;
  }
      .logo {
        width: 180px;
        height: auto;
      }
      .bold {
        font-weight: 550;
        font-size: 14px;
      }
      .table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
      }
      .table th,
      .table td {
        border-left: none; 
        border-right: none; 
        padding: 15px;
        text-align: left;
      }
      .table th {
        background-color: #f8f8f8;
        font-size: 14px;
        font-weight: ;
        justify-items: center;
        border-bottom: 1px solid #ddd;
      }
      .tabledata {
        font-size: 14px;
        font-weight: bold;
        color: #666666;
      }
      .table td {
        text-align: left;
      }
      .footer {
        text-align: center;
        font-size: 12px;
        margin-top: 60px;
        color: #8492A3;
      }
      .section1 {
        margin-top: 10px;
      }
      .section2 {
        margin-top: 10px;
      }
      .section3 {
        margin-top: 10px;
      }
        .section {
        page-break-inside: avoid; /* Avoid page breaks inside these sections */
      }
      .section4 {
        page-break-inside: avoid; /* Avoid page breaks inside package sections */
        margin-bottom: 20px;
      }
      .ptext {
        font-size: 14px;
      }
    </style>
  </head>
  <body>
    <div class="invoice-container">
      <!-- Header Section -->
      <div class="top">
        <h1>INVOICE</h1>
      </div>
      <div class="header">
        <div>
          <p>
            <span style="font-weight: 550; font-size: 16px"
              >Polygon Agro Holdings (Private) Ltd</span
            >
          </p>
          <p class="headerp">No. 42/46, Nawam Mawatha, Colombo 02.</p>
          <p class="headerp">Contact No : +94 770 111 999</p>
          <p class="headerp">Email Address : info@polygon.lk</p>
        </div>
        <div>
          <img
            src="https://pub-79ee03a4a23e4dbbb70c7d799d3cb786.r2.dev/POLYGON%20ORIGINAL%20LOGO.png"
            alt="Polygon Logo"
            class="logo"
          />
        </div>
      </div>

      <!-- Billing Section -->
      <div
        class="section1"
        style="display: flex; justify-content: space-between"
      >
        <div>
          <p class="bold">Bill To :</p>
          <p class="headerp">${customerInfo.title || ''}.${customerInfo.firstName || ''} ${customerInfo.lastName || ''}</p>
          <p class="headerp"> +94 ${customerInfo.phoneNumber || ''}</p>
          <p class="headerp">${customerEmail}</p>
              <div style="margin-top: 10px">
      ${customerInfo.buildingType === 'apartment' ?
      `
        <p class="bold">Apartment Address :</p>
        <p class="headerp">${order.fullAddress || 'Address not available'}</p>
        `
      :
      `
        <p class="bold">Apartment Address :</p>
        <p class="headerp">${order.fullAddress || 'Address not available'}</p>
        `
    }
    </div>
          
        </div>
        <div>
          <div style="margin-right: 55px">
            <p class="bold">Grand Total :</p>
            <p style="font-weight: 550; font-size: 16px">${formatCurrency(totalAmount)}</p>
            <div class="section" style="margin-top: 30px">
              <p class="bold">Payment Method :</p>
                <p class="headerp">${formatPaymentMethod(orderData.orderStatus?.paymentMethod)}</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div
          class="section2"
          style="display: flex; justify-content: space-between"
        >
          <div>
            <p class="bold">Invoice No :</p>
            <p class="headerp">${invoiceNumber}</p>
          </div>
       <div style="margin-right: 79px">
            <p class="bold">Ordered Date :</p>
            <p class="headerp">${formatDate(order.createdAt)}</p>
          </div>
        </div>

        <div
          class="section2"
          style="display: flex; justify-content: space-between"
        >
          <div>
            <p class="bold">Delivery Method :</p>
            <p class="headerp">Home Delivery</p>
          </div>
          <div style="margin-right: 64px">
            <p class="bold">Scheduled Date :</p>
         <p class="headerp">${formatDate(order.scheduleDate)}</p>
          </div>
        </div>
      </div>

      <!-- Multiple Packages Section -->
      ${generatePackageSections()}

      <!-- Additional Items Section -->
      ${order.additionalItems && Array.isArray(order.additionalItems) && order.additionalItems.length > 0 ? `
      <div class="section4">
        <div
          style="
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            border-bottom: 1px solid #ccc;
            padding-bottom: 10px;
            margin-top:40px
          "
        >
         <div class="bold">Additional Items (${order.additionalItems.length || 0} Items)</div>
    <div style="font-weight: 550; font-size: 16px">${formatCurrency(additionalItemsTotal)}</div>
        </div>
        <div style="border: 1px solid #ddd; border-radius: 10px">
          <table class="table">
            <tr>
              <th style="text-align: center; border-top-left-radius: 10px">
                Index
              </th>
              <th>Item Description</th>
              <th>Unit Price (Rs.)</th>
              <th>QTY (Kg)</th>
              <th style="border-top-right-radius: 10px">Amount (Rs.)</th>
            </tr>
            ${additionalItemsRows}
          </table>
        </div>
      </div>` : ''}

      <!-- FIXED: Grand Total Section with proper conditional logic -->
      <div class="section" style="margin-top: 30px">
        <div style="margin-bottom: 20px; border-bottom: 1px solid #ccc;padding-bottom: 10px;" >
          <div class="bold">Grand Total for all items</div>
        </div>
     ${order.isPackage === 1 && totalPackagePrice > 0 ? `
<div style="display: flex; justify-content: space-between; margin-right: 20px;" class="ptext"> 
  <p>${order.packages?.length === 1 ?
        (order.packages[0].displayName || 'Package') :
        `Total Price for Packages `}</p>
  <p>${formatCurrency(totalPackagePrice)}</p>
</div>` : ''}
       
        ${order.additionalItems && Array.isArray(order.additionalItems) && order.additionalItems.length > 0 ? `
        <div style=" display: flex; justify-content: space-between; margin-right: 20px;" class="ptext" > 
          <p>${order?.isPackage === 1 ? 'Additional Items' : 'Custom Items'}</p>
          <p>Rs. ${additionalItemsTotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</p>
        </div>` : ''}
        
    
        
        ${shouldShowServiceFee() ? `
  <div style="display: flex; justify-content: space-between; margin-right: 20px; " class="ptext" >
    <p>Service Fee</p>
    <p>Rs. 180.00</p>
  </div>` : ''}



        
        ${deliveryFeeAmount > 0 ? `
        <div style="display: flex; justify-content: space-between; margin-right: 20px;"class="ptext" >
          <p>Delivery Fee</p>
          <p>${formatCurrency(deliveryFeeAmount)}</p>
        </div>` : ''}

        ${shouldShowCouponDiscount() ? `
  <div style="display: flex; justify-content: space-between; margin-right: 20px;" class="ptext" >
    <p>Coupon Discount</p>
    <p>${formatCurrency(couponDiscount)}</p>
  </div>` : ''}

       
      </div>
        ${totaldiscount > 0 ? `
        <div style="display: flex; justify-content: space-between; margin-right: 20px;" class="ptext" >
          <p>Discount</p>
          <p>${formatCurrency(totaldiscount)}</p>
        </div>` : ''}

         <div style="margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px;" ></div>

      <!-- Payment Method Section -->
      <div style="margin-top: -10px; display: flex; justify-content: space-between; font-size: 16px; font-weight: 600; margin-right: 20px;">
        <p>Grand Total</p>
        <p>${formatCurrency(totalAmount)}</p>
      </div>

      <!-- Remarks Section -->
      <div class="section">
        <p style=" margin-top: 50px; display: flex; justify-content: space-between; font-size: 14px; font-weight: 600;">
          Remarks :
        </p>

        <div   style="color: #666666; font-size: 12px; line-height: 10px;">
          <p>Kindly inspect all goods at the time of delivery to ensure accuracy and condition.</p>
          <p>Polygon does not accept returns under any circumstances.</p>
          <p>Please report any issues or discrepancies within 24 hours of delivery to ensure prompt attention.</p>
          <p>For any assistance, feel free to contact our customer service team.</p>
        </div>
       
      </div>

      <!-- Footer Section -->
      <div class="footer">
        <p  style=" margin-top: 50px; font-size: 16px; font-weight: 600; color:#000; font-style:italic">Thank you for shopping with us!</p>
        <p  style=" margin-top: -5px; font-size: 14px; font-weight: 500; color:#4B4B4B; font-style:italic">WE WILL SEND YOU MORE OFFERS, LOWEST PRICED VEGGIES FROM US.</p>
        <p style=" margin-top: 50px; font-style:italic">
          - THIS IS A COMPUTER GENERATED INVOICE, THUS NO SIGNATURE REQUIRED -
        </p>
      </div>
    </div>
  </body>
</html>
  `;
}

export const generateOrderPDF = async (orderData, deliveryFee = 0) => {
  try {
    console.log('generateOrderPDF called with:', { orderData, deliveryFee });

    // Pass deliveryFee to generateInvoiceHTML
    const htmlContent = generateInvoiceHTML(orderData, null, deliveryFee);
    const { base64 } = await Print.printToFileAsync({
      html: htmlContent,
      width: 595,
      height: 842,
      base64: true
    });

    if (!base64) {
      throw new Error('Failed to generate PDF base64');
    }

    return base64;
  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }
};

// Function to send PDF emails
export const sendPDFEmails = async (emailsData, authToken) => {
  try {
    // Transform the data to match backend expectations
    const emailPayload = emailsData.map(emailData => ({
      email: emailData.email,
      fileName: emailData.fileName,
      pdfBase64: emailData.pdfBase64
    }));

    console.log('Sending email payload:', emailPayload.length, 'emails');
    console.log('First email details:', {
      email: emailPayload[0]?.email,
      fileName: emailPayload[0]?.fileName,
      pdfSize: emailPayload[0]?.pdfBase64?.length
    });

    const response = await axios.post(
      `${environment.API_BASE_URL}api/email/send-pdf-email`,
      emailPayload, // Send array directly, not nested under 'emails'
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    console.log('Email API response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error sending PDF emails:', error);

    // More detailed error handling
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);

      if (error.response.status === 401) {
        throw new Error('Authentication failed. Please login again.');
      } else if (error.response.status === 413) {
        throw new Error('File too large. Please reduce the PDF size.');
      } else if (error.response.data?.message) {
        throw new Error(error.response.data.message);
      }
    } else if (error.request) {
      console.error('Request:', error.request);
      throw new Error('No response received from server. Please check your connection.');
    } else {
      throw new Error('Error setting up request: ' + error.message);
    }

    throw new Error('Failed to send emails. Please try again later.');
  }
};

// Function to share PDF locally (for testing)
export const sharePDF = async (pdfUri) => {
  try {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(pdfUri);
    } else {
      console.log('Sharing is not available on this platform');
    }
  } catch (error) {
    console.error('Error sharing PDF:', error);
    throw error;
  }
};