/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { type FormEvent, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Settings2 } from "lucide-react";
import { useAuth } from "@/components/koda/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
export const Route = createFileRoute("/conta/configuracoes")({ component: Settings });
function Settings() {
  const { user } = useAuth();
  const db = supabase as any;
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (user)
      db.from("profiles")
        .select("full_name,phone")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }: any) => {
          setName(data?.full_name ?? "");
          setPhone(data?.phone ?? "");
        });
  }, [user]);
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    const { error } = await db
      .from("profiles")
      .update({ full_name: name.trim() || null, phone: phone.trim() || null })
      .eq("user_id", user.id);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    }
  }
  if (!user)
    return (
      <main className="mx-auto min-h-[650px] max-w-4xl px-5 py-14">
        <a href="/conta/entrar?next=/conta/configuracoes">Entre para configurar sua conta.</a>
      </main>
    );
  return (
    <main className="mx-auto min-h-[650px] max-w-4xl px-5 py-14">
      <Settings2 className="h-8 w-8 text-[#0071e3]" />
      <h1 className="mt-5 text-5xl font-semibold tracking-[-.05em]">Configurações.</h1>
      <form onSubmit={save} className="mt-10 rounded-[30px] bg-white p-7 sm:p-10">
        <h2 className="text-2xl font-semibold">Perfil</h2>
        <label className="mt-6 block text-sm font-semibold">
          Nome
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="contact-input mt-2"
          />
        </label>
        <label className="mt-5 block text-sm font-semibold">
          Telefone
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="contact-input mt-2"
            inputMode="tel"
          />
        </label>
        <p className="mt-5 text-sm text-[#6e6e73]">E-mail: {user.email}</p>
        <button className="mt-7 rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white">
          Salvar perfil
        </button>
        {saved && (
          <span className="ml-4 inline-flex items-center gap-1 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            Salvo
          </span>
        )}
      </form>
      <section className="mt-4 rounded-[30px] bg-white p-7">
        <h2 className="text-xl font-semibold">Segurança e privacidade</h2>
        <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold text-[#0066cc]">
          <a href="/conta/recuperar">Alterar senha</a>
          <a href="/privacidade">Política de privacidade</a>
        </div>
      </section>
    </main>
  );
}
