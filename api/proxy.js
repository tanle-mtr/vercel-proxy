const ALLOWED = [
  'huggingface.co',
  'github.com',
  'raw.githubusercontent.com',
  'codeload.github.com',
  'objects.githubusercontent.com',
  'vercel.com',
  'dash.cloudflare.com',
  'drive.internxt.com',
  'tanle.xyz'
];

function isAllowed(host) {
  return ALLOWED.some(d => host === d || host.endsWith('.' + d));
}

module.exports = async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    let target = url.searchParams.get('to');

    if (!target) {
      const m = url.pathname.match(/^\/([^\/]+)(\/.*)?$/);
      if (m && isAllowed(m[1])) {
        target = 'https://' + m[1] + (m[2] || '/') + url.search;
      }
    }

    if (!target) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(getNav());
    }

    const targetUrl = new URL(target);
    if (!isAllowed(targetUrl.hostname)) {
      res.writeHead(403);
      return res.end('Not allowed');
    }

    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      const low = k.toLowerCase();
      if (['host', 'cf-connecting-ip', 'x-vercel-id', 'connection', 'content-length'].includes(low)) continue;
      headers.set(k, v);
    }
    headers.set('Host', targetUrl.hostname);

    const upRes = await fetch(targetUrl.toString(), {
      method: req.method,
      headers,
      body: (req.method !== 'GET' && req.method !== 'HEAD') ? req : undefined,
      redirect: 'manual'
    });

    if ([301,302,303,307,308].includes(upRes.status)) {
      const loc = upRes.headers.get('location');
      if (loc) {
        try {
          const locUrl = new URL(loc, targetUrl);
          if (isAllowed(locUrl.hostname)) {
            const newLoc = '/' + locUrl.hostname + locUrl.pathname + locUrl.search;
            res.writeHead(upRes.status, { 'Location': newLoc });
            return res.end();
          }
        } catch {}
      }
      res.writeHead(upRes.status);
      return res.end();
    }

    const respHeaders = {};
    upRes.headers.forEach((val, key) => {
      const low = key.toLowerCase();
      if (['content-encoding','transfer-encoding','content-security-policy','content-security-policy-report-only','cross-origin-resource-policy'].includes(low)) return;
      respHeaders[key] = val;
    });
    delete respHeaders['content-security-policy'];
    delete respHeaders['content-security-policy-report-only'];
    respHeaders['Access-Control-Allow-Origin'] = '*';

    const ct = (respHeaders['Content-Type'] || respHeaders['content-type'] || '').toLowerCase();

    if (ct.includes('text/html')) {
      let html = await upRes.text();
      const fix = '<script>(function(){var b=window.location.pathname.split("/").slice(0,2).join("/")+"/";document.addEventListener("click",function(e){var l=e.target.closest("a");if(l&&l.href){try{var u=new URL(l.href);if(u.hostname==="'+targetUrl.hostname+'"||u.hostname.endsWith(".'+targetUrl.hostname.split('.').slice(-2).join('.')+'")){e.preventDefault();window.location.href=b+u.pathname.replace(/^\\//,"")+u.search}}}catch(e){}}})})();</script>';
      html = html.replace('</body>', fix + '</body>');
      res.writeHead(upRes.status, respHeaders);
      return res.end(html);
    }

    const buf = await upRes.arrayBuffer();
    res.writeHead(upRes.status, respHeaders);
    res.end(Buffer.from(buf));

  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.writeHead(500);
      res.end('Error: ' + err.message);
    }
  }
};

function getNav() {
  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>导航</title><style>body{font-family:sans-serif;background:#f1f5f9;padding:2rem;text-align:center}.card{display:inline-block;margin:1rem;padding:2rem;background:white;border-radius:12px;text-decoration:none;color:#333;box-shadow:0 2px 8px rgba(0,0,0,0.1)}.card:hover{box-shadow:0 4px 16px rgba(0,0,0,0.15)}.icon{font-size:2.5rem;display:block}</style></head><body><h1>🌐 反代导航</h1><a class="card" href="/huggingface.co/"><span class="icon">🤗</span><h3>Hugging Face</h3></a><a class="card" href="/github.com/"><span class="icon">🐙</span><h3>GitHub</h3></a><a class="card" href="/vercel.com/"><span class="icon">▲</span><h3>Vercel</h3></a><a class="card" href="/drive.internxt.com/"><span class="icon">☁️</span><h3>Internxt</h3></a></body></html>';
}
