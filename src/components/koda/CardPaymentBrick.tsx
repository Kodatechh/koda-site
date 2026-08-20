import { useEffect, useRef, useState } from "react";
import { CheckCircle2, CreditCard, LoaderCircle, ShieldCheck } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, options?: Record<string, unknown>) => {
      bricks: () => {
        create: (name: string, container: string, settings: Record<string, unknown>) => Promise<{ unmount: () => void }>;
      };
    };
  }
}

type OrderRequest = {
  productSlug: string;
  quantity: number;
  checkoutReference: string;
  deviceId?: string;
  shippingAddress?: Record<string, string>;
  shippingServiceId?: string;
};

type Props = {
  amountCents: number | null;
  enabled: boolean;
  orderRequest: OrderRequest;
  onOrderCreated?: (order: { id: string; display_number?: string; status?: string }) => void;
};

type CardResult = {
  id: string;
  provider_order_id: string;
  provider_payment_id: string | null;
  status: string;
  status_detail: string | null;
  local_status: string;
  challenge_url: string | null;
};

type PublicConfig = {
  card_ready: boolean;
  public_key: string | null;
};

function loadMercadoPagoJs() {
  return new Promise<void>((resolve, reject) => {
    if (window.MercadoPago) return resolve();
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://sdk.mercadopago.com/js/v2"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("sdk_load_failed")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("sdk_load_failed"));
    document.head.appendChild(script);
  });
}

export function CardPaymentBrick({ amountCents, enabled, orderRequest, onOrderCreated }: Props) {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CardResult | null>(null);
  const [challengeComplete, setChallengeComplete] = useState(false);
  const controllerRef = useRef<{ unmount: () => void } | null>(null);
  const orderIdRef = useRef<string | null>(null);
  const requestKey = JSON.stringify(orderRequest);

  useEffect(() => {
    let alive = true;
    supabase.functions.invoke<PublicConfig>("koda-pay-public-config", { body: {} }).then(({ data }) => {
      if (alive) setConfig(data ?? { card_ready: false, public_key: null });
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    orderIdRef.current = null;
    setResult(null);
    setChallengeComplete(false);
  }, [requestKey]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.data?.status === "COMPLETE") setChallengeComplete(true);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function renderBrick() {
      if (!enabled || !config?.card_ready || !config.public_key || amountCents == null || amountCents <= 0) return;
      setError(null);
      setReady(false);
      try {
        await loadMercadoPagoJs();
        if (cancelled || !window.MercadoPago) return;
        const mp = new window.MercadoPago(config.public_key, { locale: "pt-BR" });
        const bricksBuilder = mp.bricks();
        controllerRef.current = await bricksBuilder.create("cardPayment", "koda-card-payment-brick", {
          initialization: { amount: amountCents / 100 },
          customization: {
            paymentMethods: { minInstallments: 1, maxInstallments: 12 },
            visual: { style: { theme: "default" } },
          },
          callbacks: {
            onReady: () => setReady(true),
            onError: () => setError("Não foi possível carregar o formulário de cartão."),
            onSubmit: (formData: any, additionalData: any) => new Promise<void>(async (resolve, reject) => {
              try {
                setError(null);
                setResult(null);
                setChallengeComplete(false);
                let orderId = orderIdRef.current;
                if (!orderId) {
                  const { data: orderData, error: orderError } = await supabase.functions.invoke<{ order: { id: string; display_number?: string; status?: string } }>("koda-pay-create-order", {
                    body: orderRequest,
                  });
                  if (orderError || !orderData?.order?.id) throw new Error("order_failed");
                  orderId = orderData.order.id;
                  orderIdRef.current = orderId;
                  onOrderCreated?.(orderData.order);
                }

                const { data, error: cardError } = await supabase.functions.invoke<{ payment: CardResult }>("koda-pay-mercadopago-card", {
                  body: {
                    orderId,
                    cardToken: formData.token,
                    paymentMethodId: formData.payment_method_id,
                    paymentTypeId: formData.payment_type_id ?? formData.paymentTypeId,
                    installments: Number(formData.installments ?? 1),
                    payerEmail: formData.payer?.email,
                    identification: formData.payer?.identification,
                    cardLast4: additionalData?.lastFourDigits,
                  },
                });
                if (cardError || !data?.payment) throw new Error("card_failed");
                setResult(data.payment);
                resolve();
              } catch {
                setError("Não foi possível processar o cartão. Revise o checkout e tente novamente. Nenhum dado completo do cartão foi armazenado pela Koda.");
                reject();
              }
            }),
          },
        });
      } catch {
        if (!cancelled) setError("Não foi possível iniciar o pagamento com cartão.");
      }
    }

    void renderBrick();
    return () => {
      cancelled = true;
      controllerRef.current?.unmount();
      controllerRef.current = null;
    };
  }, [amountCents, config?.card_ready, config?.public_key, enabled, requestKey]);

  if (!enabled) return null;

  if (config && !config.card_ready) {
    return (
      <div className="mt-6 rounded-2xl border border-black/10 bg-[#f5f5f7] p-5">
        <div className="flex gap-3">
          <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-[#0071e3]" />
          <div>
            <p className="text-sm font-semibold">Cartão ainda não está disponível.</p>
            <p className="mt-1 text-xs leading-relaxed text-[#6e6e73]">Use Pix por enquanto. Quando a Public Key do Mercado Pago estiver ativa, esta opção será liberada automaticamente.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-[24px] border border-black/10 bg-white p-5">
      <div className="mb-4 flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#0071e3]" />
        <div>
          <p className="text-sm font-semibold">Pagar com cartão</p>
          <p className="mt-1 text-xs leading-relaxed text-[#6e6e73]">Os dados são tokenizados pelo Mercado Pago no navegador e não passam em formato bruto pelos servidores da Koda.</p>
        </div>
      </div>
      {!ready && !error && <div className="mb-3 flex items-center gap-2 text-xs text-[#6e6e73]"><LoaderCircle className="h-4 w-4 animate-spin" />Carregando pagamento seguro…</div>}
      <div id="koda-card-payment-brick" />
      {result?.status === "processed" && (
        <div className="mt-4 flex gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-950">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-green-700" />Pagamento aprovado. O pedido também será confirmado pelo webhook do Koda Pay.
        </div>
      )}
      {result?.challenge_url && (
        <div className="mt-5 overflow-hidden rounded-2xl border border-black/10">
          <div className="bg-[#f5f5f7] px-4 py-3 text-xs font-semibold">Verificação de segurança 3DS</div>
          <iframe title="Autenticação 3DS" src={result.challenge_url} className="h-[520px] w-full bg-white" />
          {challengeComplete && <p className="p-4 text-xs text-[#6e6e73]">Autenticação concluída. Aguardando a confirmação final do banco e do Koda Pay.</p>}
        </div>
      )}
      {result && result.status !== "processed" && !result.challenge_url && <p className="mt-4 text-xs font-medium text-[#6e6e73]">Status do pagamento: {result.status_detail ?? result.status}.</p>}
      {error && <p className="mt-4 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
