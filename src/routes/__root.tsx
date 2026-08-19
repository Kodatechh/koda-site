import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "@/components/koda/AuthProvider";
import { ScrollAnimations } from "@/components/koda/ScrollAnimations";

function NotFoundComponent() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#f5f5f7] px-5 text-[#1d1d1f]">
      <div className="max-w-2xl text-center">
        <p className="text-sm font-semibold text-[#0071e3]">Erro 404</p>
        <h1 className="mt-4 text-5xl font-semibold tracking-[-0.05em] sm:text-7xl">Hmm. O KodaBot não encontrou essa página.</h1>
        <p className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-[#6e6e73]">
          Talvez o endereço tenha mudado. Você pode voltar para a Koda ou procurar o que precisa na Central de Suporte.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/" className="rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white">Voltar ao início</Link>
          <a href="/suporte" className="rounded-full border border-black/15 px-6 py-3 text-sm font-semibold">Central de Suporte</a>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="grid min-h-screen place-items-center bg-[#f5f5f7] px-5 text-[#1d1d1f]">
      <div className="max-w-xl text-center">
        <p className="text-sm font-semibold text-[#0071e3]">Koda</p>
        <h1 className="mt-4 text-5xl font-semibold tracking-[-.055em] sm:text-6xl">Esta página não carregou.</h1>
        <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-[#6e6e73]">
          Tente novamente. Se o problema continuar, você pode voltar ao início sem perder os dados já salvos na sua conta.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0077ed]"
          >
            Tentar novamente
          </button>
          <a href="/" className="rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-semibold">
            Voltar ao início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Koda — tecnologia para o seu dia" },
      {
        name: "description",
        content: "Koda: tecnologia simples, útil e próxima. Conheça o KodaBot, o KodaBot Pro, o KODA OS e o KodaCare.",
      },
      { name: "author", content: "Koda" },
      { property: "og:title", content: "Koda — tecnologia para o seu dia" },
      {
        property: "og:description",
        content: "Conheça o KodaBot, o KodaBot Pro, o KODA OS, o KodaCare e os serviços da Koda.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ScrollAnimations />
        <Outlet />
      </AuthProvider>
    </QueryClientProvider>
  );
}
