// api/proxy.js - 稳定版，无流式传输，使用 text/arrayBuffer
const ALLOWED_DOMAINS = [
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

function isAllowed(hostname) {
  return ALLOWED_DOMAINS.some(domain =>
    hostname === domain || hostname.endsWith('.' + domain)
  );
}

module.exports = async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    let target = url.searchParams.get('to');

    // 如果没有 ?to= 参数，尝试从路径解析（如 /huggingface.co/models）
    if (!target) {
      const match = url.pathname.match(/^\/([^\/]+)(\/.*)?$/);
      if (match) {
        const domain = match[1];
        const rest = match[2] || '/';
        if (isAllowed(domain)) {
          target = `https://${domain}${rest}${url.search}`;
        }
      }
    }

    // 没有目标 → 返回导航页
    if (!target) {
      const navHtml = getNavPage();
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(navHtml);
    }

    const targetUrl = new URL(target);
    if (!isAllowed(targetUrl.hostname)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Domain not allowed: ' + targetUrl.hostname);
    }

    // 构造请求头（使用 Headers 对象）
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      const lower = key.toLowerCase();
      if (['host', 'cf-connecting-ip', 'x-vercel-id', 'connection', 'content-length'].includes(lower)) continue;
      headers.set(key, value);
    }
    headers.set('Host', targetUrl.hostname);

    // 发起请求
    const upstreamRes = await fetch(targetUrl.toString(), {
      method: req.method,
      headers,
      body: (req.method !== 'GET' && req.method !== 'HEAD') ? req : undefined,
      redirect: 'manual',
    });

    // 处理 3xx 重定向
    if ([301, 302, 303, 307, 308].includes(upstreamRes.status)) {
      const location = upstreamRes.headers.get('location');
      if (location) {
        try {
          const locUrl = new URL(location, targetUrl);
          if (isAllowed(locUrl.hostname)) {
            const newLoc = `/${locUrl.hostname}${locUrl.pathname}${locUrl.search}`;
            res.writeHead(upstreamRes.status, { 'Location': newLoc });
            return res.end();
          }
        } catch {}
      }
      res.writeHead(upstreamRes.status);
      return res.end();
    }

    // 收集响应头
    const respHeaders = {};
    upstreamRes.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (['content-encoding', 'transfer-encoding', 'content-security-policy',
           'content-security-policy-report-only', 'cross-origin-resource-policy'].includes(lower)) return;
      respHeaders[key] = value;
    });
    delete respHeaders['content-security-policy'];
    delete respHeaders['content-security-policy-report-only'];
    respHeaders['Access-Control-Allow-Origin'] = '*';

    // 判断内容类型
    const contentType = (respHeaders['Content-Type'] || respHeaders['content-type'] || '').toLowerCase();

    if (contentType.includes('text/html')) {
      // HTML 页面：读取文本并注入修复脚本
      let html = await upstreamRes.text();
      const fixScript = `
        <script>
          (function() {
            var basePath = window.location.pathname.split('/').slice(0, 2).join('/') + '/';
            document.addEventListener('click', function(e) {
              var link = e.target.closest('a');
              if (link && link.href) {
                try {
                  var linkUrl = new URL(link.href);
                  if (linkUrl.hostname === '${targetUrl.hostname}' || linkUrl.hostname.endsWith('.${targetUrl.hostname.split('.').slice(-2).join('.')}')) {
                    e.preventDefault();
                    window.location.href = basePath + linkUrl.pathname.replace(/^\\//, '') + linkUrl.search;
                  }
                } catch(e) {}
              }
            });
          })();
        </script>`;
      html = html.replace('</body>', fixScript + '</body>');
      res.writeHead(upstreamRes.status, respHeaders);
      return res.end(html);
    }

    // 其他类型（JS、CSS、图片、二进制等）：读取 buffer 并发送
    const buffer = await upstreamRes.arrayBuffer();
    res.writeHead(upstreamRes.status, respHeaders);
    res.end(Buffer.from(buffer));

  } catch (err) {
    console.error('PROXY_ERROR:', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Internal Error: ' + err.message);
    }
  }
};

function getNavPage() {
  return `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8">
<title>反代导航</title>
<style>
body{font-family:sans-serif;background:#f1f5f9;padding:2rem;text-align:center}
.card{display:inline-block;margin:1rem;padding:2rem;background:white;border-radius:12px;text-decoration:none;color:#333;box-shadow:0 2px 8px rgba(0,0,0,0.1)}
.card:hover{box-shadow:0 4px 16px rgba(0,0,0,0.15)}
.icon{font-size:2.5rem;display:block;margin-bottom:0.5rem}
</style></head>
<body>
<h1>🌐 反代导航</h1>
<a class="card" href="/huggingface.co/"><span class="icon">🤗</span><h3>Hugging Face</h3></a>
<a class="card" href="/github.com/"><span class="icon">🐙</span><h3>GitHub</h3></a>
<a class="card" href="/vercel.com/"><span class="icon">▲</span><h3>Vercel</h3></a>
<a class="card" href="/drive.internxt.com/"><span class="icon">☁️</span><h3>Internxt</h3></a>
</body></html>`;
}
