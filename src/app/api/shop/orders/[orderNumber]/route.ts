import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { orderNumber } = await params;

    // Require authentication to view order details
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required to view order details" },
        { status: 401 }
      );
    }

    // Rate limit
    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    // Get order - verify ownership
    const orderQuery = supabase
      .from("shop_orders")
      .select(`
        id,
        order_number,
        customer_name,
        customer_email,
        customer_phone,
        shipping_address_line1,
        shipping_address_line2,
        shipping_city,
        shipping_state,
        shipping_postal_code,
        shipping_country,
        subtotal,
        shipping_cost,
        tax_amount,
        discount_amount,
        total,
        status,
        payment_status,
        paid_at,
        customer_notes,
        created_at,
        updated_at,
        items:shop_order_items(
          id,
          product_name,
          variant_sku,
          variant_size,
          variant_color,
          quantity,
          unit_price,
          line_total,
          fulfillment_status,
          shipped_at,
          tracking_number,
          tracking_carrier,
          delivered_at,
          return_status,
          brand:shop_brands(
            id,
            name,
            slug,
            logo_url,
            avg_ship_days
          ),
          variant:shop_product_variants(
            image_url,
            product:shop_products(
              slug,
              images
            )
          )
        )
      `)
      .eq("order_number", orderNumber)
      .eq("user_id", user.id);

    const { data: order, error } = await orderQuery.single();

    if (error || !order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Transform order data
    const transformedOrder = {
      id: order.id,
      orderNumber: order.order_number,
      customer: {
        name: order.customer_name,
        email: order.customer_email,
        phone: order.customer_phone,
      },
      shippingAddress: {
        line1: order.shipping_address_line1,
        line2: order.shipping_address_line2,
        city: order.shipping_city,
        state: order.shipping_state,
        postalCode: order.shipping_postal_code,
        country: order.shipping_country,
      },
      totals: {
        subtotal: order.subtotal,
        shipping: order.shipping_cost,
        tax: order.tax_amount,
        discount: order.discount_amount,
        total: order.total,
      },
      status: order.status,
      paymentStatus: order.payment_status,
      paidAt: order.paid_at,
      notes: order.customer_notes,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      items: order.items?.map((item: any) => ({
        id: item.id,
        productName: item.product_name,
        sku: item.variant_sku,
        size: item.variant_size,
        color: item.variant_color,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        lineTotal: item.line_total,
        fulfillmentStatus: item.fulfillment_status,
        shippedAt: item.shipped_at,
        deliveredAt: item.delivered_at,
        returnStatus: item.return_status,
        tracking: item.tracking_number
          ? {
              number: item.tracking_number,
              carrier: item.tracking_carrier,
              url: getTrackingUrl(item.tracking_carrier, item.tracking_number),
            }
          : null,
        brand: {
          id: item.brand?.id,
          name: item.brand?.name,
          slug: item.brand?.slug,
          logoUrl: item.brand?.logo_url,
          avgShipDays: item.brand?.avg_ship_days,
        },
        image: item.variant?.image_url || item.variant?.product?.images?.[0],
        productSlug: item.variant?.product?.slug,
      })) || [],
    };

    // Group items by brand for multi-brand orders
    const brandGroups: Record<string, any> = {};
    transformedOrder.items.forEach((item: any) => {
      const brandId = item.brand.id;
      if (!brandGroups[brandId]) {
        brandGroups[brandId] = {
          brand: item.brand,
          items: [],
          fulfillmentStatus: item.fulfillmentStatus,
        };
      }
      brandGroups[brandId].items.push(item);
      // Update brand group status based on items
      if (item.fulfillmentStatus === "pending") {
        brandGroups[brandId].fulfillmentStatus = "pending";
      } else if (item.fulfillmentStatus === "shipped" && brandGroups[brandId].fulfillmentStatus !== "pending") {
        brandGroups[brandId].fulfillmentStatus = "shipped";
      }
    });

    return NextResponse.json({
      order: transformedOrder,
      brandGroups: Object.values(brandGroups),
    });
  } catch (error) {
    console.error("Order detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}

function getTrackingUrl(carrier: string | null, trackingNumber: string): string | null {
  if (!carrier || !trackingNumber) return null;

  const carrierLower = carrier.toLowerCase();

  if (carrierLower.includes("usps")) {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
  }
  if (carrierLower.includes("ups")) {
    return `https://www.ups.com/track?tracknum=${trackingNumber}`;
  }
  if (carrierLower.includes("fedex")) {
    return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
  }
  if (carrierLower.includes("dhl")) {
    return `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${trackingNumber}`;
  }

  return null;
}
