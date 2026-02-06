// Netlify Function: Proxy para Google Apps Script (evita CORS no navegador)
// GET  /.netlify/functions/gs?action=getEmployees
// POST /.netlify/functions/gs?action=syncRow   (body JSON)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

export default async (request) => {
  try {
    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get("action") || "";

    // Aceita scriptUrl pela query OU por env var do Netlify
    const scriptUrl =
      url.searchParams.get("scriptUrl") ||
      process.env.VITE_GOOGLE_SCRIPT_URL ||
      process.env.GOOGLE_SCRIPT_URL ||
      "";

    if (!action) return json(400, { ok: false, error: "Missing action" });
    if (!scriptUrl) return json(500, { ok: false, error: "Missing script URL (set VITE_GOOGLE_SCRIPT_URL on Netlify)" });

    if (!scriptUrl.startsWith("https://script.google.com/macros/s/")) {
      return json(400, { ok: false, error: "Invalid scriptUrl", scriptUrl });
    }

    const target = new URL(scriptUrl);

    // garante action no Apps Script
    target.searchParams.set("action", action);

    // copia outros params (menos action/scriptUrl)
    for (const [k, v] of url.searchParams.entries()) {
      if (k === "action" || k === "scriptUrl") continue;
      target.searchParams.set(k, v);
    }

    const init = {
      method: request.method,
      headers: { Accept: "application/json" },
    };

    // Forward body em POST/PUT/PATCH
    if (request.method !== "GET" && request.method !== "HEAD") {
      const ct = request.headers.get("content-type") || "application/json";
      init.headers["Content-Type"] = ct;
      init.body = await request.text();
    }

    const resp = await fetch(target.toString(), init);
    const text = await resp.text();

    // tenta preservar content-type
    let contentType = resp.headers.get("content-type") || "text/plain; charset=utf-8";
    const looksJson = text && (text.trim().startsWith("{") || text.trim().startsWith("["));
    if (looksJson) contentType = "application/json; charset=utf-8";

    return new Response(text, {
      status: resp.status,
      headers: { ...corsHeaders, "Content-Type": contentType },
    });
  } catch (err) {
    return json(500, { ok: false, error: "Proxy error", detail: String(err) });
  }
};
