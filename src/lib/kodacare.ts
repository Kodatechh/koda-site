import type { ProductId } from "@/lib/koda-data";

export type KodaCarePlanId = "kodacare" | "kodacare_plus_1y" | "kodacare_plus_2y";

export type CoverageStatus = {
  eligible: boolean;
  eligibility_deadline: string | null;
  eligibility_days_remaining: number;
  plan: KodaCarePlanId | null;
  coverage_status: "active" | "expired" | "cancelled" | null;
  purchased_at: string | null;
  coverage_start: string | null;
  coverage_end: string | null;
  accidental_damage_coverage: boolean | null;
  accidental_damage_uses_per_year: number | null;
  accidental_damage_uses_in_current_period: number | null;
  accidental_damage_period_start: string | null;
  accidental_damage_period_end: string | null;
  accidental_damage_deductible_required: boolean | null;
  repair_discount_percent: number | null;
  cleaning_and_inspection_included: boolean | null;
};

export const kodaCarePlans = [
  {
    id: "kodacare" as const,
    name: "KodaCare",
    duration: "+6 meses de garantia",
    price: 19.9,
    accidental: false,
    accidentalUses: 0,
    cleaning: false,
    benefits: ["Mais 6 meses de garantia de fábrica"],
  },
  {
    id: "kodacare_plus_1y" as const,
    name: "KodaCare+ — 1 ano",
    duration: "1 ano de cobertura",
    price: 19.9,
    accidental: true,
    accidentalUses: 3,
    cleaning: true,
    benefits: [
      "Extensão de cobertura por 1 ano",
      "Proteção contra danos acidentais",
      "Até 3 atendimentos por dano acidental ao ano",
      "Franquia por ocorrência",
      "Limpeza e revisão interna grátis",
    ],
  },
  {
    id: "kodacare_plus_2y" as const,
    name: "KodaCare+ — 2 anos",
    duration: "2 anos de cobertura",
    price: 29.9,
    accidental: true,
    accidentalUses: 3,
    cleaning: true,
    benefits: [
      "Extensão de cobertura por 2 anos",
      "Proteção contra danos acidentais",
      "Até 3 atendimentos por dano acidental ao ano",
      "Franquia por ocorrência",
      "Limpeza e revisão interna grátis",
    ],
  },
] as const;

export type RepairService = {
  id: string;
  name: string;
  price: number;
  category: string;
  cleaning?: boolean;
  accidentalEligible?: boolean;
};

export const repairServices: Record<ProductId, RepairService[]> = {
  "kodabot-i": [
    { id: "diagnostic", name: "Diagnóstico técnico", price: 0, category: "Diagnóstico" },
    {
      id: "display",
      name: 'Substituição da tela LCD 2,8"',
      price: 40,
      category: "Tela",
      accidentalEligible: true,
    },
    {
      id: "pico",
      name: "Substituição da placa Raspberry Pi Pico 2 W",
      price: 40,
      category: "Placas",
      accidentalEligible: true,
    },
    {
      id: "main-board",
      name: "Reparo da placa principal / conexões internas",
      price: 25,
      category: "Placas",
      accidentalEligible: true,
    },
    {
      id: "bme280",
      name: "Substituição do sensor de temperatura BME280",
      price: 20,
      category: "Sensores",
      accidentalEligible: true,
    },
    {
      id: "buzzer",
      name: "Substituição do buzzer",
      price: 10,
      category: "Áudio",
      accidentalEligible: true,
    },
    {
      id: "front-shell",
      name: "Substituição da carcaça frontal",
      price: 10,
      category: "Estrutura",
      accidentalEligible: true,
    },
    {
      id: "rear-shell",
      name: "Substituição da carcaça traseira",
      price: 15,
      category: "Estrutura",
      accidentalEligible: true,
    },
    {
      id: "full-shell",
      name: "Substituição completa da carcaça",
      price: 30,
      category: "Estrutura",
      accidentalEligible: true,
    },
    { id: "os-restore", name: "Restauração do KODA OS", price: 0, category: "Software" },
    {
      id: "os-reinstall",
      name: "Reinstalação completa do KODA OS",
      price: 10,
      category: "Software",
    },
    {
      id: "no-boot",
      name: "Recuperação de KodaBot que não inicia",
      price: 0,
      category: "Software",
    },
    {
      id: "cleaning",
      name: "Limpeza e revisão interna",
      price: 30,
      category: "Manutenção",
      cleaning: true,
    },
  ],
  "kodabot-i-pro": [
    { id: "diagnostic", name: "Diagnóstico técnico", price: 0, category: "Diagnóstico" },
    {
      id: "esp32",
      name: "Substituição da placa principal ESP32-S3",
      price: 45,
      category: "Placas",
      accidentalEligible: true,
    },
    {
      id: "microphone",
      name: "Substituição de um microfone",
      price: 20,
      category: "Áudio",
      accidentalEligible: true,
    },
    {
      id: "microphones",
      name: "Substituição do conjunto de microfones",
      price: 45,
      category: "Áudio",
      accidentalEligible: true,
    },
    {
      id: "speaker",
      name: "Substituição do alto-falante",
      price: 35,
      category: "Áudio",
      accidentalEligible: true,
    },
    {
      id: "buttons",
      name: "Reparo/substituição dos botões",
      price: 12,
      category: "Controles",
      accidentalEligible: true,
    },
    {
      id: "battery",
      name: "Substituição da bateria",
      price: 45,
      category: "Energia",
      accidentalEligible: true,
    },
    {
      id: "charging",
      name: "Reparo do sistema de carregamento",
      price: 30,
      category: "Energia",
      accidentalEligible: true,
    },
    {
      id: "usb-c",
      name: "Substituição do conector USB-C",
      price: 15,
      category: "Conectividade",
      accidentalEligible: true,
    },
    {
      id: "shell",
      name: "Substituição da carcaça",
      price: 30,
      category: "Estrutura",
      accidentalEligible: true,
    },
    { id: "os-restore", name: "Restauração do KODA OS", price: 0, category: "Software" },
    {
      id: "os-reinstall",
      name: "Reinstalação completa do KODA OS",
      price: 0,
      category: "Software",
    },
    {
      id: "no-boot",
      name: "Recuperação de KodaBot que não inicia",
      price: 12,
      category: "Software",
    },
    {
      id: "cleaning",
      name: "Limpeza e revisão interna",
      price: 30,
      category: "Manutenção",
      cleaning: true,
    },
  ],
};

export function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
