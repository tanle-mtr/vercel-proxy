// api/proxy.js - Vercel Node.js 运行时，使用 (req, res) 回调
const ALLOWED_PREFIXES = [
  '/github.com',
  '/api.github.com',
  '/raw.githubusercontent.com',
  '/codeload.github.com',
  '/objects.githubusercontent.com',
  '/camo.githubusercontent.com',
  '/avatars.githubusercontent.com'
];

function getNavPage() {
  return `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>GitHub 代理</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,sans-serif;background:#0d1117;color:#c9d1d9;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.container{max-width:800px;text-align:center}
h1{color:#fff;font-size:2.5rem;margin-bottom:1rem}
h1 span{color:#58a6ff}
.sub{color:#8b949e;margin-bottom:2rem}
.card{display:inline-block;margin:8px;padding:20px;background:#161b22;border:1px solid #30363d;border-radius:12px;text-decoration:none;color:#58a6ff;min-width:200px}
.card:hover{border-color:#58a6ff}
.card h3{margin-bottom:8px}
.card p{color:#8b949e;font-size:.85rem}
.tips{margin-top:2rem;padding:16px;background:#161b22;border-radius:8px;text-align:left;color:#8b949e;font-size:.85rem;line-height:1.6}
code{background:#0d1117;padding:2px 6px;border-radius:4px;color:#79c0ff}
</style></head>
<body><div class="container">
<h1><span>⬇️</span> GitHub 代理</h1>
<p class="sub">基于 Vercel Functions，参考 Cloudflare Worker 思路</p>
<a class="card" href="/github.com/"><h3>📦 仓库浏览</h3><p>/github.com/owner/repo</p></a>
<a class="card" href="/api.github.com/"><h3>🔌 API 访问</h3><p>/api.github.com/repos/...</p></a>
<a class="card" href="/raw.githubusercontent.com/"><h3>📄 Raw 文件</h3><p>/raw.githubusercontent.com/...</p></a>
<div class="tips">
<strong>💡 使用方式：</strong><br>
• 仓库：<code>/github.com/vercel/next.js</code><br>
• Release 下载：<code>/github.com/owner/repo/releases/download/v1.0/file.zip</code><br>
• Archive：<code>/github.com/owner/repo/archive/refs/heads/main.zip</code><br>
• Raw：<code>/raw.githubusercontent.com/owner/repo/branch/file</code><br>
• aria2c：<code>aria2c -x 16 -s 16 -c "https://你的域名/github.com/owner/repo/archive/main.zip"</code><br>
</div>
</div></body></html>`;
}

function replaceText(text) {
  text = text.replace(/https:\/\/github\.com/g, '/github.com');
  text = text.replace(/https:\/\/api\.github\.com/g, '/api.github.com');
  text = text.replace(/https:\/\/raw\.githubusercontent\.com/g, '/raw.githubusercontent.com');
  text = text.replace(/https:\/\/codeload\.github\.com/g, '/codeload.github.com');
  text = text.replace(/https:\/\/objects\.githubusercontent\.com/g, '/objects.githubusercontent.com');
  text = text.replace(/https:\/\/avatars\.githubusercontent\.com/g, '/avatars.githubusercontent.com');
  text = text.replace(/https:\/\/camo\.githubusercontent\.com/g, '/camo.githubusercontent.com');
  return text;
}

module.exports = async (req, res) => {
  try {
    // 解析 URL
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const path = url.pathname;

    // 根路径 → 导航页
    if (path === '/' || path === '') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(getNavPage());
    }

    // 检查是否以白名单前缀开头
    let matchedPrefix = null;
    for (const prefix of ALLOWED_PREFIXES) {
      if (path === prefix || path.startsWith(prefix + '/')) {
        matchedPrefix = prefix;
        break;
      }
    }

    if (!matchedPrefix) {
      // 不是合法代理路径，返回导航页
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(getNavPage());
    }

    const targetHost = matchedPrefix.slice(1); // 去掉开头的 /
    let remainingPath = path.slice(matchedPrefix.length) || '/';
    if (remainingPath === '') remainingPath = '/';

    const upstreamUrl = `https://${targetHost}${remainingPath}${url.search}`;

    // 构建请求头（从 req.headers 复制）
    const headers = {};
    for (const [key, value] of Object.entries(req.headers)) {
      const lower = key.toLowerCase();
      if (['host', 'cf-connecting-ip', 'x-vercel-id', 'connection', 'content-length'].includes(lower)) continue;
      headers[key] = value;
    }
    headers['Host'] = targetHost;
    headers['Origin'] = `https://${targetHost}`;
    headers['Referer'] = `https://${targetHost}/`;

    // 发起上游请求
    const fetchOpts = {
      method: req.method,
      headers,
      redirect: 'manual'
    };

    // 处理请求体（非 GET/HEAD）
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const body = await new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
      });
      fetchOpts.body = body;
    }

    const upstreamRes = await fetch(upstreamUrl, fetchOpts);
    const status = upstreamRes.status;

    // 处理重定向
    if ([301, 302, 303, 307, 308].includes(status)) {
      const location = upstreamRes.headers.get('location');
      if (location) {
        try {
          const locUrl = new URL(location);
          if (locUrl.hostname.includes('github.com') || locUrl.hostname.includes('githubusercontent.com')) {
            const newLoc = '/' + locUrl.hostname + locUrl.pathname + locUrl.search;
            res.writeHead(status, { 'Location': newLoc });
            return res.end();
          }
        } catch {}
      }
      res.writeHead(status, { 'Location': location || '' });
      return res.end();
    }

    // 收集响应头
    const respHeaders = {};
    upstreamRes.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (['content-encoding', 'transfer-encoding', 'content-security-policy',
           'content-security-policy-report-only', 'clear-site-data'].includes(lower)) return;
      respHeaders[key] = value;
    });
    respHeaders['Access-Control-Allow-Origin'] = '*';
    delete respHeaders['access-control-allow-credentials'];

    const contentType = (respHeaders['Content-Type'] || '').toLowerCase();

    if (contentType.includes('text/html')) {
      let html = await upstreamRes.text();
      html = replaceText(html);

      const fixScript = `
        <script>
          (function() {
            var map = {
              'https://github.com': '/github.com',
              'https://api.github.com': '/api.github.com',
              'https://raw.githubusercontent.com': '/raw.githubusercontent.com',
              'https://codeload.github.com': '/codeload.github.com'
            };
            function proxyUrl(u) {
              for (var k in map) {
                if (u.indexOf(k) === 0) return map[k] + u.substring(k.length);
              }
              return u;
            }
            var _fetch = window.fetch;
            window.fetch = function(input, init) {
              if (typeof input === 'string') input = proxyUrl(input);
              else if (input instanceof Request) input = new Request(proxyUrl(input.url), input);
              return _fetch.call(this, input, init);
            };
            var _open = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(m, u) {
              arguments[1] = proxyUrl(u);
              return _open.apply(this, arguments);
            };
          })();
        </script>
      `;
      html = html.replace('</head>', fixScript + '</head>');

      res.writeHead(status, { ...respHeaders, 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(html);
    }

    // 非 HTML：流式传输
    res.writeHead(status, respHeaders);
    if (upstreamRes.body) {
      const reader = upstreamRes.body.getReader();
      const pump = () => reader.read().then(({ done, value }) => {
        if (done) return res.end();
        res.write(value);
        pump();
      });
      pump();
    } else {
      res.end();
    }

  } catch (err) {
    console.error('Proxy Error:', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Internal Server Error: ' + err.message);
    }
  }
};
