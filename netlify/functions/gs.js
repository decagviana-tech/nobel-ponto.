export default async (req) => {
  try {
    const scriptUrl = process.env.VITE_GOOGLE_SCRIPT_URL || process.env.GOOGLE_SCRIPT_URL;
    if (!scriptUrl) {
      return new Response(JSON.stringify({ ok: false, error: "Missing VITE_GOOGLE_SCRIPT_URL" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const upstreamUrl = new URL(scriptUrl);
    const incomingUrl = new URL(req.url);

    // repassa querystring (?action=...)
    incomingUrl.searchParams.forEach((v, k) => upstreamUrl.searchParams.set(k, v));

    const upstream = await fetch(upstreamUrl.toString(), { method: "GET" });
    const text = await upstream.text();

    return new Response(text, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "text/plain; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
};
