import type { LucideIcon } from "lucide-react";
import {
  AlarmClock,
  BatteryCharging,
  Bell,
  Bluetooth,
  Box,
  Cable,
  CalendarDays,
  Cloud,
  CloudSun,
  Cpu,
  Gauge,
  Hand,
  Headphones,
  Info,
  LayoutDashboard,
  ListTodo,
  Mic2,
  Monitor,
  Power,
  Radio,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Speaker,
  Thermometer,
  Touchpad,
  UserRound,
  Volume2,
  Wifi,
  Wrench,
} from "lucide-react";

export type ProductId = "kodabot-i" | "kodabot-i-pro";

export type CompareItem = {
  label: string;
  icon?: LucideIcon;
  values: Record<ProductId, string | boolean>;
  note?: string;
};

export type CompareSection = {
  title: string;
  description?: string;
  items: CompareItem[];
};

export const productNames: Record<ProductId, string> = {
  "kodabot-i": "KodaBot I",
  "kodabot-i-pro": "KodaBot I Pro",
};

export const compareSections: CompareSection[] = [
  {
    title: "Visão geral",
    items: [
      {
        label: "Tipo de produto",
        icon: Box,
        values: {
          "kodabot-i": "Assistente visual de mesa",
          "kodabot-i-pro": "Assistente de voz",
        },
      },
      {
        label: "Interação principal",
        icon: Hand,
        values: {
          "kodabot-i": "Tela touch",
          "kodabot-i-pro": "Voz + controles físicos",
        },
      },
      {
        label: "Ideal para",
        icon: UserRound,
        values: {
          "kodabot-i": "Ver tarefas, hora, alertas e informações sem abrir o celular",
          "kodabot-i-pro": "Conversar, pedir informações e executar ações por voz",
        },
      },
    ],
  },
  {
    title: "Tela e interface",
    description: "A principal diferença entre os dois modelos está em como você interage com eles.",
    items: [
      {
        label: "Tela",
        icon: Monitor,
        values: { "kodabot-i": "2,8″ · 240×320", "kodabot-i-pro": false },
      },
      {
        label: "Touch",
        icon: Touchpad,
        values: { "kodabot-i": true, "kodabot-i-pro": false },
      },
      {
        label: "Interface visual do KODA OS",
        icon: LayoutDashboard,
        values: { "kodabot-i": true, "kodabot-i-pro": false },
      },
      {
        label: "Painel local pelo navegador",
        icon: Gauge,
        values: { "kodabot-i": true, "kodabot-i-pro": "Planejado" },
      },
    ],
  },
  {
    title: "Organização e rotina",
    items: [
      {
        label: "Hora e data pela internet",
        icon: CalendarDays,
        values: { "kodabot-i": true, "kodabot-i-pro": true },
      },
      {
        label: "Tarefas e lembretes",
        icon: ListTodo,
        values: { "kodabot-i": true, "kodabot-i-pro": true },
      },
      {
        label: "Alarmes",
        icon: AlarmClock,
        values: { "kodabot-i": true, "kodabot-i-pro": true },
      },
      {
        label: "Alertas",
        icon: Bell,
        values: { "kodabot-i": "Visuais + buzzer", "kodabot-i-pro": "Por áudio" },
      },
    ],
  },
  {
    title: "Voz e áudio",
    items: [
      {
        label: "Assistente por voz",
        icon: Mic2,
        values: { "kodabot-i": false, "kodabot-i-pro": true },
      },
      {
        label: "Microfones",
        icon: Radio,
        values: { "kodabot-i": false, "kodabot-i-pro": "Integrados · configuração em definição" },
      },
      {
        label: "Alto-falante",
        icon: Speaker,
        values: { "kodabot-i": false, "kodabot-i-pro": true },
      },
      {
        label: "Buzzer",
        icon: Volume2,
        values: { "kodabot-i": true, "kodabot-i-pro": false },
      },
      {
        label: "Reprodução de respostas em áudio",
        icon: Headphones,
        values: { "kodabot-i": false, "kodabot-i-pro": true },
      },
    ],
  },
  {
    title: "Sensores e ambiente",
    items: [
      {
        label: "BME280",
        icon: Thermometer,
        values: { "kodabot-i": true, "kodabot-i-pro": false },
      },
      {
        label: "Temperatura do ambiente",
        icon: CloudSun,
        values: { "kodabot-i": "Via BME280", "kodabot-i-pro": false },
      },
      {
        label: "Umidade e pressão",
        icon: Cloud,
        values: { "kodabot-i": "Via BME280", "kodabot-i-pro": false },
      },
    ],
  },
  {
    title: "Processamento e conectividade",
    items: [
      {
        label: "Plataforma principal",
        icon: Cpu,
        values: { "kodabot-i": "Raspberry Pi Pico 2 W", "kodabot-i-pro": "ESP32‑S3" },
      },
      {
        label: "Wi‑Fi",
        icon: Wifi,
        values: { "kodabot-i": "2,4 GHz", "kodabot-i-pro": true },
      },
      {
        label: "Bluetooth",
        icon: Bluetooth,
        values: { "kodabot-i": "Não utilizado atualmente", "kodabot-i-pro": "Hardware compatível · uso em definição" },
      },
      {
        label: "KodaBot-Setup",
        icon: Settings2,
        values: { "kodabot-i": true, "kodabot-i-pro": "Planejado" },
      },
      {
        label: "Captive portal",
        icon: Wifi,
        values: { "kodabot-i": true, "kodabot-i-pro": "Planejado" },
      },
      {
        label: "Acesso local",
        icon: Monitor,
        values: { "kodabot-i": "kodabot.local", "kodabot-i-pro": "Em definição" },
      },
    ],
  },
  {
    title: "Energia",
    items: [
      {
        label: "Alimentação",
        icon: Cable,
        values: { "kodabot-i": "USB · ligado à tomada", "kodabot-i-pro": "USB‑C" },
      },
      {
        label: "Bateria integrada",
        icon: BatteryCharging,
        values: { "kodabot-i": false, "kodabot-i-pro": true },
      },
      {
        label: "Uso sem tomada",
        icon: Power,
        values: { "kodabot-i": false, "kodabot-i-pro": true },
      },
    ],
  },
  {
    title: "Software e KodaCloud",
    items: [
      {
        label: "KODA OS",
        icon: Cpu,
        values: { "kodabot-i": true, "kodabot-i-pro": "Software Koda integrado" },
      },
      {
        label: "Conta KodaCloud",
        icon: UserRound,
        values: { "kodabot-i": true, "kodabot-i-pro": true },
      },
      {
        label: "Ativação durante o primeiro setup",
        icon: ShieldCheck,
        values: { "kodabot-i": true, "kodabot-i-pro": true },
      },
      {
        label: "Aparece automaticamente em Meu KodaBot",
        icon: UserRound,
        values: { "kodabot-i": true, "kodabot-i-pro": true },
      },
      {
        label: "Atualizações OTA",
        icon: RefreshCw,
        values: { "kodabot-i": "Em desenvolvimento", "kodabot-i-pro": "Planejado" },
      },
    ],
  },
  {
    title: "Suporte e manutenção",
    items: [
      {
        label: "Número de série físico",
        icon: Info,
        values: { "kodabot-i": "Na parte inferior", "kodabot-i-pro": "Na parte inferior" },
      },
      {
        label: "Reparo de tela",
        icon: Wrench,
        values: { "kodabot-i": true, "kodabot-i-pro": false },
      },
      {
        label: "Reparo de áudio",
        icon: Wrench,
        values: { "kodabot-i": "Buzzer", "kodabot-i-pro": "Microfones + alto-falante" },
      },
      {
        label: "Garantia vinculada ao dispositivo",
        icon: ShieldCheck,
        values: { "kodabot-i": true, "kodabot-i-pro": true },
      },
    ],
  },
];

