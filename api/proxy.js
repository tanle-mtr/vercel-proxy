// api/proxy.js - 无白名单，代理所有网站
export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    if (pathname === '/') {
      return sendNavPage(res);
    }

    // 提取 /domain/path 或 /https:/domain/path
    let targetHost, targetPath;
    const match = pathname.match(/^\/([^\/]+)(\/.*)?$/);
    if (match) {
      targetHost = match[1];
      targetPath = match[2] || '/';
    } else {
      return res.status(400).send('Invalid path format');
    }

    // 处理 https:/ 前缀
    if (targetHost.startsWith('https:') || targetHost.startsWith('http:')) {
      const fullUrl = targetHost.replace('https:', 'https://').replace('http:', 'http://') + targetPath;
      const parsed = new URL(fullUrl);
      targetHost = parsed.hostname;
      targetPath = parsed.pathname + parsed.search;
    }

    const upstreamUrl = `https://${targetHost}${targetPath}${url.search}`;

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      const lower = key.toLowerCase();
      if (['host', 'cf-connecting-ip', 'x-vercel-id', 'connection', 'content-length'].includes(lower)) continue;
      headers.set(key, value);
    }
    headers.set('Host', targetHost);
    headers.set('User-Agent', req.headers['user-agent'] || 'Mozilla/5.0');

    const upstreamResp = await fetch(upstreamUrl, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : req,
      redirect: 'manual',
    });

    if ([301, 302, 303, 307, 308].includes(upstreamResp.status)) {
      const location = upstreamResp.headers.get('Location');
      if (location) {
        try {
          const locURL = new URL(location);
          const newLocation = `/${locURL.hostname}${locURL.pathname}${locURL.search}`;
          res.setHeader('Location', newLocation);
          return res.status(upstreamResp.status).end();
        } catch {}
      }
      return res.status(upstreamResp.status).end();
    }

    const respHeaders = {};
    upstreamResp.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (['content-encoding', 'transfer-encoding', 'content-security-policy',
           'content-security-policy-report-only', 'cross-origin-resource-policy'].includes(lower)) return;
      respHeaders[key] = value;
    });
    delete respHeaders['content-security-policy'];
    delete respHeaders['content-security-policy-report-only'];
    respHeaders['Access-Control-Allow-Origin'] = '*';

    res.writeHead(upstreamResp.status, respHeaders);
    const reader = upstreamResp.body.getReader();
    const pump = () => {
      reader.read().then(({ done, value }) => {
        if (done) return res.end();
        res.write(value);
        pump();
      }).catch(() => {
        if (!res.writableEnded) res.end();
      });
    };
    pump();

  } catch (err) {
    console.error('PROXY_ERROR:', err);
    if (!res.headersSent) {
      res.status(500).send('Internal Server Error: ' + err.message);
    }
  }
}

function sendNavPage(res) {
  const html = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>反代导航</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:linear-gradient(135deg,#0f172a,#1e293b);min-height:100vh;display:flex;align-items:center;justify-content:center;color:#e2e8f0;padding:20px}
.container{max-width:900px;width:100%;text-align:center}
h1{font-size:2.2rem;margin-bottom:.5rem;color:#fff}
.sub{color:#94a3b8;margin-bottom:2.5rem}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px}
.card{background:#1e293b;border:1px solid #334155;border-radius:16px;padding:28px 20px;text-decoration:none;color:#e2e8f0;transition:.25s;border-top:3px solid #6366f1}
.card:hover{transform:translateY(-6px);border-color:#6366f1;box-shadow:0 12px 40px rgba(0,0,0,.4)}
.icon{font-size:2.8rem;margin-bottom:12px}
.card h3{font-size:1.2rem;margin-bottom:6px;color:#fff}
.card span{font-size:.85rem;color:#94a3b8}
.footer{margin-top:3rem;font-size:.8rem;color:#475569}
</style></head>
<body><div class="container">
<h1>🧭 反代导航</h1>
<p class="sub">Vercel Hobby · 100万请求/月 · 100GB 带宽</p>
<div class="grid">
<a class="card" href="/github.com/"><div class="icon">🐙</div><h3>GitHub</h3><span>github.com</span></a>
<a class="card" href="/huggingface.co/"><div class="icon">🤗</div><h3>Hugging Face</h3><span>huggingface.co</span></a>
<a class="card" href="/example.com/"><div class="icon">🌐</div><h3>Example</h3><span>example.com</span></a>
</div>
<p class="footer">输入 /域名/路径 即可代理任意网站</p>
</div></body></html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}
