export type SearchEntry = {
  title: string;
  description: string;
  href: string;
  keywords: string;
  category: string;
};

export const searchIndex: SearchEntry[] = [
  { title: "KodaBot I", description: "Assistente visual de mesa com tela touch e KODA OS.", href: "/kodabot", keywords: "produto tela touch pico 2 w agenda tarefas hora", category: "Produtos" },
  { title: "KodaBot I — Especificações", description: "Especificações técnicas completas do KodaBot I.", href: "/kodabot/tech-specs", keywords: "specs hardware bme280 wifi usb display", category: "Produtos" },
  { title: "Por dentro do KodaBot I", description: "Conheça os principais componentes do hardware.", href: "/kodabot/por-dentro", keywords: "hardware placa pico tela sensor buzzer", category: "Produtos" },
  { title: "KodaBot I Pro", description: "Assistente de voz da Koda, sem tela.", href: "/kodabot-pro", keywords: "voz esp32 s3 microfone alto-falante bateria", category: "Produtos" },
  { title: "KodaBot I Pro — Especificações", description: "Especificações conhecidas e itens ainda em definição.", href: "/kodabot-pro/tech-specs", keywords: "specs voz bateria esp32", category: "Produtos" },
  { title: "Comparar KodaBots", description: "Compare recursos, hardware, software e suporte.", href: "/comparar", keywords: "comparação modelos qual escolher", category: "Produtos" },
  { title: "KODA OS", description: "O sistema do KodaBot.", href: "/kodaos", keywords: "sistema firmware micropython captive portal ota", category: "Software" },
  { title: "Atualizações do KODA OS", description: "Versões, novidades e próximos recursos.", href: "/kodaos/updates", keywords: "update atualização ota versão 0.4 changelog", category: "Software" },
  { title: "Central de suporte", description: "Configuração, reparo, garantia, manuais e contato.", href: "/suporte", keywords: "ajuda suporte problema", category: "Suporte" },
  { title: "Configurar um KodaBot", description: "KodaBot-Setup, Wi‑Fi, KodaCloud e ativação.", href: "/suporte/configurar", keywords: "setup wifi captive portal ativar conta", category: "Suporte" },
  { title: "Reparo e assistência", description: "Veja reparos disponíveis para cada modelo.", href: "/suporte/reparo", keywords: "conserto reparo tela touch microfone bateria carcaça", category: "Suporte" },
  { title: "Garantia e cobertura", description: "Entenda como a garantia fica ligada ao seu KodaBot.", href: "/suporte/garantia", keywords: "garantia cobertura serial validade", category: "Suporte" },
  { title: "Manuais e downloads", description: "Guias, documentação e atalhos técnicos.", href: "/suporte/manuais", keywords: "manual pdf guia documentação download", category: "Suporte" },
  { title: "Perguntas frequentes", description: "Respostas rápidas sobre produtos, KodaCloud e suporte.", href: "/suporte/faq", keywords: "faq perguntas dúvidas", category: "Suporte" },
  { title: "Contato", description: "Fale com a Koda sobre produto, suporte ou reparo.", href: "/suporte/contato", keywords: "email atendimento contato", category: "Suporte" },
  { title: "Conta KodaCloud", description: "Veja seus KodaBots e dados da sua conta.", href: "/conta", keywords: "login conta meu kodabot dispositivos", category: "Conta" },
  { title: "Entrar na KodaCloud", description: "Acesse sua Conta KodaCloud.", href: "/conta/entrar", keywords: "login entrar senha email", category: "Conta" },
  { title: "Sobre a Koda", description: "Conheça a proposta e os princípios da Koda.", href: "/sobre", keywords: "empresa marca quem somos", category: "Koda" },
  { title: "Privacidade e segurança", description: "Como contas, seriais e dispositivos são protegidos.", href: "/privacidade", keywords: "dados segurança privacidade rls", category: "Koda" },
];
