import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Copy, CreditCard, ExternalLink, LoaderCircle, LockKeyhole, MapPin, PackageCheck, QrCode, ShieldCheck, Truck } from "lucide-react";
import { useAuth } from "@/components/koda/AuthProvider";
import { CardPaymentBrick, type ShippingAddressInput } from "@/components/koda/CardPaymentBrick";
import { Nav } from "@/components/koda/Nav";
import { SiteFooter } from "@/components/koda/SiteFooter";
import { supabase } from "@/integrations/supabase/client";

type CatalogResponse = {
  product: { slug:string; name:string; description:string|null; available:boolean; currency:string; unit_amount_cents:number|null; in_stock:boolean; requires_shipping:boolean };
  koda_pay: { provider:"mercado_pago"; payment_ready:boolean; methods:Array<"pix"|"card">; ready_methods:Array<"pix"|"card">; message:string };
  koda_shipping?: { provider:"melhor_envio"|"none"; required:boolean; ready:boolean; message:string };
};
type CreatedOrder = { id:string; order_number?:number; display_number?:string; status?:string; currency?:string; subtotal_cents?:number; shipping_cents?:number; total_cents?:number };
type PixPayment = { id:string; provider_order_id:string; provider_payment_id:string|null; status:string; status_detail:string|null; local_status:string; qr_code:string; qr_code_base64:string|null; ticket_url:string|null };
type ShippingOption = { id:string; provider:"melhor_envio"; service_id:string; service_name:string; carrier:string; price_cents:number; deadline_days:number; quote_token:string; expires_at:string };
type ShippingResponse = { provider:"melhor_envio"; environment:"sandbox"|"production"; requires_shipping:true; postal_code:string; options:ShippingOption[] };
type PaymentMethod = "pix" | "card";

const emptyAddress: ShippingAddressInput = { recipient:"", postalCode:"", street:"", number:"", complement:"", neighborhood:"", city:"", state:"", phone:"" };

export const Route = createFileRoute("/checkout/$productSlug")({
  head: () => ({ meta: [
    { title: "Finalizar compra — Koda Pay" },
    { name: "description", content: "Checkout seguro da Koda, com pagamento e frete calculados no servidor." },
    { name: "robots", content: "noindex,nofollow" },
  ] }),
  component: CheckoutPage,
});

function money(cents:number|null, currency="BRL") { return cents == null ? "—" : new Intl.NumberFormat("pt-BR", { style:"currency", currency }).format(cents/100); }
function cleanCep(value:string) { return value.replace(/\D/g, "").slice(0,8); }
function showCep(value:string) { const v=cleanCep(value); return v.length>5 ? `${v.slice(0,5)}-${v.slice(5)}` : v; }
function makeRef() { return typeof globalThis.crypto?.randomUUID === "function" ? globalThis.crypto.randomUUID() : `koda_${Date.now()}_${Math.random().toString(36).slice(2,14)}`; }
function addressComplete(a:ShippingAddressInput) {
  const phone=a.phone.replace(/\D/g,"");
  return Boolean(a.recipient.trim() && cleanCep(a.postalCode).length===8 && a.street.trim() && a.number.trim() && a.neighborhood.trim() && a.city.trim() && /^[A-Za-z]{2}$/.test(a.state.trim()) && (!phone || (phone.length>=10 && phone.length<=11)));
}