export type RepairOption = {
  id: string;
  label: string;
  description: string;
  category: string;
  estimate: string;
};

export const repairOptions: Record<ProductId, RepairOption[]> = {
  "kodabot-i": [
    {
      id: "display",
      label: "Tela quebrada ou sem imagem",
      description: "Danos no display, manchas, tela apagada ou falha de imagem.",
      category: "Tela",
      estimate: "Diagnóstico necessário",
    },
    {
      id: "touch",
      label: "Touch não responde",
      description: "Toques imprecisos, áreas sem resposta ou touch sem funcionamento.",
      category: "Tela",
      estimate: "Diagnóstico necessário",
    },
    {
      id: "usb",
      label: "Não liga ou falha na alimentação",
      description: "Problemas na entrada USB, alimentação ou circuito de energia.",
      category: "Energia",
      estimate: "Diagnóstico necessário",
    },
    {
      id: "buzzer",
      label: "Buzzer sem som",
      description: "Alertas sonoros ausentes, baixos ou intermitentes.",
      category: "Áudio",
      estimate: "Diagnóstico necessário",
    },
    {
      id: "bme280",
      label: "Temperatura ou sensores incorretos",
      description: "Falha na leitura de temperatura, umidade ou pressão do BME280.",
      category: "Sensores",
      estimate: "Diagnóstico necessário",
    },
    {
      id: "wifi",
      label: "Não conecta ao Wi‑Fi",
      description: "Problemas no KodaBot-Setup, captive portal, rede salva ou reconexão.",
      category: "Conectividade",
      estimate: "Suporte remoto ou diagnóstico",
    },
    {
      id: "body",
      label: "Carcaça danificada",
      description: "Trincas, encaixes danificados ou necessidade de substituição da carcaça.",
      category: "Estrutura",
      estimate: "Avaliação necessária",
    },
    {
      id: "general",
      label: "Outro problema",
      description: "Se o problema não estiver listado, a Koda pode realizar um diagnóstico completo.",
      category: "Diagnóstico",
      estimate: "Inspeção necessária",
    },
  ],
  "kodabot-i-pro": [
    {
      id: "microphones",
      label: "Microfones não reconhecem minha voz",
      description: "Falha de captação, baixa sensibilidade ou reconhecimento inconsistente.",
      category: "Áudio",
      estimate: "Diagnóstico necessário",
    },
    {
      id: "speaker",
      label: "Alto-falante sem som ou distorcido",
      description: "Sem áudio, volume baixo, ruídos ou distorção.",
      category: "Áudio",
      estimate: "Diagnóstico necessário",
    },
    {
      id: "battery",
      label: "Bateria ou carregamento",
      description: "Não carrega, autonomia anormal ou desligamentos inesperados.",
      category: "Energia",
      estimate: "Diagnóstico necessário",
    },
    {
      id: "controls",
      label: "Botões físicos não respondem",
      description: "Falha nos controles físicos do produto.",
      category: "Controles",
      estimate: "Diagnóstico necessário",
    },
    {
      id: "wifi",
      label: "Não conecta ao Wi‑Fi",
      description: "Falha de configuração ou conectividade de rede.",
      category: "Conectividade",
      estimate: "Suporte remoto ou diagnóstico",
    },
    {
      id: "body",
      label: "Carcaça danificada",
      description: "Danos externos, encaixes ou necessidade de substituição da estrutura.",
      category: "Estrutura",
      estimate: "Avaliação necessária",
    },
    {
      id: "general",
      label: "Outro problema",
      description: "A Koda pode fazer uma inspeção completa do KodaBot I Pro.",
      category: "Diagnóstico",
      estimate: "Inspeção necessária",
    },
  ],
};

export const supportTopics = [
  { title: "Configurar um KodaBot", href: "/suporte/configurar", keywords: "setup wifi captive portal kodabot-setup ativar" },
  { title: "Reparo e assistência", href: "/suporte/reparo", keywords: "conserto tela audio bateria microfone touch" },
  { title: "Garantia e cobertura", href: "/suporte/garantia", keywords: "garantia serial cobertura compra expiração" },
  { title: "Manuais e downloads", href: "/suporte/manuais", keywords: "manual guia rápido documentação download" },
  { title: "Perguntas frequentes", href: "/suporte/faq", keywords: "faq dúvidas" },
  { title: "Fale com a Koda", href: "/suporte/contato", keywords: "contato atendimento email suporte" },
  { title: "Meu KodaBot", href: "/conta", keywords: "conta kodacloud serial dispositivo ativação" },
];
