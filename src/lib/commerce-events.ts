import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "koda_commerce_session";

function sessionId() {
  if (typeof window === "undefined") return "server-session";
  const current = window.sessionStorage.getItem(SESSION_KEY);
  if (current) return current;
  const created = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  window.sessionStorage.setItem(SESSION_KEY, created);
  return created;
}

export function trackCommerceEvent(
  eventName:
    | "page_view"
    | "guided_purchase_started"
    | "guided_purchase_completed"
    | "checkout_started"
    | "shipping_calculated"
    | "payment_started"
    | "order_created"
    | "waitlist_joined",
  productSlug?: string,
  metadata: Record<string, string | number | boolean> = {},
) {
  if (typeof window === "undefined") return;
  const rpc = supabase.rpc as unknown as (
    name: string,
    args: Record<string, unknown>,
  ) => PromiseLike<unknown>;
  void rpc("track_commerce_event", {
    _event_name: eventName,
    _session_id: sessionId(),
    _product_slug: productSlug ?? null,
    _source_path: window.location.pathname,
    _metadata: metadata,
  });
}
