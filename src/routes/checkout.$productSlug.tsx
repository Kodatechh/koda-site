import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  LoaderCircle,
  LockKeyhole,
  QrCode,
  Recycle,
  ShieldCheck,
  Cable,
  Truck,
} from "lucide-react";

import { useAuth } from "@/components/koda/AuthProvider";
import { CardPaymentBrick } from "@/components/koda/CardPaymentBrick";
import { Nav } from "@/components/koda/Nav";
import { SiteFooter } from "@/components/koda/SiteFooter";
import { supabase } from "@/integrations/supabase/client";

type CatalogProduct = {
  slug: string;
  name: string;
  short_description: string | null;
  description: string | null;
  product_type: "physical" | "digital" | "service" | "coverage" | "subscription";
  image_url: string | null;
  available: boolean;
  currency: string;
  unit_amount_cents: number | null;
  compare_at_cents: number | null;
  in_stock: boolean;
  requires_shipping: boolean;
  requires_device: boolean;
  sales_mode?: "preorder" | "standard" | "waitlist";
  launch_at?: string | null;
  purchase_enabled?: boolean;
  waitlist_enabled?: boolean;
};

type KodaPayStatus = {
  provider: "mercado_pago";
  payment_ready: boolean;
  methods: Array<"pix" | "card">;
  ready_methods: Array<"pix" | "card">;
  message: string;
};

type CatalogResponse = { product: CatalogProduct; koda_pay: KodaPayStatus };

type CreatedOrder = {
  id: string;
  order_number?: number;
  display_number?: string;
  status: string;
  order_type?: string;
  currency?: string;
  subtotal_cents?: number;
  shipping_cents?: number;
  discount_cents?: number;
  total_cents?: number;
  fulfillment_status?: string;
  sales_mode?: "standard" | "preorder";
  release_at?: string | null;
  estimated_ship_start_at?: string | null;
};

type PixPayment = {
  id: string;
  provider_order_id: string;
  provider_payment_id: string | null;
  status: string;
  status_detail: string | null;
  local_status: string;
  qr_code: string;
  qr_code_base64: string | null;
  ticket_url: string | null;
};

type KodaDevice = {
  id: string;
  serial_number: string;
  model: string;
  purchase_date: string | null;
  kodaos_version?: string | null;
  eligible?: boolean;
  eligibility_deadline?: string | null;
  current_plan?: string | null;
};

type ShippingOption = {
  id: string;
  service_id?: string;
  name: string;
  company?: string | null;
  price_cents: number;
  deadline_days: number | null;
  quote_token: string;
  expires_at?: string;
};

type ShippingResponse = {
  provider: string;
  configured: boolean;
  options: ShippingOption[];
  error?: string;
};

type Address = {
  recipient: string;
  postalCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  phone: string;
};

type PaymentMethod = "pix" | "card";
type TradeInRequest = {
  id: string;
  source_model: "kodabot-i" | "kodabot-i-pro";
  serial_number: string;
  final_credit_cents: number;
  coupon_code: string;
  status: string;
};

const emptyAddress: Address = {
  recipient: "",
  postalCode: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  phone: "",
};

