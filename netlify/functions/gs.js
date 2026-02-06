/**
 * Netlify Function: Proxy para Google Apps Script (evita CORS no navegador)
 * GET  /.netlify/functions/gs?scriptUrl=...&action=getEmployees
 * POST /.netlify/functions/gs?scriptUrl=...&action=syncRow  (body JSON será repassado)
 */
export default async (request, context) => {
  try {
    const url = new URL(request.url);
    const scriptUrl = url.searchParams.get('scriptUrl') || '';
    const action = url.searchParams.get('action') || '';

    // Validação simples para evitar abuso
    if (!scriptUrl.startsWith('https://script.google.com/macros/s/')) {
      return new Response(JSON.stringify({ error: 'Invalid scriptUrl' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    if (!action) {
      return new Response(JSON.stringify({ error: 'Missing action' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const target = new URL(scriptUrl);
    // mantém qualquer query original do deployment e adiciona action
    target.searchParams.set('action', action);

    // Copia outros params (exceto scriptUrl)
    for (const [k, v] of url.searchParams.entries()) {
      if (k === 'scriptUrl' || k === 'action') continue;
      target.searchParams.set(k, v);
    }

    const init = {
      method: request.method,
      headers: {
        'Accept': 'application/json',
      },
    };

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const ct = request.headers.get('content-type') || 'application/json';
      init.headers['Content-Type'] = ct;
      init.body = await request.text();
    }

    const resp = await fetch(target.toString(), init);

    // Apps Script às vezes responde text/plain; tentamos repassar como JSON quando possível
    const text = await resp.text();
    let body = text;
    let contentType = resp.headers.get('content-type') || 'text/plain; charset=utf-8';

    // Se parece JSON, normalize content-type
    const looksJson = text && (text.trim().startsWith('{') || text.trim().startsWith('['));
    if (looksJson) contentType = 'application/json; charset=utf-8';

    return new Response(body, {
      status: resp.status,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Proxy error', detail: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
};
