import { useMemo, useState } from "react";
import { ArrowLeft, Check, ChevronRight, Mic2, Monitor, ShieldCheck } from "lucide-react";

import { productNames, type ProductId } from "@/lib/koda-data";
import { formatBRL, repairServices } from "@/lib/kodacare";

const repairCategories: Record<ProductId, { id: string; label: string; services: string[] }[]> = {
  "kodabot-i": [
    { id: "display", label: "Tela", services: ["display"] },
    { id: "boards", label: "Placa e conexões", services: ["pico", "main-board"] },
    { id: "sensor", label: "Sensor", services: ["bme280"] },
    { id: "audio", label: "Áudio", services: ["buzzer"] },
    { id: "shell", label: "Carcaça", services: ["front-shell", "rear-shell", "full-shell"] },
    { id: "os", label: "KODA OS", services: ["os-restore", "os-reinstall", "no-boot"] },
    { id: "diagnostic", label: "Diagnóstico", services: ["diagnostic"] },
    { id: "cleaning", label: "Limpeza e revisão", services: ["cleaning"] },
  ],
  "kodabot-i-pro": [
    { id: "board", label: "Placa principal", services: ["esp32"] },
    { id: "microphones", label: "Microfones", services: ["microphone", "microphones"] },
    { id: "speaker", label: "Alto-falante", services: ["speaker"] },
    { id: "buttons", label: "Botões", services: ["buttons"] },
    { id: "battery", label: "Bateria", services: ["battery"] },
    { id: "charging", label: "Carregamento", services: ["charging"] },
    { id: "usb-c", label: "USB-C", services: ["usb-c"] },
    { id: "shell", label: "Carcaça", services: ["shell"] },
    { id: "os", label: "KODA OS", services: ["os-restore", "os-reinstall", "no-boot"] },
    { id: "diagnostic", label: "Diagnóstico", services: ["diagnostic"] },
    { id: "cleaning", label: "Limpeza e revisão", services: ["cleaning"] },
  ],
};

export function RepairFlow({ compact = false }: { compact?: boolean }) {
  const [model, setModel] = useState<ProductId | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const category = model
    ? (repairCategories[model].find((item) => item.id === categoryId) ?? null)
    : null;
  const services = useMemo(
    () =>
      model && category
        ? repairServices[model].filter((service) => category.services.includes(service.id))
        : [],
    [category, model],
  );
  const service = services.find((item) => item.id === serviceId) ?? null;

  function chooseModel(id: ProductId) {
    setModel(id);
    setCategoryId(null);
    setServiceId(null);
  }

  function chooseCategory(id: string) {
    setCategoryId(id);
    setServiceId(null);
  }

  return (
    <div className={compact ? "" : "mx-auto max-w-6xl px-5 py-20 sm:py-28"}>
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-semibold text-[#0066cc]">Serviço e Reparos Koda</p>
        <h2 className="mt-3 text-4xl font-semibold tracking-[-0.045em] sm:text-6xl">
          Qual KodaBot precisa de ajuda?
        </h2>
      </div>

      <section className="mt-16">
        <div className="grid gap-4 sm:grid-cols-2">
          {(["kodabot-i", "kodabot-i-pro"] as ProductId[]).map((id) => {
            const Icon = id === "kodabot-i" ? Monitor : Mic2;
            const selected = model === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => chooseModel(id)}
                aria-pressed={selected}
                className={`flex min-h-36 items-center justify-between rounded-[28px] p-7 text-left transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3] ${selected ? "bg-[#1d1d1f] text-white shadow-xl" : "bg-[#f5f5f7] hover:bg-[#ececef]"}`}
              >
                <span className="flex items-center gap-5">
                  <span
                    className={`grid h-12 w-12 place-items-center rounded-full ${selected ? "bg-white/10" : "bg-white"}`}
                  >
                    <Icon className="h-6 w-6 text-[#0071e3]" />
                  </span>
                  <strong className="text-xl">{productNames[id]}</strong>
                </span>
                {selected && <Check className="h-5 w-5" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </section>

      {model && (
        <section className="mt-20">
          <p className="text-sm font-semibold text-[#0066cc]">O que está acontecendo?</p>
          <h3 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">
            Escolha uma categoria.
          </h3>
          <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {repairCategories[model].map((item) => {
              const selected = item.id === categoryId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => chooseCategory(item.id)}
                  aria-pressed={selected}
                  className={`flex min-h-28 items-center justify-between rounded-[24px] p-5 text-left font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3] ${selected ? "bg-[#e8f2ff] ring-2 ring-[#0071e3]" : "bg-[#f5f5f7] hover:bg-[#ececef]"}`}
                >
                  {item.label}
                  <ChevronRight className="h-4 w-4 text-[#0071e3]" aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </section>
      )}

      {category && (
        <section className="mt-20">
          <button
            type="button"
            onClick={() => {
              setCategoryId(null);
              setServiceId(null);
            }}
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#0066cc]"
          >
            <ArrowLeft className="h-4 w-4" /> {category.label}
          </button>
          <h3 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">Escolha o serviço.</h3>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {services.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setServiceId(item.id)}
                aria-pressed={serviceId === item.id}
                className={`flex min-h-32 items-center justify-between rounded-[26px] p-6 text-left transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3] ${serviceId === item.id ? "bg-[#1d1d1f] text-white" : "bg-[#f5f5f7] hover:bg-[#ececef]"}`}
              >
                <span>
                  <strong className="block">{item.name}</strong>
                  <span
                    className={`mt-3 block text-sm ${serviceId === item.id ? "text-white/60" : "text-[#6e6e73]"}`}
                  >
                    {item.price === 0 ? "Grátis" : formatBRL(item.price)}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0" />
              </button>
            ))}
          </div>
        </section>
      )}

      {service && model && (
        <section className="mt-16 overflow-hidden rounded-[36px] bg-[#f5f5f7] p-7 sm:p-12">
          <div className="grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold text-[#0066cc]">{category?.label}</p>
              <h3 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">
                {service.name}
              </h3>
              <p className="mt-5 max-w-xl leading-relaxed text-[#6e6e73]">
                Se o defeito estiver coberto pela garantia, o serviço pode não ter custo. A
                avaliação técnica confirma a cobertura.
              </p>
            </div>
            <div className="rounded-[28px] bg-white p-7 shadow-sm">
              <div className="flex items-end justify-between gap-4 border-b border-black/10 pb-6">
                <span className="text-sm text-[#6e6e73]">Preço</span>
                <strong className="text-3xl tracking-[-0.04em]">
                  {service.price === 0 ? "Grátis" : formatBRL(service.price)}
                </strong>
              </div>
              <div className="pt-6">
                <div className="flex items-center gap-2 font-semibold">
                  <ShieldCheck className="h-5 w-5 text-[#0071e3]" /> KodaCare+
                </div>
                <p className="mt-3 text-sm leading-relaxed text-[#6e6e73]">
                  {service.cleaning
                    ? "Limpeza e revisão interna: grátis durante a cobertura."
                    : service.accidentalEligible
                      ? "Danos acidentais elegíveis podem ser atendidos mediante franquia. Consulte a franquia aplicável."
                      : service.price === 0
                        ? "Este serviço já é gratuito."
                        : "Preço normal, salvo garantia ou cobertura aplicável."}
                </p>
              </div>
              <a
                href={`/suporte/contato?assunto=reparo&modelo=${model}&problema=${service.id}`}
                className="mt-7 inline-flex w-full justify-center rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0077ed]"
              >
                Solicitar reparo
              </a>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
