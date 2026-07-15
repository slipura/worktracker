/* Cloudflare Pages Function — cloud sync for WorkTracker.
   Route: /sync
   The sync code is passed in the "x-sync-code" header (never in the URL),
   and progress JSON is stored in the KV namespace bound as WT_KV.

   GET  /sync  -> returns stored JSON for the code (or "null")
   PUT  /sync  -> stores the request body JSON under the code
*/

function validCode(c) {
  return typeof c === "string" && /^[A-Za-z0-9-]{8,64}$/.test(c);
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" }
  });
}

export async function onRequestGet(context) {
  const { env, request } = context;
  if (!env.WT_KV) return json({ error: "storage not configured" }, 500);
  const code = request.headers.get("x-sync-code");
  if (!validCode(code)) return json({ error: "bad code" }, 400);
  const value = await env.WT_KV.get("wt:" + code);
  return new Response(value || "null", {
    headers: { "content-type": "application/json", "cache-control": "no-store" }
  });
}

export async function onRequestPut(context) {
  const { env, request } = context;
  if (!env.WT_KV) return json({ error: "storage not configured" }, 500);
  const code = request.headers.get("x-sync-code");
  if (!validCode(code)) return json({ error: "bad code" }, 400);
  const body = await request.text();
  if (body.length > 800000) return json({ error: "too big" }, 413);
  try { JSON.parse(body); } catch (e) { return json({ error: "bad json" }, 400); }
  await env.WT_KV.put("wt:" + code, body);
  return json({ ok: true });
}