function CheckoutPage() {
  const { productSlug } = Route.useParams();
  const { user, loading:authLoading } = useAuth();
  const [catalog,setCatalog] = useState<CatalogResponse|null>(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState<string|null>(null);
  const [quantity,setQuantity] = useState(1);
  const [paymentMethod,setPaymentMethod] = useState<PaymentMethod>("pix");
  const [submitting,setSubmitting] = useState(false);
  const [order,setOrder] = useState<CreatedOrder|null>(null);
  const [pix,setPix] = useState<PixPayment|null>(null);
  const [copied,setCopied] = useState(false);
  const [address,setAddress] = useState<ShippingAddressInput>(emptyAddress);
  const [shippingOptions,setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShippingId,setSelectedShippingId] = useState<string|null>(null);
  const [shippingLoading,setShippingLoading] = useState(false);
  const [shippingError,setShippingError] = useState<string|null>(null);
  const [checkoutReference,setCheckoutReference] = useState(makeRef);

  useEffect(() => {
    let alive=true;
    setLoading(true); setError(null);
    supabase.functions.invoke<CatalogResponse>("koda-pay-catalog", { body:{ productSlug } }).then(({data,error:invokeError}) => {
      if (!alive) return;
      if (invokeError || !data?.product) { setError("Não foi possível carregar este produto agora."); setCatalog(null); }
      else {
        setCatalog(data);
        if (!data.koda_pay.ready_methods.includes("pix") && data.koda_pay.ready_methods.includes("card")) setPaymentMethod("card");
      }
      setLoading(false);
    });
    return () => { alive=false; };
  },[productSlug]);

  const requiresShipping=Boolean(catalog?.product.requires_shipping);
  const selectedShipping=useMemo(() => shippingOptions.find(o=>o.id===selectedShippingId) ?? null,[shippingOptions,selectedShippingId]);
  const subtotalCents=useMemo(() => catalog?.product.unit_amount_cents == null ? null : catalog.product.unit_amount_cents*quantity,[catalog,quantity]);
  const totalCents=useMemo(() => subtotalCents == null ? null : requiresShipping ? (selectedShipping ? subtotalCents+selectedShipping.price_cents : null) : subtotalCents,[subtotalCents,requiresShipping,selectedShipping]);
  const normalizedAddress=useMemo(() => requiresShipping ? { ...address, postalCode:cleanCep(address.postalCode), state:address.state.toUpperCase() } : null,[address,requiresShipping]);
  const checkoutReady=Boolean(catalog?.product.available && (!requiresShipping || (selectedShipping && addressComplete(address))));
  const pixReady=Boolean(catalog?.koda_pay.ready_methods.includes("pix"));
  const cardReady=Boolean(catalog?.koda_pay.ready_methods.includes("card"));
  const locked=Boolean(order || pix || submitting);

  function resetOrder() { setOrder(null); setPix(null); setError(null); setCheckoutReference(makeRef()); }
  function changeQuantity(delta:number) {
    if (locked) return;
    setQuantity(v=>Math.min(20,Math.max(1,v+delta)));
    setShippingOptions([]); setSelectedShippingId(null); setShippingError(null); resetOrder();
  }
  function updateAddress(field:keyof ShippingAddressInput,value:string) {
    if (locked) return;
    let next=value;
    if (field==="postalCode") next=cleanCep(value);
    if (field==="state") next=value.replace(/[^A-Za-z]/g,"").slice(0,2).toUpperCase();
    if (field==="phone") next=value.replace(/\D/g,"").slice(0,11);
    setAddress(current=>({ ...current,[field]:next })); setCheckoutReference(makeRef()); setError(null);
    if (field==="postalCode") { setShippingOptions([]); setSelectedShippingId(null); setShippingError(null); }
  }

  async function calculateShipping() {
    if (!catalog?.product.requires_shipping || shippingLoading || locked) return;
    if (!user) { setShippingError("Entre na sua conta para calcular o frete."); return; }
    const postalCode=cleanCep(address.postalCode);
    if (postalCode.length!==8) { setShippingError("Digite um CEP válido com 8 números."); return; }
    setShippingLoading(true); setShippingError(null); setShippingOptions([]); setSelectedShippingId(null); resetOrder();
    const {data, error:invokeError}=await supabase.functions.invoke<ShippingResponse>("koda-shipping", { body:{ productSlug:catalog.product.slug, quantity, postalCode } });
    if (invokeError || !data?.options?.length) {
      setShippingError(catalog.koda_shipping?.ready===false ? "O cálculo de frete ainda precisa ser configurado pela Koda." : "Não foi possível calcular o frete para este CEP agora.");
      setShippingLoading(false); return;
    }
    setShippingOptions(data.options); setSelectedShippingId(data.options[0].id); setCheckoutReference(makeRef()); setShippingLoading(false);
  }

  async function generatePix(orderId:string) {
    const {data,error:invokeError}=await supabase.functions.invoke<{payment:PixPayment}>("koda-pay-mercadopago-pix", { body:{orderId} });
    if (invokeError || !data?.payment?.qr_code) { setError("O pedido foi criado, mas não foi possível gerar o Pix. Nenhuma cobrança foi concluída."); return false; }
    setPix(data.payment); return true;
  }
  async function createPixOrder() {
    if (!user || !catalog?.product.available || paymentMethod!=="pix" || !pixReady || !checkoutReady || submitting || order) return;
    setSubmitting(true); setError(null);
    const {data,error:invokeError}=await supabase.functions.invoke<{order:CreatedOrder}>("koda-pay-create-order", { body:{ productSlug:catalog.product.slug, quantity, shippingAddress:normalizedAddress, shippingQuoteToken:selectedShipping?.quote_token ?? null, checkoutReference } });
    if (invokeError || !data?.order) { setError(requiresShipping ? "Não foi possível iniciar o pedido. Confira o endereço e recalcule o frete." : "Não foi possível iniciar o pedido. Nenhuma cobrança foi feita."); setSubmitting(false); return; }
    setOrder(data.order); await generatePix(data.order.id); setSubmitting(false);
  }
  async function copyPix() {
    if (!pix?.qr_code) return;
    try { await navigator.clipboard.writeText(pix.qr_code); setCopied(true); window.setTimeout(()=>setCopied(false),1800); }
    catch { setError("Não foi possível copiar automaticamente. Selecione o código Pix manualmente."); }
  }

  const inputClass="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-[#0071e3] disabled:bg-[#f5f5f7]";

  return <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
    <Nav />
    <main className="mx-auto max-w-6xl px-5 py-10 sm:py-16">
      <div className="mb-8 flex items-center gap-2 text-sm font-semibold text-[#6e6e73]"><ShieldCheck className="h-4 w-4 text-[#0071e3]"/>Koda Pay · checkout seguro</div>
      {loading || authLoading ? <div className="grid min-h-[520px] place-items-center rounded-[36px] bg-white"><div className="text-center"><LoaderCircle className="mx-auto h-7 w-7 animate-spin text-[#0071e3]"/><p className="mt-3 text-sm text-[#6e6e73]">Preparando o checkout…</p></div></div>
      : error && !catalog ? <div className="rounded-[36px] bg-white p-8 text-center sm:p-14"><h1 className="text-4xl font-semibold tracking-[-0.04em]">Checkout indisponível.</h1><p className="mx-auto mt-4 max-w-xl text-sm text-[#6e6e73]">{error}</p></div>
      : catalog ? <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="space-y-5">
          <div className="rounded-[36px] bg-white p-7 sm:p-10">
            <p className="text-sm font-semibold text-[#0071e3]">Seu pedido</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">{catalog.product.name}</h1><p className="mt-4 text-sm leading-relaxed text-[#6e6e73]">{catalog.product.description ?? "Produto Koda."}</p>
            <div className="mt-9 rounded-[28px] bg-[#f5f5f7] p-6">
              <div className="flex items-start justify-between gap-6"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#86868b]">Valor unitário</p><p className="mt-2 text-2xl font-semibold">{money(catalog.product.unit_amount_cents,catalog.product.currency)}</p></div><div className="text-right"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#86868b]">Quantidade</p><div className="mt-2 inline-flex items-center rounded-full border border-black/10 bg-white p-1"><button disabled={locked} onClick={()=>changeQuantity(-1)} className="grid h-8 w-8 place-items-center rounded-full disabled:opacity-40">−</button><span className="min-w-9 text-center text-sm font-semibold">{quantity}</span><button disabled={locked} onClick={()=>changeQuantity(1)} className="grid h-8 w-8 place-items-center rounded-full disabled:opacity-40">+</button></div></div></div>
              <div className="mt-6 space-y-3 border-t border-black/10 pt-5 text-sm"><div className="flex justify-between text-[#6e6e73]"><span>Produtos</span><span>{money(subtotalCents,catalog.product.currency)}</span></div><div className="flex justify-between text-[#6e6e73]"><span>Frete</span><span>{requiresShipping ? selectedShipping ? money(selectedShipping.price_cents,catalog.product.currency) : "Calcule abaixo" : "Sem frete"}</span></div><div className="flex justify-between border-t border-black/10 pt-3"><span className="font-semibold">Total</span><strong className="text-2xl">{money(totalCents,catalog.product.currency)}</strong></div></div>
            </div>
          </div>

          {requiresShipping ? <div className="rounded-[36px] bg-white p-7 sm:p-10">
            <div className="flex items-start gap-3"><MapPin className="mt-0.5 h-6 w-6 shrink-0 text-[#0071e3]"/><div><p className="text-sm font-semibold text-[#0071e3]">Entrega</p><h2 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">Onde devemos entregar?</h2></div></div>
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-semibold text-[#6e6e73]">Nome de quem recebe</span><input disabled={locked} value={address.recipient} onChange={e=>updateAddress("recipient",e.target.value)} className={inputClass} autoComplete="name"/></label>
              <label><span className="mb-1.5 block text-xs font-semibold text-[#6e6e73]">CEP</span><div className="flex gap-2"><input disabled={locked} inputMode="numeric" value={showCep(address.postalCode)} onChange={e=>updateAddress("postalCode",e.target.value)} placeholder="00000-000" className={inputClass}/><button type="button" disabled={shippingLoading || locked || cleanCep(address.postalCode).length!==8 || !user} onClick={calculateShipping} className="rounded-2xl bg-[#1d1d1f] px-4 py-3 text-xs font-semibold text-white disabled:bg-[#d2d2d7]">{shippingLoading?"Calculando…":"Calcular"}</button></div></label>
              <label><span className="mb-1.5 block text-xs font-semibold text-[#6e6e73]">Telefone (opcional)</span><input disabled={locked} inputMode="tel" value={address.phone} onChange={e=>updateAddress("phone",e.target.value)} className={inputClass}/></label>
              <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-semibold text-[#6e6e73]">Rua / avenida</span><input disabled={locked} value={address.street} onChange={e=>updateAddress("street",e.target.value)} className={inputClass}/></label>
              <label><span className="mb-1.5 block text-xs font-semibold text-[#6e6e73]">Número</span><input disabled={locked} value={address.number} onChange={e=>updateAddress("number",e.target.value)} className={inputClass}/></label>
              <label><span className="mb-1.5 block text-xs font-semibold text-[#6e6e73]">Complemento (opcional)</span><input disabled={locked} value={address.complement} onChange={e=>updateAddress("complement",e.target.value)} className={inputClass}/></label>
              <label><span className="mb-1.5 block text-xs font-semibold text-[#6e6e73]">Bairro</span><input disabled={locked} value={address.neighborhood} onChange={e=>updateAddress("neighborhood",e.target.value)} className={inputClass}/></label>
              <label><span className="mb-1.5 block text-xs font-semibold text-[#6e6e73]">Cidade</span><input disabled={locked} value={address.city} onChange={e=>updateAddress("city",e.target.value)} className={inputClass}/></label>
              <label><span className="mb-1.5 block text-xs font-semibold text-[#6e6e73]">UF</span><input disabled={locked} value={address.state} onChange={e=>updateAddress("state",e.target.value)} placeholder="RJ" className={inputClass}/></label>
            </div>
            {!user && <p className="mt-4 text-xs text-[#6e6e73]">Entre na sua conta para consultar transportadoras.</p>}
            {shippingError && <p className="mt-4 text-xs font-medium text-red-600">{shippingError}</p>}
            {shippingOptions.length>0 && <div className="mt-7"><div className="mb-3 flex items-center gap-2"><Truck className="h-4 w-4 text-[#0071e3]"/><p className="text-sm font-semibold">Escolha a entrega</p></div><div className="space-y-3">{shippingOptions.map(option=>{const checked=option.id===selectedShippingId; return <button key={option.id} type="button" disabled={locked} onClick={()=>{setSelectedShippingId(option.id);setCheckoutReference(makeRef());setOrder(null);setPix(null)}} className={`flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left ${checked?"border-[#0071e3] bg-[#f5f9ff]":"border-black/10"}`}><div><p className="font-semibold">{option.carrier} · {option.service_name}</p><p className="mt-1 text-xs text-[#6e6e73]">Até {option.deadline_days} {option.deadline_days===1?"dia útil":"dias úteis"}</p></div><div className="text-right"><p className="font-semibold">{money(option.price_cents,catalog.product.currency)}</p><span className={`mt-1 inline-block h-3 w-3 rounded-full border ${checked?"border-[#0071e3] bg-[#0071e3]":"border-black/25"}`}/></div></button>})}</div></div>}
            {selectedShipping && !addressComplete(address) && <p className="mt-4 text-xs text-[#6e6e73]">Complete o endereço para liberar o pagamento.</p>}
          </div> : <div className="rounded-[36px] bg-white p-7 sm:p-10"><div className="flex gap-3"><PackageCheck className="h-6 w-6 text-[#0071e3]"/><div><p className="text-sm font-semibold text-[#0071e3]">Entrega</p><h2 className="mt-1 text-2xl font-semibold">Sem frete</h2><p className="mt-2 text-sm text-[#6e6e73]">Este item não exige envio físico.</p></div></div></div>}
        </section>

        <section className="h-fit rounded-[36px] bg-white p-7 sm:p-10">
          <div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-[#0071e3]">Pagamento</p><h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Koda Pay</h2></div><LockKeyhole className="h-7 w-7 text-[#0071e3]"/></div>
          {selectedShipping && <div className="mt-6 rounded-2xl bg-[#f5f5f7] p-4 text-xs text-[#6e6e73]"><p className="font-semibold text-[#1d1d1f]">{selectedShipping.carrier} · {selectedShipping.service_name}</p><p className="mt-1">{money(selectedShipping.price_cents,catalog.product.currency)} · até {selectedShipping.deadline_days} dias úteis</p></div>}
          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <button disabled={!pixReady || locked} onClick={()=>setPaymentMethod("pix")} className={`rounded-2xl border p-5 text-left ${paymentMethod==="pix"?"border-[#0071e3] bg-[#f5f9ff]":"border-black/10"} disabled:opacity-50`}><QrCode className="h-6 w-6 text-[#0071e3]"/><p className="mt-4 font-semibold">Pix</p><p className="mt-1 text-xs text-[#6e6e73]">QR Code e confirmação automática.</p></button>
            <button disabled={!cardReady || locked} onClick={()=>setPaymentMethod("card")} className={`rounded-2xl border p-5 text-left ${paymentMethod==="card"?"border-[#0071e3] bg-[#f5f9ff]":"border-black/10"} disabled:opacity-50`}><CreditCard className="h-6 w-6 text-[#0071e3]"/><p className="mt-4 font-semibold">Cartão</p><p className="mt-1 text-xs text-[#6e6e73]">Tokenizado pelo Mercado Pago + 3DS.</p></button>
          </div>
          {!catalog.koda_pay.payment_ready && <div className="mt-6 rounded-2xl bg-[#f5f5f7] p-5 text-xs text-[#6e6e73]">{catalog.koda_pay.message}</div>}
          {requiresShipping && !selectedShipping && user && <div className="mt-6 rounded-2xl bg-[#f5f5f7] p-4 text-xs text-[#6e6e73]">Calcule e selecione o frete antes do pagamento.</div>}

          {paymentMethod==="card" && <CardPaymentBrick productSlug={catalog.product.slug} quantity={quantity} amountCents={checkoutReady?totalCents:null} enabled={Boolean(user)&&checkoutReady&&cardReady&&!pix} shippingAddress={normalizedAddress} shippingQuoteToken={selectedShipping?.quote_token??null} checkoutReference={checkoutReference} onOrderCreated={created=>setOrder(created)}/>} 

          {paymentMethod==="pix" && <>
            {pix ? <div className="mt-6 rounded-[24px] border border-[#b8d9ff] bg-[#f5f9ff] p-5"><div className="flex gap-3"><QrCode className="h-5 w-5 shrink-0 text-[#0071e3]"/><div><p className="text-sm font-semibold">Escaneie para pagar com Pix</p><p className="mt-1 text-xs text-[#6e6e73]">A confirmação do pedido acontece depois do retorno do Koda Pay.</p></div></div>{pix.qr_code_base64&&<div className="mx-auto mt-5 w-fit rounded-2xl bg-white p-3"><img src={`data:image/png;base64,${pix.qr_code_base64}`} alt="QR Code Pix" className="h-52 w-52"/></div>}<div className="mt-5 rounded-2xl bg-white p-4"><p className="break-all font-mono text-[11px] text-[#424245]">{pix.qr_code}</p><button onClick={copyPix} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#0071e3] px-4 py-2 text-xs font-semibold text-white"><Copy className="h-3.5 w-3.5"/>{copied?"Copiado":"Copiar código Pix"}</button>{pix.ticket_url&&<a href={pix.ticket_url} target="_blank" rel="noreferrer" className="ml-3 inline-flex items-center gap-1 text-xs font-semibold text-[#0066cc]">Abrir <ExternalLink className="h-3 w-3"/></a>}</div></div>
            : order ? <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5"><div className="flex gap-3"><CheckCircle2 className="h-5 w-5 text-green-700"/><div><p className="text-sm font-semibold">Pedido {order.display_number??"Koda"} iniciado.</p><button onClick={()=>generatePix(order.id)} className="mt-2 text-xs font-semibold text-[#0066cc]">Tentar gerar Pix novamente</button></div></div></div> : null}
            {!user ? <a href={`/conta/entrar?returnTo=${encodeURIComponent(`/checkout/${productSlug}`)}`} className="mt-7 flex w-full justify-center rounded-full bg-[#0071e3] px-6 py-3.5 text-sm font-semibold text-white">Entrar para continuar</a> : <button onClick={createPixOrder} disabled={!checkoutReady||!pixReady||submitting||Boolean(order)} className="mt-7 flex w-full justify-center rounded-full bg-[#0071e3] px-6 py-3.5 text-sm font-semibold text-white disabled:bg-[#d2d2d7]">{submitting?"Gerando Pix…":pix?"Pix gerado":order?"Pedido iniciado":requiresShipping&&!selectedShipping?"Calcule o frete":"Pagar com Pix"}</button>}
          </>}

          {error&&<p className="mt-4 text-center text-xs font-medium text-red-600">{error}</p>}
          <div className="mt-7 space-y-3 border-t border-black/10 pt-6 text-xs leading-relaxed text-[#6e6e73]"><p>• Produto e frete são validados no servidor.</p><p>• A cotação de frete é assinada e expira antes do pagamento.</p><p>• Pix e cartão são processados pelo Mercado Pago.</p><p>• Dados brutos do cartão e CVV não são armazenados pela Koda.</p></div>
        </section>
      </div> : null}
    </main><SiteFooter />
  </div>;
}
