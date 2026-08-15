import { FormEvent, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/conta/recuperar")({ head: () => ({ meta: [{ title: "Recuperar senha — KodaCloud" }] }), component: Recover });

function Recover() {
  const [email,setEmail]=useState(""); const [message,setMessage]=useState<string|null>(null); const [loading,setLoading]=useState(false);
  async function submit(e:FormEvent){e.preventDefault();setLoading(true);const redirectTo=`${window.location.origin}/conta/redefinir`;await supabase.auth.resetPasswordForEmail(email,{redirectTo});setLoading(false);setMessage("Se existir uma Conta KodaCloud com esse e-mail, enviaremos as instruções para redefinir a senha.");}
  return <main className="mx-auto grid min-h-[650px] max-w-6xl place-items-center px-5 py-16"><div className="w-full max-w-md rounded-[30px] bg-white p-8"><KeyRound className="h-8 w-8 text-[#0071e3]"/><h1 className="mt-6 text-4xl font-semibold tracking-[-0.045em]">Redefina sua senha.</h1><p className="mt-3 text-sm text-[#6e6e73]">Digite o e-mail da sua Conta KodaCloud.</p><form onSubmit={submit} className="mt-7"><input required type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="seu@email.com" className="h-12 w-full rounded-xl border border-black/15 px-4 outline-none focus:border-[#0071e3]"/>{message&&<p className="mt-4 rounded-xl bg-[#f5f5f7] p-3 text-xs leading-relaxed text-[#6e6e73]">{message}</p>}<button disabled={loading} className="mt-4 h-12 w-full rounded-full bg-[#0071e3] text-sm font-semibold text-white">{loading?"Enviando…":"Enviar instruções"}</button></form></div></main>;
}
