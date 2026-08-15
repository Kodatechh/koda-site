import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, ChevronRight, Laptop, Mic2, Monitor, Wrench } from "lucide-react";

import { productNames, repairOptions, type ProductId } from "@/lib/koda-data";

export function RepairFlow({ compact = false }: { compact?: boolean }) {
  const [model, setModel] = useState<ProductId | null>(null);
  const [repairId, setRepairId] = useState<string | null>(null);

  const options = model ? repairOptions[model] : [];
  const selected = useMemo(() => options.find((item) => item.id === repairId) ?? null, [options, repairId]);

  function chooseModel(value: ProductId) {
    setModel(value);
    setRepairId(null);
  }

  return (
    <div className={compact ? "" : "mx-auto max-w-5xl px-5 py-16 sm:py-20"}>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#86868b]">Etapa {model ? (selected ? "3" : "2") : "1"} de 3</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            {!model ? "Escolha seu KodaBot." : !selected ? "O que aconteceu?" : "Opção de serviço."}
          </h2>
        </div>
        {model && (
          <button onClick={() => { setModel(null); setRepairId(null); }} className="hidden items-center gap-1 text-sm text-[#0066cc] hover:underline sm:flex">
            <ArrowLeft className="h-4 w-4" /> Trocar modelo
          </button>
        )}
      </div>

      {!model && (
        <div className="grid gap-4 sm:grid-cols-2">
          <button onClick={() => chooseModel("kodabot-i")} className="group rounded-[28px] border border-black/10 bg-white p-7 text-left transition-all hover:-translate-y-1 hover:border-[#0071e3] hover:shadow-xl">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e8f2ff] text-[#0071e3]"><Monitor className="h-6 w-6" /></div>
            <h3 className="mt-8 text-2xl font-semibold tracking-[-0.03em]">KodaBot I</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#6e6e73]">Tela, touch, buzzer, sensor, conectividade, alimentação e estrutura.</p>
            <span className="mt-6 inline-flex items-center text-sm font-semibold text-[#0066cc]">Selecionar <ChevronRight className="h-4 w-4" /></span>
          </button>
          <button onClick={() => chooseModel("kodabot-i-pro")} className="group rounded-[28px] border border-black/10 bg-black p-7 text-left text-white transition-all hover:-translate-y-1 hover:border-[#4d86ff] hover:shadow-xl">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-[#5b9cff]"><Mic2 className="h-6 w-6" /></div>
            <h3 className="mt-8 text-2xl font-semibold tracking-[-0.03em]">KodaBot I Pro</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/50">Microfones, alto-falante, bateria, controles, conectividade e estrutura.</p>
            <span className="mt-6 inline-flex items-center text-sm font-semibold text-[#2997ff]">Selecionar <ChevronRight className="h-4 w-4" /></span>
          </button>
        </div>
      )}

      {model && !selected && (
        <>
          <div className="mb-5 flex items-center gap-3 rounded-2xl bg-[#f5f5f7] px-4 py-3 text-sm">
            <CheckCircle2 className="h-4 w-4 text-[#34c759]" />
            <span><strong>{productNames[model]}</strong> selecionado. Apenas reparos compatíveis com este modelo aparecem abaixo.</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {options.map((option) => (
              <button key={option.id} onClick={() => setRepairId(option.id)} className="group rounded-2xl border border-black/10 bg-white p-5 text-left transition-all hover:border-[#0071e3] hover:bg-[#f9fbff]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#86868b]">{option.category}</p>
                <h3 className="mt-2 font-semibold tracking-[-0.02em]">{option.label}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#6e6e73]">{option.description}</p>
                <ChevronRight className="mt-4 h-4 w-4 text-[#0066cc] transition-transform group-hover:translate-x-1" />
              </button>
            ))}
          </div>
        </>
      )}

      {model && selected && (
        <div className="overflow-hidden rounded-[30px] bg-[#f5f5f7]">
          <div className="grid gap-8 p-7 sm:p-10 lg:grid-cols-[1fr_280px] lg:items-center">
            <div>
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#0071e3]"><Wrench className="h-6 w-6" /></div>
              <p className="mt-6 text-sm font-semibold text-[#6e6e73]">{productNames[model]} · {selected.category}</p>
              <h3 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{selected.label}</h3>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-[#6e6e73]">{selected.description}</p>
              <button onClick={() => setRepairId(null)} className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-[#0066cc] hover:underline"><ArrowLeft className="h-4 w-4" /> Escolher outro problema</button>
            </div>
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <p className="text-xs text-[#86868b]">Estimativa</p>
              <p className="mt-2 text-xl font-semibold">{selected.estimate}</p>
              <p className="mt-3 text-xs leading-relaxed text-[#6e6e73]">O valor final depende da inspeção do aparelho. A Koda não exibe um preço definitivo antes do diagnóstico técnico.</p>
              <a href={`/suporte/contato?assunto=reparo&modelo=${model}&problema=${selected.id}`} className="mt-6 flex items-center justify-center gap-2 rounded-full bg-[#0071e3] px-5 py-3 text-sm font-semibold text-white">
                Solicitar atendimento <ChevronRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      )}

      {!model && (
        <div className="mt-8 flex items-start gap-3 rounded-2xl bg-[#f5f5f7] p-4 text-xs leading-relaxed text-[#6e6e73]">
          <Laptop className="mt-0.5 h-4 w-4 shrink-0" />
          O fluxo começa pelo modelo porque os reparos são diferentes. Por exemplo, o KodaBot I Pro não tem tela e nunca exibirá uma opção de reparo de display.
        </div>
      )}
    </div>
  );
}
