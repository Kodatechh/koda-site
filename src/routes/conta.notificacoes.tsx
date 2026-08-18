/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { type ReactNode, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bell, CheckCheck } from "lucide-react";

import { useAuth } from "@/components/koda/AuthProvider";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/conta/notificacoes")({ component: Notifications });
type Notice = {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  read_at: string | null;
  created_at: string;
};
function Notifications() {
  const { user, loading } = useAuth();
  const db = supabase as any;
  const [items, setItems] = useState<Notice[]>([]);
  const [busy, setBusy] = useState(false);
  const load = () =>
    user &&
    db
      .from("user_notifications")
      .select("id,type,title,body,href,read_at,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }: any) => setItems(data ?? []));
  useEffect(() => {
    load();
  }, [user]);
  async function read(id: string, href: string | null) {
    await db.from("user_notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    if (href) window.location.href = href;
    else load();
  }
  async function all() {
    setBusy(true);
    await db
      .from("user_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user!.id)
      .is("read_at", null);
    await load();
    setBusy(false);
  }
  if (loading)
    return (
      <Page>
        <p>Carregando…</p>
      </Page>
    );
  if (!user)
    return (
      <Page>
        <a href="/conta/entrar?next=/conta/notificacoes">Entre para ver suas notificações.</a>
      </Page>
    );
  return (
    <Page>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#0071e3]">Conta Koda</p>
          <h1 className="mt-2 text-5xl font-semibold tracking-[-.05em]">Notificações.</h1>
        </div>
        <button
          disabled={busy || !items.some((i) => !i.read_at)}
          onClick={all}
          className="flex items-center gap-2 text-sm font-semibold text-[#0066cc] disabled:opacity-40"
        >
          <CheckCheck className="h-4 w-4" />
          Marcar todas
        </button>
      </div>
      <div className="mt-10 overflow-hidden rounded-[30px] bg-white">
        {items.length ? (
          items.map((item) => (
            <button
              key={item.id}
              onClick={() => read(item.id, item.href)}
              className={`block w-full border-b border-black/10 p-6 text-left last:border-0 ${item.read_at ? "opacity-65" : "bg-[#f5f9ff]"}`}
            >
              <div className="flex gap-4">
                <Bell className="mt-1 h-5 w-5 shrink-0 text-[#0071e3]" />
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-[#6e6e73]">{item.body}</p>
                  <p className="mt-2 text-xs text-[#86868b]">
                    {new Intl.DateTimeFormat("pt-BR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(item.created_at))}
                  </p>
                </div>
              </div>
            </button>
          ))
        ) : (
          <div className="p-12 text-center">
            <Bell className="mx-auto h-8 w-8 text-[#86868b]" />
            <h2 className="mt-4 text-2xl font-semibold">Tudo tranquilo por aqui.</h2>
            <p className="mt-2 text-sm text-[#6e6e73]">
              Atualizações importantes aparecerão nesta página.
            </p>
          </div>
        )}
      </div>
    </Page>
  );
}
function Page({ children }: { children: ReactNode }) {
  return <main className="mx-auto min-h-[650px] max-w-5xl px-5 py-14">{children}</main>;
}
