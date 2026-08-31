import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });

function outputText(response: Record<string, unknown>) {
  if (typeof response.output_text === "string") return response.output_text;
  const output = Array.isArray(response.output) ? response.output : [];
  for (const item of output as Array<Record<string, unknown>>) {
    const content = Array.isArray(item.content) ? item.content : [];
    for (const part of content as Array<Record<string, unknown>>) {
      if (part.type === "output_text" && typeof part.text === "string") return part.text;
    }
  }
  return "";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authorization = req.headers.get("Authorization") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const openAiKey = Deno.env.get("OPENAI_API_KEY");
  if (!authorization.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "server_configuration_error" }, 500);
  if (!openAiKey) return json({ error: "ai_not_configured" }, 503);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData } = await admin.auth.getUser(authorization.slice(7));
  const user = userData.user;
  if (!user) return json({ error: "unauthorized" }, 401);

  const body = (await req.json().catch(() => null)) as {
    mode?: "customer_assist" | "triage" | "draft_reply";
    case_id?: string;
    category?: string;
    subject?: string;
    message?: string;
  } | null;
  if (!body?.mode) return json({ error: "invalid_request" }, 400);

  let context = "";
  let isStaff = false;
  let supportCategory = body.category ?? "outro";
  if (body.mode === "customer_assist") {
    if (!body.message?.trim()) return json({ error: "message_required" }, 400);
    context = `Categoria: ${body.category ?? "outro"}\nTítulo: ${body.subject ?? ""}\nMensagem: ${body.message}`;
  } else {
    if (!body.case_id) return json({ error: "case_required" }, 400);
    const [{ data: roles }, { data: supportCase }, { data: notes }] = await Promise.all([
      admin.from("user_roles").select("role").eq("user_id", user.id),
      admin.from("support_cases").select("*").eq("id", body.case_id).maybeSingle(),
      admin
        .from("support_case_notes")
        .select("body,visibility,created_at,author_user_id")
        .eq("case_id", body.case_id)
        .order("created_at"),
    ]);
    isStaff = (roles ?? []).some((item) =>
      ["admin", "support_agent", "support_advanced"].includes(item.role),
    );
    if (!isStaff || !supportCase) return json({ error: "forbidden" }, 403);
    supportCategory = supportCase.category ?? "outro";
    context = [
      `Categoria: ${supportCase.category}`,
      `Título: ${supportCase.subject}`,
      `Mensagem inicial: ${supportCase.message}`,
      `Estado: ${supportCase.status}`,
      `Dispositivo vinculado: ${supportCase.device_id ? "sim" : "não"}`,
      "Histórico:",
      ...(notes ?? []).map(
        (note) =>
          `${note.author_user_id === supportCase.owner_user_id ? "Cliente" : "Equipe"}: ${note.body}`,
      ),
    ].join("\n");
  }

  const allowedCategories = ["produto", "reparo", "garantia", "conta", "kodaos", "pedido", "seguranca", "outro"];
  if (!allowedCategories.includes(supportCategory)) supportCategory = "outro";
  const { data: approvedArticles } = await admin
    .from("support_knowledge_articles")
    .select("title,category,body,updated_at")
    .eq("status", "approved")
    .in("category", [supportCategory, "seguranca", "outro"])
    .order("updated_at", { ascending: false })
    .limit(6);
  const approvedKnowledge = (approvedArticles ?? []).length
    ? (approvedArticles ?? []).map((article) => `FONTE APROVADA — ${article.title}\n${article.body}`).join("\n\n")
    : "Nenhuma fonte de procedimento aprovada para esta categoria.";

  const schema =
    body.mode === "customer_assist"
      ? {
          type: "object",
          additionalProperties: false,
          properties: {
            suggested_subject: { type: "string" },
            improved_message: { type: "string" },
            missing_information: { type: "array", items: { type: "string" } },
          },
          required: ["suggested_subject", "improved_message", "missing_information"],
        }
      : body.mode === "triage"
        ? {
            type: "object",
            additionalProperties: false,
            properties: {
              summary: { type: "string" },
              category: {
                type: "string",
                enum: ["produto", "reparo", "garantia", "conta", "kodaos", "pedido", "outro"],
              },
              priority: { type: "string", enum: ["low", "normal", "high", "urgent"] },
              next_actions: { type: "array", items: { type: "string" } },
              safety_alert: { type: "boolean" },
            },
            required: ["summary", "category", "priority", "next_actions", "safety_alert"],
          }
        : {
            type: "object",
            additionalProperties: false,
            properties: {
              reply: { type: "string" },
              internal_checks: { type: "array", items: { type: "string" } },
            },
            required: ["reply", "internal_checks"],
          };

  const instructions = `Você é o assistente de atendimento da Koda. Escreva em português do Brasil, com clareza, empatia e concisão. Use somente os fatos presentes no chamado e as FONTES APROVADAS fornecidas. Se não houver fonte aprovada, não dê procedimentos, políticas ou diagnósticos: apenas organize o relato, reconheça o problema e peça as informações necessárias para a equipe humana. Nunca invente capacidades do KodaBot, cobertura, garantia, estoque, prazo, preço, diagnóstico ou política. Não solicite senhas, códigos de autenticação ou dados completos de pagamento. Sinalize risco elétrico, calor excessivo, fumaça ou bateria danificada como urgente e recomende interromper o uso. Rascunhos nunca são enviados automaticamente. ${body.mode === "customer_assist" ? "Ajude o cliente a descrever o problema sem mudar os fatos." : body.mode === "triage" ? "Resuma e classifique para a equipe." : "Crie uma resposta que reconheça o problema e peça apenas as informações realmente necessárias."}`;

  const aiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${openAiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: Deno.env.get("OPENAI_SUPPORT_MODEL") ?? "gpt-5-mini",
      instructions,
      input: `CHAMADO\n${context.slice(0, 12000)}\n\nBASE DE CONHECIMENTO\n${approvedKnowledge.slice(0, 12000)}`,
      text: { format: { type: "json_schema", name: "koda_support_result", strict: true, schema } },
    }),
  });
  const result = (await aiResponse.json()) as Record<string, unknown>;
  if (!aiResponse.ok) return json({ error: "ai_request_failed" }, 502);

  try {
    const parsed = JSON.parse(outputText(result));
    if (body.mode === "triage" && body.case_id && isStaff) {
      await admin
        .from("support_cases")
        .update({
          ai_summary: parsed.summary,
          ai_category: parsed.category,
          ai_suggested_priority: parsed.priority,
        })
        .eq("id", body.case_id);
    }
    return json({ result: parsed });
  } catch {
    return json({ error: "invalid_ai_response" }, 502);
  }
});
