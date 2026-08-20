/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Copy, CreditCard, LoaderCircle, LockKeyhole, QrCode, Wrench } from "lucide-react";
import { useAuth } from "@/components/koda/AuthProvider";
import { CardPaymentBrick } from "@/components/koda/CardPaymentBrick";
import { Nav } from "@/components/koda/Nav";
import { SiteFooter } from "@/components/koda/SiteFooter";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/checkout/reparo/$repairId")({
  head: () => ({ meta: [{ title: "Pagamento do reparo — Koda" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: RepairCheckout,
});

type PixPayment = { qr_code: string; qr_code_base64: string | null; ticket_url: string | null };
const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

function RepairCheckout() {
  const { repairId } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const db = supabase as any;
  const [repair, setRepair] = useState<any>(null);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState<"pix" | "card">("pix");
  const [pix, setPix] = useState<PixPayment | null>(null);
  const [pixLoading, setPixLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function load() {
    if (!user) return;
    setLoading(true);
    const { data: r, error: rError } = await db.from("repair_requests").select("id,protocol,status,description,final_price_cents,payment_order_id").eq("id", repairId).eq("user_id", user.id).maybeSingle();
    if (rError || !r) { setRepair(null); setOrder(null); setError("Reparo não encontrado."); setLoading(false); return; }
    setRepair(r);
    if (r.payment_order_id) {
      const { data: o } = await db.from("orders").select("id,status,total_cents,paid_at,fulfillment_status").eq("id", r.payment_order_id).eq("user_id", user.id).maybeSingle();
      setOrder(o ?? null);
    } else setOrder(null);
    setLoading(false);
  }

  useEffect(() => { if (user) void load(); else if (!authLoading) setLoading(false); }, [user?.id, authLoading, repairId]);
  useEffect(() => {
    if (!order?.id || !user || order.status === "paid") return;
    let alive = true;
    const timer = window.setInterval(async () => {
      const { data } = await db.from("orders").select("id,status,total_cents,paid_at,fulfillment_status").eq("id", order.id).eq("user_id", user.id).maybeSingle();
      if (alive && data) setOrder((current: any) => ({ ...current, ...data }));
    }, 3000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [order?.id, order?.status, user?.id]);

  const amount = Number(order?.total_cents ?? repair?.final_price_cents ?? 0);
  const paid = Boolean(order?.status === "paid" || order?.paid_at);

  async function generatePix() {
    if (!order?.id || pixLoading) return;
    setPixLoading(true); setError(null);
    const { data, error: invokeError } = await supabase.functions.invoke<{ payment: PixPayment }>("koda-pay-mercadopago-pix", { body: { orderId: order.id } });
    if (invokeError || !data?.payment?.qr_code) setError("Não foi possível gerar o Pix agora.");
    else setPix(data.payment);
    setPixLoading(false);
  }

  async function copyPix() {
    if (!pix?.qr_code) return;
    await navigator.clipboard.writeText(pix.qr_code);
    setCopied(true); window.setTimeout(() => setCopied(false), 1600);
  }

  return <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]"><Nav /><main className="mx-auto max-w-[980px] px-5 py-12 sm:py-20">
    {authLoading || loading ? <div className="grid min-h-[500px] place-items-center rounded-[38px] bg-white"><LoaderCircle className="h-7 w-7 animate-spin text-[#0071e3]" /></div>
    : !user ? <div className="rounded-[38px] bg-white p-12 text-center"><h1 className="text-4xl font-semibold">Entre para pagar o reparo.</h1><a href={`/conta/entrar?next=${encodeURIComponent(`/checkout/reparo/${repairId}`)}`} className="mt-7 inline-flex rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white">Entrar na Conta Koda</a></div>
    : paid ? <div className="rounded-[40px] bg-white p-14 text-center"><CheckCircle2 className="mx-auto h-14 w-14 text-[#34c759]" /><p className="mt-6 text-sm font-semibold text-[#248a3d]">Pagamento confirmado</p><h1 className="mt-2 text-5xl font-semibold tracking-[-.06em]">Seu reparo pode continuar.</h1><p className="mx-auto mt-5 max-w-xl text-sm text-[#6e6e73]">O Koda Pay confirmou o pagamento do protocolo {repair?.protocol}.</p><a href={`/conta/reparos/${repairId}`} className="mt-8 inline-flex rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white">Acompanhar reparo</a></div>
    : !repair || !order ? <div className="rounded-[38px] bg-white p-12 text-center"><Wrench className="mx-auto h-9 w-9 text-[#86868b]" /><h1 className="mt-5 text-4xl font-semibold">Pagamento não disponível.</h1><p className="mt-4 text-sm text-[#6e6e73]">{error ?? "Aprove o orçamento antes de pagar."}</p><a href={`/conta/reparos/${repairId}`} className="mt-7 inline-flex text-sm font-semibold text-[#0066cc]">Voltar ao reparo ›</a></div>
    : <div className="grid gap-5 lg:grid-cols-[1fr_.8fr] lg:items-start"><section className="rounded-[38px] bg-white p-9"><p className="text-sm font-semibold text-[#0071e3]">Assistência Koda</p><h1 className="mt-2 text-5xl font-semibold tracking-[-.055em]">Pagamento do reparo.</h1><p className="mt-4 text-sm text-[#6e6e73]">Protocolo <span className="font-mono font-semibold text-[#1d1d1f]">{repair.protocol}</span>. O valor vem do orçamento aprovado.</p><div className="mt-8 rounded-[24px] bg-[#f5f5f7] p-6"><p className="text-xs text-[#86868b]">Total</p><p className="mt-1 text-4xl font-semibold">{money(amount)}</p></div></section><section className="rounded-[38px] bg-white p-8 lg:sticky lg:top-16"><div className="flex items-center justify-between"><h2 className="text-2xl font-semibold">Finalizar pagamento</h2><LockKeyhole className="h-5 w-5 text-[#0071e3]" /></div><div className="mt-6 grid grid-cols-2 gap-2"><button onClick={() => setMethod("pix")} className={`rounded-2xl border p-4 text-left ${method === "pix" ? "border-[#0071e3] bg-[#f5f9ff]" : "border-black/10"}`}><QrCode className="h-5 w-5 text-[#0071e3]" /><p className="mt-2 text-sm font-semibold">Pix</p></button><button onClick={() => setMethod("card")} className={`rounded-2xl border p-4 text-left ${method === "card" ? "border-[#0071e3] bg-[#f5f9ff]" : "border-black/10"}`}><CreditCard className="h-5 w-5 text-[#0071e3]" /><p className="mt-2 text-sm font-semibold">Cartão</p></button></div>{method === "pix" ? (pix ? <div className="mt-6 rounded-[24px] bg-[#f5f9ff] p-5">{pix.qr_code_base64 && <div className="mx-auto w-fit rounded-xl bg-white p-3"><img src={`data:image/png;base64,${pix.qr_code_base64}`} alt="QR Code Pix" className="h-48 w-48" /></div>}<p className="mt-4 max-h-16 overflow-hidden break-all rounded-xl bg-white p-3 font-mono text-[10px]">{pix.qr_code}</p><button onClick={copyPix} className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[#0066cc]"><Copy className="h-3.5 w-3.5" />{copied ? "Copiado" : "Copiar Pix"}</button><p className="mt-4 flex items-center gap-2 text-[11px] text-[#6e6e73]"><LoaderCircle className="h-3.5 w-3.5 animate-spin" />Aguardando confirmação…</p></div> : <button disabled={pixLoading} onClick={generatePix} className="mt-6 w-full rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white disabled:opacity-50">{pixLoading ? "Gerando Pix…" : `Pagar ${money(amount)} com Pix`}</button>) : <CardPaymentBrick amountCents={amount} enabled existingOrderId={order.id} />}{error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}</section></div>}
  </main><SiteFooter /></div>;
}
