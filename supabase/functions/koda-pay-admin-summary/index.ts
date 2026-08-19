import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authorization = req.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "server_configuration_error" }, 500);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const token = authorization.slice("Bearer ".length);
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const user = userData.user;
  if (userError || !user) return json({ error: "unauthorized" }, 401);

  const { data: role } = await admin
    .from("user_roles")
    .select("id")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!role) return json({ error: "forbidden" }, 403);

  const [productsResult, ordersResult, paymentsResult, refundsResult] = await Promise.all([
    admin
      .from("commerce_products")
      .select("id,slug,name,active,currency,unit_amount_cents,track_stock,stock_quantity,updated_at")
      .order("name"),
    admin
      .from("orders")
      .select(
        "id,order_number,status,currency,subtotal_cents,shipping_cents,discount_cents,total_cents,customer_name,customer_email,shipping_address,tracking_code,created_at,paid_at,shipped_at,delivered_at,updated_at,order_items(id,product_name,quantity,total_amount_cents)",
      )
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("payments")
      .select("id,order_id,provider_key,method,status,amount_cents,card_brand,card_last4,created_at,paid_at")
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("refunds")
      .select("id,order_id,payment_id,amount_cents,status,reason,created_at,completed_at")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const error = productsResult.error ?? ordersResult.error ?? paymentsResult.error ?? refundsResult.error;
  if (error) return json({ error: "finance_query_failed" }, 500);

  const orders = ordersResult.data ?? [];
  const payments = paymentsResult.data ?? [];
  const refunds = refundsResult.data ?? [];
  const confirmedRevenue = payments
    .filter((item) => item.status === "paid")
    .reduce((sum, item) => sum + item.amount_cents, 0);
  const refunded = refunds
    .filter((item) => item.status === "succeeded")
    .reduce((sum, item) => sum + item.amount_cents, 0);

  return json({
    metrics: {
      orders: orders.length,
      awaiting_payment: orders.filter((item) => ["draft", "pending_payment"].includes(item.status)).length,
      paid_orders: orders.filter((item) => ["paid", "processing", "shipped", "delivered"].includes(item.status)).length,
      confirmed_revenue_cents: confirmedRevenue,
      refunded_cents: refunded,
    },
    products: productsResult.data ?? [],
    orders,
    payments,
    refunds,
  });
});