export const Route = createFileRoute("/checkout/$productSlug")({
  head: () => ({
    meta: [
      { title: "Finalizar compra — Koda" },
      { name: "description", content: "Finalize sua compra com o checkout seguro da Koda." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: CheckoutPage,
});

function formatMoney(cents: number | null | undefined, currency = "BRL") {
  if (cents == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(cents / 100);
}

function createCheckoutReference() {
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid ?? `checkout_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function displayModel(model: string) {
  if (model === "kodabot-i") return "KodaBot";
  if (model === "kodabot-i-pro") return "KodaBot Pro";
  return model;
}

function validCpf(value: string) {
  if (!/^\d{11}$/.test(value) || /^(\d)\1{10}$/.test(value)) return false;
  const calc = (length: number) => {
    let sum = 0;
    for (let i = 0; i < length; i += 1) sum += Number(value[i]) * (length + 1 - i);
    const digit = 11 - (sum % 11);
    return digit >= 10 ? 0 : digit;
  };
  return calc(9) === Number(value[9]) && calc(10) === Number(value[10]);
}

function validCnpj(value: string) {
  if (!/^\d{14}$/.test(value) || /^(\d)\1{13}$/.test(value)) return false;
  const digit = (base: string, weights: number[]) => {
    const sum = base
      .split("")
      .reduce((total, current, index) => total + Number(current) * (weights[index] ?? 0), 0);
    const result = 11 - (sum % 11);
    return result >= 10 ? 0 : result;
  };
  const first = digit(value.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = digit(value.slice(0, 12) + first, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return first === Number(value[12]) && second === Number(value[13]);
}

function validTaxId(value: string) {
  const clean = value.replace(/\D/g, "");
  return clean.length === 11 ? validCpf(clean) : clean.length === 14 ? validCnpj(clean) : false;
}

async function functionErrorCode(error: unknown) {
  const context = (error as { context?: Response })?.context;
  if (!context) return null;
  try {
    const clone = context.clone();
    const body = await clone.json();
    return typeof body?.error === "string" ? body.error : null;
  } catch {
    return null;
  }
}

function friendlyError(code: string | null, fallback: string) {
  const messages: Record<string, string> = {
    device_required: "Escolha o KodaBot que será vinculado a esta compra.",
    device_not_owned: "Este KodaBot não pertence à sua Conta Koda.",
    device_not_eligible_for_kodacare:
      "Este KodaBot não está elegível para contratar KodaCare agora.",
    invalid_customer_tax_id: "Confira o CPF ou CNPJ informado para a nota fiscal.",
    shipping_address_required: "Preencha o endereço de entrega antes de continuar.",
    invalid_shipping_address: "Confira os dados do endereço de entrega.",
    shipping_provider_not_configured:
      "A entrega deste produto ainda precisa ser configurada pela Koda.",
    shipping_origin_not_configured: "A origem de envio ainda precisa ser configurada pela Koda.",
    shipping_dimensions_missing: "As dimensões de envio deste produto ainda não foram cadastradas.",
    flat_shipping_not_configured: "O valor de entrega deste produto ainda não foi configurado.",
    shipping_no_options: "Não encontramos uma opção de entrega para este CEP.",
    shipping_provider_error:
      "A transportadora não respondeu corretamente. Tente calcular a entrega novamente.",
    shipping_service_invalid: "A opção de entrega expirou ou mudou. Calcule o frete novamente.",
    shipping_quote_required: "Calcule e escolha a entrega novamente.",
    invalid_add_on: "Revise o acessório adicionado ao pedido.",
    add_on_not_available: "O acessório escolhido não está disponível para esta compra.",
    insufficient_stock: "Não há estoque suficiente para esta quantidade.",
    product_unavailable: "Este produto não está disponível para compra agora.",
    trade_in_not_available: "Esta avaliação de Trade In não está mais disponível.",
    trade_in_not_available_for_product:
      "O crédito de Trade In só pode ser usado em um novo KodaBot.",
    trade_in_device_not_owned: "O KodaBot do Trade In não está vinculado à sua conta.",
    trade_in_reservation_failed:
      "Não foi possível reservar o crédito de Trade In. Tente novamente.",
  };
  return code ? (messages[code] ?? fallback) : fallback;
}

function Field({
  label,
  value,
  onChange,
  disabled,
  className = "",
  maxLength,
  inputMode,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  maxLength?: number;
  inputMode?: "text" | "numeric" | "tel";
  placeholder?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[11px] font-semibold text-[#6e6e73]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        maxLength={maxLength}
        inputMode={inputMode}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10 disabled:bg-[#f5f5f7] disabled:text-[#86868b]"
      />
    </label>
  );
}

function CheckoutPage() {
  const { productSlug } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  // Commerce tables are newer than the generated public client types in this mirror.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<CreatedOrder | null>(null);
  const [pix, setPix] = useState<PixPayment | null>(null);
  const [copied, setCopied] = useState(false);
  const [checkoutReference] = useState(createCheckoutReference);
  const [customerTaxId, setCustomerTaxId] = useState("");
  const [couponCode, setCouponCode] = useState(() =>
    typeof window === "undefined"
      ? ""
      : (new URLSearchParams(window.location.search).get("coupon") ?? ""),
  );
  const [tradeIn, setTradeIn] = useState<TradeInRequest | null>(null);
  const [includePowerAdapter, setIncludePowerAdapter] = useState(() =>
    typeof window === "undefined"
      ? false
      : new URLSearchParams(window.location.search).get("adapter") === "1",
  );

  const [devices, setDevices] = useState<KodaDevice[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");

  const [address, setAddress] = useState<Address>(() => ({
    ...emptyAddress,
    postalCode:
      typeof window === "undefined"
        ? ""
        : (new URLSearchParams(window.location.search).get("cep") ?? "")
            .replace(/\D/g, "")
            .slice(0, 8),
  }));
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [shippingProvider, setShippingProvider] = useState<string | null>(null);
  const [selectedShippingId, setSelectedShippingId] = useState("");

  useEffect(() => {
    let alive = true;
    async function loadCatalog() {
      setLoading(true);
      setError(null);
      const { data, error: invokeError } = await supabase.functions.invoke<CatalogResponse>(
        "koda-pay-catalog",
        { body: { productSlug } },
      );
      if (!alive) return;
      if (invokeError || !data?.product) {
        setError("Não foi possível carregar este produto agora.");
        setCatalog(null);
      } else {
        setCatalog(data);
        if (data.product.requires_device || data.product.product_type === "coverage")
          setQuantity(1);
        if (
          !data.koda_pay.ready_methods.includes("pix") &&
          data.koda_pay.ready_methods.includes("card")
        )
          setPaymentMethod("card");
      }
      setLoading(false);
    }
    void loadCatalog();
    return () => {
      alive = false;
    };
  }, [productSlug]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    async function loadAddress() {
      const { data } = await db
        .from("user_addresses")
        .select("recipient_name,postal_code,street,number,complement,neighborhood,city,state")
        .eq("user_id", user!.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!alive || !data) return;
      setAddress((current) => ({
        ...current,
        recipient: data.recipient_name ?? current.recipient,
        postalCode: data.postal_code ?? current.postalCode,
        street: data.street ?? current.street,
        number: data.number ?? current.number,
        complement: data.complement ?? current.complement,
        neighborhood: data.neighborhood ?? current.neighborhood,
        city: data.city ?? current.city,
        state: data.state ?? current.state,
      }));
    }
    void loadAddress();
    return () => {
      alive = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user || !couponCode.trim()) {
      setTradeIn(null);
      return;
    }
    db.from("trade_in_requests")
      .select("id,source_model,serial_number,final_credit_cents,coupon_code,status")
      .eq("coupon_code", couponCode.trim().toUpperCase())
      .eq("user_id", user.id)
      .eq("status", "accepted")
      .maybeSingle()
      .then(({ data }: { data: TradeInRequest | null }) => setTradeIn(data));
  }, [couponCode, db, user?.id]);

  useEffect(() => {
    const requiresOwnedDevice = Boolean(
      catalog?.product.requires_device || catalog?.product.product_type === "coverage",
    );
    if (!user || !requiresOwnedDevice) {
      setDevices([]);
      setSelectedDeviceId("");
      return;
    }
    let alive = true;
    async function loadDevices() {
      setDevicesLoading(true);
      const { data } = await db
        .from("devices")
        .select("id,serial_number,model,purchase_date,kodaos_version")
        .eq("owner_user_id", user!.id)
        .order("activated_at", { ascending: false });
      let result: KodaDevice[] = data ?? [];
      if (catalog!.product.product_type === "coverage") {
        result = await Promise.all(
          result.map(async (device) => {
            const { data: raw } = await db.rpc("get_device_kodacare_status", {
              _device_id: device.id,
            });
            const status = Array.isArray(raw) ? raw[0] : raw;
            return {
              ...device,
              eligible: Boolean(status?.eligible),
              eligibility_deadline: status?.eligibility_deadline ?? null,
              current_plan: status?.plan ?? null,
            };
          }),
        );
      }
      if (!alive) return;
      setDevices(result);
      const firstEligible = result.find(
        (device) => catalog!.product.product_type !== "coverage" || device.eligible,
      );
      setSelectedDeviceId((current) => current || firstEligible?.id || "");
      setDevicesLoading(false);
    }
    void loadDevices();
    return () => {
      alive = false;
    };
  }, [
    user?.id,
    catalog?.product.slug,
    catalog?.product.requires_device,
    catalog?.product.product_type,
  ]);

  useEffect(() => {
    setShippingOptions([]);
    setSelectedShippingId("");
    setShippingProvider(null);
  }, [quantity, address.postalCode, catalog?.product.slug]);

  useEffect(() => {
    if (!order?.id || !user) return;
    let alive = true;
    const check = async () => {
      const { data } = await db
        .from("orders")
        .select("id,status,fulfillment_status,total_cents,shipping_cents")
        .eq("id", order.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (alive && data) setOrder((current) => (current ? { ...current, ...data } : current));
    };
    void check();
    const timer = window.setInterval(check, 3000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [order?.id, user?.id]);

  const shippingRequired = Boolean(catalog?.product.requires_shipping);
  const deviceRequired = Boolean(
    catalog?.product.requires_device || catalog?.product.product_type === "coverage",
  );
  const paymentLocked = Boolean(order || pix || submitting);
  const pixReady = Boolean(catalog?.koda_pay.ready_methods.includes("pix"));
  const cardReady = Boolean(catalog?.koda_pay.ready_methods.includes("card"));
  const selectedShipping =
    shippingOptions.find((option) => option.id === selectedShippingId) ?? null;
  const selectedDevice = devices.find((device) => device.id === selectedDeviceId) ?? null;

  const addressValid = useMemo(() => {
    if (!shippingRequired) return true;
    return Boolean(
      address.recipient.trim() &&
      address.postalCode.replace(/\D/g, "").length === 8 &&
      address.street.trim() &&
      address.number.trim() &&
      address.neighborhood.trim() &&
      address.city.trim() &&
      /^[A-Za-z]{2}$/.test(address.state.trim()),
    );
  }, [address, shippingRequired]);

  const subtotalCents = useMemo(() => {
    const unit = catalog?.product.unit_amount_cents;
    return unit == null ? null : unit * quantity + (includePowerAdapter ? 1490 : 0);
  }, [catalog?.product.unit_amount_cents, includePowerAdapter, quantity]);

  const tradeInCreditCents = tradeIn?.final_credit_cents ?? 0;
  const totalCents =
    subtotalCents == null
      ? null
      : Math.max(0, subtotalCents + (selectedShipping?.price_cents ?? 0) - tradeInCreditCents);
  const deviceReady = !deviceRequired || Boolean(selectedDeviceId);
  const shippingReady =
    !shippingRequired || (addressValid && Boolean(selectedShipping?.quote_token));
  const taxIdReady = validTaxId(customerTaxId);
  const checkoutReady = Boolean(
    user && catalog?.product.available && deviceReady && shippingReady && taxIdReady,
  );
  const paid = Boolean(
    order && ["paid", "processing", "shipped", "delivered"].includes(order.status),
  );

  useEffect(() => {
    if (!paid || !order?.id) return;
    window.location.replace(`/pedido-confirmado/${order.id}`);
  }, [order?.id, paid]);

  const orderRequest = useMemo(
    () => ({
      productSlug: catalog?.product.slug ?? productSlug,
      quantity,
      checkoutReference,
      customerTaxId: customerTaxId.replace(/\D/g, ""),
      ...(tradeIn?.coupon_code ? { couponCode: tradeIn.coupon_code } : {}),
      ...(includePowerAdapter
        ? { addOns: [{ slug: "adaptador-energia-usb-2a", quantity: 1 }] }
        : {}),
      ...(deviceRequired && selectedDeviceId ? { deviceId: selectedDeviceId } : {}),
      ...(shippingRequired
        ? { shippingAddress: address as unknown as Record<string, string> }
        : {}),
      ...(shippingRequired && selectedShipping?.quote_token
        ? { shippingQuoteToken: selectedShipping.quote_token }
        : {}),
    }),
    [
      catalog?.product.slug,
      productSlug,
      quantity,
      checkoutReference,
      customerTaxId,
      tradeIn?.coupon_code,
      includePowerAdapter,
      deviceRequired,
      selectedDeviceId,
      shippingRequired,
      address,
      selectedShipping?.quote_token,
    ],
  );

  function updateAddress(field: keyof Address, value: string) {
    setAddress((current) => ({
      ...current,
      [field]: field === "state" ? value.toUpperCase().slice(0, 2) : value,
    }));
  }

  async function calculateShipping() {
    if (!catalog?.product.requires_shipping) return;
    if (!user) {
      setError("Entre na Conta Koda para calcular a entrega.");
      return;
    }
    const postalCode = address.postalCode.replace(/\D/g, "");
    if (postalCode.length !== 8) {
      setError("Informe um CEP válido para calcular a entrega.");
      return;
    }
    setShippingLoading(true);
    setError(null);
    const { data, error: invokeError } = await supabase.functions.invoke<ShippingResponse>(
      "koda-shipping",
      { body: { postalCode, productSlug: catalog.product.slug, quantity } },
    );
    if (invokeError || !data?.configured || !data.options?.length) {
      const code = data?.error ?? (await functionErrorCode(invokeError));
      setError(friendlyError(code, "Não foi possível calcular a entrega para este CEP."));
      setShippingOptions([]);
      setSelectedShippingId("");
      setShippingProvider(null);
      setShippingLoading(false);
      return;
    }
    setShippingOptions(data.options);
    setShippingProvider(data.provider);
    setSelectedShippingId(data.options[0]!.id);
    setShippingLoading(false);
  }

  async function createOrder() {
    const { data, error: invokeError } = await supabase.functions.invoke<{ order: CreatedOrder }>(
      "koda-pay-create-order",
      { body: orderRequest },
    );
    if (invokeError || !data?.order) {
      const code = await functionErrorCode(invokeError);
      throw new Error(
        friendlyError(code, "Não foi possível criar o pedido. Nenhuma cobrança foi feita."),
      );
    }
    setOrder(data.order);
    return data.order;
  }

  async function generatePix(orderId: string) {
    const { data, error: invokeError } = await supabase.functions.invoke<{ payment: PixPayment }>(
      "koda-pay-mercadopago-pix",
      { body: { orderId } },
    );
    if (invokeError || !data?.payment?.qr_code) {
      setError(
        "Seu pedido foi criado, mas não conseguimos gerar o Pix agora. Você pode tentar novamente sem criar outro pedido.",
      );
      return false;
    }
    setPix(data.payment);
    return true;
  }

  async function createPixOrder() {
    if (!checkoutReady || paymentMethod !== "pix" || !pixReady || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = order ?? (await createOrder());
      await generatePix(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível iniciar o pagamento.");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyPix() {
    if (!pix?.qr_code) return;
    try {
      await navigator.clipboard.writeText(pix.qr_code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Não foi possível copiar automaticamente. Selecione o código Pix manualmente.");
    }
  }

  if (paid && order) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
        <Nav />
        <main className="mx-auto max-w-3xl px-5 py-16 sm:py-24">
          <section className="rounded-[40px] bg-white px-7 py-16 text-center sm:px-14 sm:py-20">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#eaf8ee] text-[#248a3d]">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <p className="mt-7 text-sm font-semibold text-[#248a3d]">
              {order.sales_mode === "preorder" ? "Pré-venda confirmada" : "Pagamento confirmado"}
            </p>
            <h1 className="mx-auto mt-2 max-w-xl text-5xl font-semibold tracking-[-.06em] sm:text-6xl">
              {order.sales_mode === "preorder"
                ? "Sua unidade está reservada."
                : "Tudo certo com seu pedido."}
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-[#6e6e73]">
              {catalog?.product.product_type === "coverage"
                ? "O KodaCare+ pertence à sua Conta Koda e já está aplicado ao KodaBot escolhido."
                : order.sales_mode === "preorder"
                  ? "A Koda recebeu a confirmação do pagamento. O lançamento e o início dos envios estão previstos para 17 de outubro de 2026."
                  : "A Koda recebeu a confirmação do pagamento. Preparação, envio e entrega aparecem na sua Conta Koda."}
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <a
                href={`/conta/pedidos/${order.id}`}
                className="rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0077ed]"
              >
                Acompanhar pedido
              </a>
              <a
                href="/conta"
                className="rounded-full bg-[#f5f5f7] px-6 py-3 text-sm font-semibold"
              >
                Minha Conta Koda
              </a>
            </div>
          </section>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <Nav />
      <main className="mx-auto max-w-[1180px] px-5 py-10 sm:py-16">
        <div className="mb-8 flex items-center gap-2 text-xs font-semibold text-[#6e6e73]">
          <ShieldCheck className="h-4 w-4 text-[#0071e3]" />
          Koda Pay · checkout seguro
        </div>
        {loading || authLoading ? (
          <div className="grid min-h-[560px] place-items-center rounded-[38px] bg-white">
            <div className="text-center">
              <LoaderCircle className="mx-auto h-7 w-7 animate-spin text-[#0071e3]" />
              <p className="mt-3 text-sm text-[#6e6e73]">Preparando sua compra…</p>
            </div>
          </div>
        ) : error && !catalog ? (
          <div className="rounded-[38px] bg-white p-12 text-center">
            <h1 className="text-4xl font-semibold tracking-[-.05em]">Checkout indisponível.</h1>
            <p className="mt-4 text-sm text-[#6e6e73]">{error}</p>
            <a href="/loja" className="mt-7 inline-flex text-sm font-semibold text-[#0066cc]">
              Voltar à Loja Koda ›
            </a>
          </div>
        ) : catalog ? (
          <div className="grid gap-5 lg:grid-cols-[1.08fr_.92fr] lg:items-start">
            <div className="space-y-5">
              <section className="overflow-hidden rounded-[38px] bg-white">
                {catalog.product.image_url && (
                  <div className="h-64 bg-white p-6">
                    <div className="relative isolate h-full w-full overflow-hidden">
                      <img
                        src={
                          catalog.product.slug === "kodabot-i"
                            ? "/kodabot-checkout-transparent-v1.png"
                            : catalog.product.image_url
                        }
                        alt={catalog.product.name}
                        className="absolute inset-0 m-auto block max-h-full max-w-full object-contain"
                        style={{ width: "auto", height: "100%" }}
                      />
                    </div>
                  </div>
                )}
                <div className="p-7 sm:p-10">
                  <p
                    className={`text-sm font-semibold ${catalog.product.product_type === "coverage" ? "text-[#e11900]" : "text-[#0071e3]"}`}
                  >
                    {catalog.product.sales_mode === "preorder" ? "Pré-venda" : "Sua compra"}
                  </p>
                  <h1 className="mt-2 text-4xl font-semibold tracking-[-.055em] sm:text-5xl">
                    {catalog.product.name}
                  </h1>
                  <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#6e6e73]">
                    {catalog.product.short_description ??
                      catalog.product.description ??
                      "Produto Koda."}
                  </p>
                  {catalog.product.slug === "kodabot-i" && (
                    <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-[#424245]">
                      <span>✓ Cabo Micro USB incluído</span>
                      <span>✓ Envios a partir de 17/10/2026</span>
                    </div>
                  )}
                  <div className="mt-9 border-t border-black/10 pt-7">
                    <div className="flex items-start justify-between gap-6">
                      <div>
                        <p className="text-xs text-[#86868b]">Valor unitário</p>
                        <p className="mt-1 text-2xl font-semibold tracking-[-.03em]">
                          {formatMoney(catalog.product.unit_amount_cents, catalog.product.currency)}
                        </p>
                      </div>
                      {!deviceRequired && (
                        <div className="text-right">
                          <p className="text-xs text-[#86868b]">Quantidade</p>
                          <div className="mt-2 inline-flex items-center rounded-full border border-black/10 bg-[#f5f5f7] p-1">
                            <button
                              type="button"
                              disabled={paymentLocked}
                              onClick={() => setQuantity((v) => Math.max(1, v - 1))}
                              className="grid h-8 w-8 place-items-center rounded-full text-lg hover:bg-white disabled:opacity-40"
                            >
                              −
                            </button>
                            <span className="min-w-9 text-center text-sm font-semibold">
                              {quantity}
                            </span>
                            <button
                              type="button"
                              disabled={paymentLocked}
                              onClick={() => setQuantity((v) => Math.min(20, v + 1))}
                              className="grid h-8 w-8 place-items-center rounded-full text-lg hover:bg-white disabled:opacity-40"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {catalog.product.slug === "kodabot-i" && (
                <section className="rounded-[38px] bg-white p-7 sm:p-10">
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                    <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-[24px] bg-[#f5f5f7]">
                      <img
                        src="/koda-adaptador-usb-2a.webp"
                        alt="Adaptador de energia USB para KodaBot"
                        className="h-full w-full object-contain p-2"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-[#0071e3]">
                        <Cable className="h-4 w-4" />
                        <p className="text-xs font-semibold">Complete seu KodaBot</p>
                      </div>
                      <h2 className="mt-2 text-xl font-semibold tracking-[-.03em]">
                        Adaptador de energia USB
                      </h2>
                      <p className="mt-1 text-sm text-[#6e6e73]">
                        Bivolt · USB-A · 5 V / 2 A. O cabo já vem na caixa do KodaBot.
                      </p>
                      <p className="mt-3 text-sm font-semibold">
                        R$ 14,90 <span className="font-normal text-[#86868b]">com o KodaBot</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={includePowerAdapter}
                      disabled={paymentLocked}
                      onClick={() => setIncludePowerAdapter((current) => !current)}
                      className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition ${includePowerAdapter ? "bg-[#1d1d1f] text-white" : "bg-[#0071e3] text-white hover:bg-[#0077ed]"} disabled:opacity-45`}
                    >
                      {includePowerAdapter ? "Adicionado ✓" : "Adicionar"}
                    </button>
                  </div>
                </section>
              )}

              {["kodabot-i", "kodabot-i-pro"].includes(catalog.product.slug) && (
                <section className="rounded-[38px] bg-white p-7 sm:p-10">
                  <div className="flex items-start gap-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#eaf7ee]">
                      <Recycle className="h-5 w-5 text-[#248a3d]" />
                    </span>
                    <div>
                      <h2 className="text-xl font-semibold tracking-[-.03em]">
                        Tem um KodaBot para trocar?
                      </h2>
                      <p className="mt-2 text-sm leading-relaxed text-[#6e6e73]">
                        Envie gratuitamente para análise. Aceitamos aparelhos com avarias e, após a
                        inspeção, você decide se aceita o crédito para esta compra.
                      </p>
                      <a
                        href="/trade-in"
                        className="mt-4 inline-flex text-sm font-semibold text-[#0066cc]"
                      >
                        Ver estimativa e solicitar análise ›
                      </a>
                    </div>
                  </div>
                </section>
              )}

              {deviceRequired && (
                <section className="rounded-[38px] bg-white p-7 sm:p-10">
                  <div className="flex items-center gap-3">
                    <ShieldCheck
                      className={`h-5 w-5 ${catalog.product.product_type === "coverage" ? "text-[#e11900]" : "text-[#0071e3]"}`}
                    />
                    <div>
                      <h2 className="text-xl font-semibold tracking-[-.03em]">
                        Escolha seu KodaBot
                      </h2>
                      <p className="mt-0.5 text-xs text-[#86868b]">
                        O plano pertence à sua conta e será aplicado ao aparelho escolhido.
                      </p>
                    </div>
                  </div>
                  {!user ? (
                    <div className="mt-6 rounded-2xl bg-[#f5f5f7] p-5 text-sm text-[#6e6e73]">
                      <p className="font-semibold text-[#1d1d1f]">
                        Você precisa ter um KodaBot vinculado.
                      </p>
                      <p className="mt-1 text-xs">
                        Entre na Conta Koda para validar seu aparelho antes de comprar o KodaCare.
                      </p>
                      <a
                        href={`/conta/entrar?next=${encodeURIComponent(`/checkout/${productSlug}`)}`}
                        className="mt-4 inline-flex rounded-full bg-[#1d1d1f] px-4 py-2 text-xs font-semibold text-white"
                      >
                        Entrar na Conta Koda
                      </a>
                    </div>
                  ) : devicesLoading ? (
                    <p className="mt-6 flex items-center gap-2 text-sm text-[#6e6e73]">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Carregando seus KodaBots…
                    </p>
                  ) : devices.length ? (
                    <div className="mt-6 grid gap-3">
                      {devices.map((device) => {
                        const eligible =
                          catalog.product.product_type !== "coverage" || device.eligible;
                        return (
                          <button
                            key={device.id}
                            type="button"
                            disabled={!eligible || paymentLocked}
                            onClick={() => setSelectedDeviceId(device.id)}
                            className={`flex items-center justify-between gap-4 rounded-2xl border p-4 text-left transition ${selectedDeviceId === device.id ? "border-[#0071e3] bg-[#f5f9ff]" : "border-black/10"} disabled:cursor-not-allowed disabled:opacity-45`}
                          >
                            <div>
                              <p className="font-semibold">{displayModel(device.model)}</p>
                              <p className="mt-1 font-mono text-[11px] text-[#86868b]">
                                {device.serial_number}
                              </p>
                            </div>
                            <span
                              className={`text-[11px] font-semibold ${eligible ? "text-[#248a3d]" : "text-[#bf4800]"}`}
                            >
                              {eligible
                                ? "Elegível"
                                : device.current_plan
                                  ? "Já possui cobertura"
                                  : "Não elegível"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-6 rounded-2xl bg-[#fff4e5] p-5 text-sm text-[#7a4a00]">
                      <p className="font-semibold">Nenhum KodaBot disponível.</p>
                      <p className="mt-1 text-xs">
                        O KodaCare só pode ser comprado depois que um KodaBot estiver ativado e
                        vinculado à sua Conta Koda.
                      </p>
                    </div>
                  )}
                </section>
              )}

              {shippingRequired && (
                <section className="rounded-[38px] bg-white p-7 sm:p-10">
                  <div className="flex items-center gap-3">
                    <Truck className="h-5 w-5 text-[#0071e3]" />
                    <div>
                      <h2 className="text-xl font-semibold tracking-[-.03em]">Entrega</h2>
                      <p className="mt-0.5 text-xs text-[#86868b]">
                        Seu endereço e o frete são validados antes do pedido.
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <Field
                      label="Nome de quem recebe"
                      value={address.recipient}
                      onChange={(v) => updateAddress("recipient", v)}
                      disabled={paymentLocked}
                      className="sm:col-span-2"
                    />
                    <Field
                      label="CEP"
                      value={address.postalCode}
                      onChange={(v) =>
                        updateAddress("postalCode", v.replace(/\D/g, "").slice(0, 8))
                      }
                      disabled={paymentLocked}
                      inputMode="numeric"
                      maxLength={8}
                    />
                    <Field
                      label="Telefone"
                      value={address.phone}
                      onChange={(v) => updateAddress("phone", v.replace(/\D/g, "").slice(0, 11))}
                      disabled={paymentLocked}
                      inputMode="tel"
                    />
                    <Field
                      label="Rua / avenida"
                      value={address.street}
                      onChange={(v) => updateAddress("street", v)}
                      disabled={paymentLocked}
                      className="sm:col-span-2"
                    />
                    <Field
                      label="Número"
                      value={address.number}
                      onChange={(v) => updateAddress("number", v)}
                      disabled={paymentLocked}
                    />
                    <Field
                      label="Complemento"
                      value={address.complement}
                      onChange={(v) => updateAddress("complement", v)}
                      disabled={paymentLocked}
                    />
                    <Field
                      label="Bairro"
                      value={address.neighborhood}
                      onChange={(v) => updateAddress("neighborhood", v)}
                      disabled={paymentLocked}
                    />
                    <Field
                      label="Cidade"
                      value={address.city}
                      onChange={(v) => updateAddress("city", v)}
                      disabled={paymentLocked}
                    />
                    <Field
                      label="UF"
                      value={address.state}
                      onChange={(v) => updateAddress("state", v)}
                      disabled={paymentLocked}
                      maxLength={2}
                    />
                  </div>
                  <button
                    type="button"
                    disabled={
                      !user ||
                      paymentLocked ||
                      shippingLoading ||
                      address.postalCode.replace(/\D/g, "").length !== 8
                    }
                    onClick={calculateShipping}
                    className="mt-5 inline-flex rounded-full bg-[#1d1d1f] px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-35"
                  >
                    {shippingLoading ? "Calculando…" : "Calcular entrega"}
                  </button>
                  {shippingOptions.length > 0 && (
                    <div className="mt-5 grid gap-2">
                      {shippingOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          disabled={paymentLocked}
                          onClick={() => setSelectedShippingId(option.id)}
                          className={`flex items-center justify-between gap-5 rounded-2xl border p-4 text-left ${selectedShippingId === option.id ? "border-[#0071e3] bg-[#f5f9ff]" : "border-black/10"}`}
                        >
                          <div>
                            <p className="text-sm font-semibold">{option.name}</p>
                            <p className="mt-1 text-[11px] text-[#86868b]">
                              {option.company || shippingProvider || "Koda"}
                              {option.deadline_days != null
                                ? ` · até ${option.deadline_days} dias úteis`
                                : ""}
                            </p>
                          </div>
                          <strong className="text-sm">
                            {option.price_cents === 0 ? "Grátis" : formatMoney(option.price_cents)}
                          </strong>
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </div>

            <section className="rounded-[38px] bg-white p-7 sm:p-9 lg:sticky lg:top-16">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#0071e3]">Resumo</p>
                  <h2 className="mt-1 text-3xl font-semibold tracking-[-.045em]">
                    Finalizar compra
                  </h2>
                </div>
                <LockKeyhole className="h-6 w-6 text-[#0071e3]" />
              </div>
              <div className="mt-7 space-y-3 border-y border-black/10 py-6 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-[#6e6e73]">Produtos</span>
                  <span>{formatMoney(subtotalCents, catalog.product.currency)}</span>
                </div>
                {shippingRequired && (
                  <div className="flex justify-between gap-4">
                    <span className="text-[#6e6e73]">Entrega</span>
                    <span>
                      {selectedShipping
                        ? selectedShipping.price_cents === 0
                          ? "Grátis"
                          : formatMoney(selectedShipping.price_cents, catalog.product.currency)
                        : "Calcule acima"}
                    </span>
                  </div>
                )}
                {tradeIn && (
                  <div className="flex justify-between gap-4 text-[#1f7a3f]">
                    <span>Koda Trade In</span>
                    <span>
                      − {formatMoney(tradeIn.final_credit_cents, catalog.product.currency)}
                    </span>
                  </div>
                )}
                {selectedDevice && (
                  <div className="flex justify-between gap-4">
                    <span className="text-[#6e6e73]">Vinculado a</span>
                    <span className="font-mono text-xs">{selectedDevice.serial_number}</span>
                  </div>
                )}
                <div className="flex items-end justify-between gap-4 border-t border-black/10 pt-4">
                  <div>
                    <span className="font-semibold">Total</span>
                    <p className="mt-1 text-[11px] text-[#86868b]">
                      Calculado e validado no servidor
                    </p>
                  </div>
                  <strong className="text-2xl tracking-[-.04em]">
                    {formatMoney(totalCents, catalog.product.currency)}
                  </strong>
                </div>
              </div>
              {["kodabot-i", "kodabot-i-pro"].includes(catalog.product.slug) && (
                <div className="mt-6 rounded-2xl bg-[#f5f5f7] p-4">
                  <Field
                    label="Cupom da avaliação"
                    value={couponCode}
                    onChange={(value) => setCouponCode(value.toUpperCase())}
                    disabled={paymentLocked}
                    placeholder="KODA-TI-XXXXXXXXXX"
                  />
                  <p className="mt-2 text-[10px] leading-relaxed text-[#86868b]">
                    O cupom é liberado somente depois da análise e da sua aceitação da oferta.
                  </p>
                  {couponCode && !tradeIn && (
                    <p className="mt-2 text-xs font-semibold text-[#bf4800]">
                      Cupom ainda não liberado ou inválido para esta conta.
                    </p>
                  )}
                </div>
              )}
              <div className="mt-6 rounded-2xl bg-[#f5f5f7] p-4">
                <Field
                  label="CPF ou CNPJ para nota fiscal"
                  value={customerTaxId}
                  onChange={(v) => setCustomerTaxId(v.replace(/\D/g, "").slice(0, 14))}
                  disabled={paymentLocked}
                  inputMode="numeric"
                  maxLength={14}
                />
                <p className="mt-2 text-[10px] leading-relaxed text-[#86868b]">
                  Usado exclusivamente na documentação fiscal desta compra.
                </p>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!pixReady || paymentLocked}
                  onClick={() => setPaymentMethod("pix")}
                  className={`rounded-2xl border p-4 text-left ${paymentMethod === "pix" ? "border-[#0071e3] bg-[#f5f9ff]" : "border-black/10"} disabled:opacity-40`}
                >
                  <QrCode className="h-5 w-5 text-[#0071e3]" />
                  <p className="mt-3 text-sm font-semibold">Pix</p>
                </button>
                <button
                  type="button"
                  disabled={!cardReady || paymentLocked}
                  onClick={() => setPaymentMethod("card")}
                  className={`rounded-2xl border p-4 text-left ${paymentMethod === "card" ? "border-[#0071e3] bg-[#f5f9ff]" : "border-black/10"} disabled:opacity-40`}
                >
                  <CreditCard className="h-5 w-5 text-[#0071e3]" />
                  <p className="mt-3 text-sm font-semibold">Cartão</p>
                </button>
              </div>
              {!user ? (
                <a
                  href={`/conta/entrar?returnTo=${encodeURIComponent(`/checkout/${productSlug}`)}`}
                  className="mt-6 flex w-full justify-center rounded-full bg-[#0071e3] px-6 py-3.5 text-sm font-semibold text-white"
                >
                  Entrar para continuar
                </a>
              ) : paymentMethod === "pix" ? (
                pix ? (
                  <div className="mt-6 rounded-[24px] border border-[#b8d9ff] bg-[#f5f9ff] p-5">
                    <p className="text-sm font-semibold">Pague com Pix</p>
                    <p className="mt-1 text-xs text-[#6e6e73]">
                      A confirmação é automática pelo Koda Pay.
                    </p>
                    {pix.qr_code_base64 && (
                      <div className="mx-auto mt-5 w-fit rounded-2xl bg-white p-3">
                        <img
                          src={`data:image/png;base64,${pix.qr_code_base64}`}
                          alt="QR Code Pix"
                          className="h-48 w-48"
                        />
                      </div>
                    )}
                    <div className="mt-4 rounded-xl bg-white p-3">
                      <p className="max-h-16 overflow-hidden break-all font-mono text-[10px] text-[#424245]">
                        {pix.qr_code}
                      </p>
                      <button
                        type="button"
                        onClick={copyPix}
                        className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[#0066cc]"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {copied ? "Copiado" : "Copiar Pix"}
                      </button>
                      {pix.ticket_url && (
                        <a
                          href={pix.ticket_url}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-4 inline-flex items-center gap-1 text-xs font-semibold text-[#0066cc]"
                        >
                          Abrir <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-[11px] text-[#6e6e73]">
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      Aguardando confirmação…
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={createPixOrder}
                    disabled={!checkoutReady || !pixReady || submitting}
                    className="mt-6 flex w-full justify-center rounded-full bg-[#0071e3] px-6 py-3.5 text-sm font-semibold text-white hover:bg-[#0077ed] disabled:cursor-not-allowed disabled:bg-[#d2d2d7]"
                  >
                    {submitting ? "Preparando Pix…" : "Pagar com Pix"}
                  </button>
                )
              ) : (
                <CardPaymentBrick
                  amountCents={totalCents}
                  enabled={checkoutReady && cardReady}
                  orderRequest={orderRequest}
                  onOrderCreated={(created) =>
                    setOrder({
                      id: created.id,
                      ...(created.display_number ? { display_number: created.display_number } : {}),
                      status: created.status ?? "draft",
                    })
                  }
                />
              )}
              {!checkoutReady && user && catalog.product.available && (
                <div className="mt-5 rounded-2xl bg-[#f5f5f7] p-4 text-xs leading-relaxed text-[#6e6e73]">
                  {!taxIdReady
                    ? "Informe um CPF ou CNPJ válido para a nota fiscal."
                    : deviceRequired && !deviceReady
                      ? "Escolha um KodaBot para continuar."
                      : shippingRequired && !shippingReady
                        ? "Preencha o endereço e escolha uma opção de entrega."
                        : "Complete os dados acima para continuar."}
                </div>
              )}
              {!catalog.product.available && (
                <div className="mt-5 rounded-2xl bg-[#fff4e5] p-4 text-xs text-[#7a4a00]">
                  {catalog.product.waitlist_enabled ? (
                    <>
                      Este produto ainda não está à venda.{" "}
                      <a href="/kodabot-pro#lista-de-espera" className="font-semibold underline">
                        Entre na lista de espera.
                      </a>
                    </>
                  ) : (
                    "Este produto está indisponível no momento."
                  )}
                </div>
              )}
              {error && (
                <p className="mt-4 rounded-xl bg-red-50 p-3 text-center text-xs font-medium text-red-700">
                  {error}
                </p>
              )}
              <div className="mt-7 space-y-2 border-t border-black/10 pt-6 text-[11px] leading-relaxed text-[#86868b]">
                <p>
                  O preço, estoque, dispositivo e entrega são validados no servidor da Koda antes da
                  cobrança.
                </p>
                <p>Pagamentos são processados pelo Mercado Pago por meio do Koda Pay.</p>
                <p>
                  O CPF/CNPJ é armazenado somente para o registro fiscal do pedido e não é enviado
                  ao processador de cartão pela Koda.
                </p>
                {catalog.product.product_type === "coverage" && (
                  <p>
                    O KodaCare só é ativado depois da confirmação do pagamento e da validação de
                    elegibilidade do KodaBot.
                  </p>
                )}
              </div>
            </section>
          </div>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}
