// Student notifications. Called by pg_cron (daily reminder) and the messages trigger (teacher message), with header x-cron.
// Web push for the website; APNs for the iPhone app (push_subs.endpoint = 'apns:<device token>').
// APNs secrets (Supabase › Edge Functions › Secrets): APNS_KEY (.p8 text), APNS_KEY_ID, APNS_TEAM_ID; optional APNS_TOPIC (default com.beat60s.app).
// {"init":true} only creates VAPID keys if missing.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { importPKCS8, SignJWT } from "npm:jose@5.9.6";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const APP = "https://beat60s.com/";
const env = (k: string) => Deno.env.get(k) || "";
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });

let JWT: { t: string; at: number } | null = null;
async function apnsJwt() {
  if (JWT && Date.now() - JWT.at < 50 * 60e3) return JWT.t;
  const key = await importPKCS8(env("APNS_KEY").replace(/\\n/g, "\n"), "ES256");
  const t = await new SignJWT({}).setProtectedHeader({ alg: "ES256", kid: env("APNS_KEY_ID") }).setIssuer(env("APNS_TEAM_ID")).setIssuedAt().sign(key);
  JWT = { t, at: Date.now() };
  return t;
}
// production first; a Xcode (development) build's token says BadDeviceToken there, so try sandbox next. Returns "ok" | "gone" | "fail".
async function apns(token: string, title: string, body: string, tag: string) {
  if (!env("APNS_KEY") || !env("APNS_KEY_ID") || !env("APNS_TEAM_ID")) return "fail";
  for (const host of ["api.push.apple.com", "api.sandbox.push.apple.com"]) {
    const r = await fetch(`https://${host}/3/device/${token}`, {
      method: "POST",
      headers: { authorization: `bearer ${await apnsJwt()}`, "apns-topic": env("APNS_TOPIC") || "com.beat60s.app", "apns-push-type": "alert", "apns-priority": "10", "apns-expiration": String(Math.floor(Date.now() / 1000) + 3 * 3600), "apns-collapse-id": tag },
      body: JSON.stringify({ aps: { alert: { title, body }, sound: "default" } }),
    });
    if (r.ok) return "ok";
    const why = ((await r.json().catch(() => ({}))) as any).reason || "";
    console.warn("apns", r.status, why, host);
    if (r.status === 410 || why === "Unregistered") return "gone";
    if (why !== "BadDeviceToken") return "fail";
  }
  return "gone";
}

Deno.serve(async (req) => {
  let body: any = {};
  try { body = await req.json(); } catch (_) { /* empty */ }
  const { data: cfg, error } = await db.rpc("push_cfg_get");
  if (error || !cfg) return json({ error: "not_ready" }, 500);
  if (!cfg.pub) {
    const k = webpush.generateVAPIDKeys();
    await db.rpc("push_cfg_set", { p_pub: k.publicKey, p_priv: k.privateKey });
    return json({ init: true });
  }
  if (body.init) return json({ init: false });
  if (req.headers.get("x-cron") !== cfg.cron) return json({ error: "forbidden" }, 403);
  webpush.setVapidDetails(APP, cfg.pub, cfg.priv);
  let rows: any[] = [];
  if (Array.isArray(body.msgs)) {
    const { data } = await db.rpc("push_msg_targets", { p_ids: body.msgs });
    rows = ((data || []) as any[]).map((r) => ({ ...r, tag: "mc-msg" }));
  } else {
    const { data } = await db.rpc("push_targets");
    rows = ((data || []) as any[]).map((r) => ({ ...r, title: "تحدّي الدقيقة ⏱", body: "يا " + (r.name || "بطل") + "، باقي لك جولة اليوم. دقيقة وحدة بس!", tag: "mc-daily" }));
  }
  let sent = 0, dropped = 0;
  for (const r of rows) {
    const ep = String(r.endpoint || "");
    if (ep.startsWith("apns:")) {
      const st = await apns(ep.slice(5), r.title, r.body, r.tag).catch((e) => { console.warn("apns err", e); return "fail"; });
      if (st === "ok") sent++;
      else if (st === "gone") { await db.rpc("push_drop", { p_endpoint: ep }); dropped++; }
      continue;
    }
    const msg = { title: r.title, body: r.body, url: APP, tag: r.tag };
    try {
      await webpush.sendNotification({ endpoint: ep, keys: { p256dh: r.p256dh, auth: r.auth } }, JSON.stringify(msg), { TTL: 3 * 3600, urgency: "normal" });
      sent++;
    } catch (e: any) {
      if (e && (e.statusCode === 404 || e.statusCode === 410)) { await db.rpc("push_drop", { p_endpoint: ep }); dropped++; }
    }
  }
  return json({ sent, dropped });
});
