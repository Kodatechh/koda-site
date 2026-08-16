import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const service = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
async function sha256Hex(value: string) { const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join(""); }
function normalizeModel(value: unknown) { return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, ""); }
function versionParts(value: unknown) { return String(value || "0").replace(/^v/i, "").split(".").map((part) => Number(part.replace(/\D.*/, "")) || 0); }
function compareVersions(left: unknown, right: unknown) { const a = versionParts(left); const b = versionParts(right); for (let i = 0; i < Math.max(a.length, b.length); i++) { if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) - (b[i] || 0); } return 0; }
async function authenticateDevice(req: Request) {
  const auth = req.headers.get("authorization") || ""; if (!auth.toLowerCase().startsWith("bearer ")) return null;
  const token = auth.slice(7).trim(); if (!token) return null;
  const { data: record } = await service.from("koda_device_tokens").select("device_id,expires_at,revoked_at").eq("token_hash", await sha256Hex(token)).maybeSingle();
  if (!record || record.revoked_at || new Date(record.expires_at) <= new Date()) return null;
  const { data: device } = await service.from("devices").select("id,serial_number,model,status,kodaos_version").eq("id", record.device_id).maybeSingle();
  return !device || device.status === "retired" ? null : device;
}
async function latestRelease(device: any) {
  const { data, error } = await service.from("koda_os_releases").select("id,version,target_model,channel,release_notes,changelog_items,sha256,file_size,status,published_at,original_filename,storage_path").eq("status", "published").eq("channel", "stable").order("published_at", { ascending: false }).limit(100);
  if (error) throw error;
  return (data || []).find((release) => normalizeModel(release.target_model) === normalizeModel(device.model) && compareVersions(release.version, device.kodaos_version || "0") > 0) || null;
}
function payload(release: any) {
  if (!release) return { update_available: false };
  return { update_available: true, release_id: release.id, version: release.version, target_model: release.target_model, channel: release.channel, notes: release.release_notes || "", changelog: Array.isArray(release.changelog_items) ? release.changelog_items.filter((item: unknown) => typeof item === "string" && item.trim()) : [], sha256: release.sha256, size: release.file_size, filename: release.original_filename, download_url: `${SUPABASE_URL}/functions/v1/kodacloud-ota/v1/update/download/${release.id}` };
}
Deno.serve(async (req) => {
  try {
    const url = new URL(req.url); let path = url.pathname.replace(/^.*\/kodacloud-ota/, ""); if (!path.startsWith("/")) path = "/" + path;
    if (req.method === "GET" && path === "/health") return json({ ok: true, service: "kodacloud-ota" });
    const device = await authenticateDevice(req); if (!device) return json({ error: "invalid_device_token" }, 401);
    if (req.method === "GET" && path === "/v1/update/check") { const release = await latestRelease(device); return json({ device: { serial: device.serial_number, model: device.model, current_version: device.kodaos_version || null }, ...payload(release) }); }
    const match = path.match(/^\/v1\/update\/download\/([0-9a-f-]+)$/i);
    if (req.method === "GET" && match) {
      const { data: release } = await service.from("koda_os_releases").select("id,version,target_model,channel,sha256,file_size,status,original_filename,storage_path").eq("id", match[1]).eq("status", "published").eq("channel", "stable").maybeSingle();
      if (!release) return json({ error: "release_not_found" }, 404);
      if (normalizeModel(release.target_model) !== normalizeModel(device.model)) return json({ error: "release_not_compatible" }, 403);
      if (compareVersions(release.version, device.kodaos_version || "0") <= 0) return json({ error: "update_not_needed" }, 409);
      const { data: file, error } = await service.storage.from("koda-os-releases").download(release.storage_path); if (error || !file) return json({ error: "package_unavailable" }, 503);
      const filename = String(release.original_filename || `koda-os-${release.version}.zip`).replace(/[\r\n"\\]/g, "_");
      return new Response(file, { headers: { "content-type": "application/octet-stream", "content-length": String(release.file_size), "content-disposition": `attachment; filename="${filename}"`, "cache-control": "private, no-store", "x-koda-version": release.version, "x-koda-sha256": release.sha256 } });
    }
    if (req.method === "POST" && path === "/v1/update/installed") {
      let body: Record<string, unknown> = {}; try { body = await req.json(); } catch { /* validated below */ }
      const version = String(body.version || "").trim().slice(0, 64); const releaseId = String(body.release_id || "").trim(); if (!version) return json({ error: "missing_version" }, 400);
      if (releaseId) { const { data: release } = await service.from("koda_os_releases").select("id,version,target_model").eq("id", releaseId).maybeSingle(); if (!release || release.version !== version || normalizeModel(release.target_model) !== normalizeModel(device.model)) return json({ error: "release_mismatch" }, 400); }
      if (compareVersions(version, device.kodaos_version || "0") < 0) return json({ error: "version_regression" }, 409);
      await service.from("devices").update({ kodaos_version: version, latest_available_kodaos: null }).eq("id", device.id);
      return json({ ok: true, version });
    }
    return json({ error: "not_found" }, 404);
  } catch (error) { console.error(error instanceof Error ? error.name : "internal_error"); return json({ error: "internal_error" }, 500); }
});
