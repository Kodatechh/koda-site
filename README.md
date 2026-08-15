# Koda Site

Site oficial da Koda, construído com TanStack Start, React, TypeScript, Tailwind CSS e Supabase.

## Rodar localmente

```bash
npm install
npm run dev
```

O Vite normalmente inicia em `http://localhost:8080` neste projeto.

## Build

```bash
npm run build
```

## KodaCloud

O projeto inclui autenticação, Meu KodaBot, Menu de Fábrica, registro de dispositivos, garantia, suporte e o fluxo de ativação KodaCloud.

Antes de usar essas funções em produção, aplique as migrations de `supabase/migrations/` no mesmo projeto Supabase usado pelo site. A migration principal desta versão é:

```text
supabase/migrations/20260815163200_kodacloud_devices.sql
```

Leia `IMPLEMENTACAO-KODACLOUD.md` antes de ativar o painel de fábrica.

## Fotos dos produtos

Os renders provisórios do KodaBot I foram removidos das áreas redesenhadas. Onde ainda não há fotografia oficial, o site exibe um espaço reservado explícito. Quando as fotos reais estiverem disponíveis, substitua esses slots pelos assets oficiais em `public/`.

## Deploy

O repositório pode continuar conectado à Vercel. Após validar localmente:

```bash
git add .
git commit -m "Atualização do ecossistema Koda"
git push
```

A Vercel fará um novo deploy automaticamente se a integração com o GitHub estiver ativa.
