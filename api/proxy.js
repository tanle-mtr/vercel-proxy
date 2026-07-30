// api/proxy.js - 通用全站反代（无白名单）
export const config = {
  maxDuration: 300,
};

// 辅助函数：清洗路径，剥离可能错误拼接的主机名前缀
function cleanPath(originalPath) {
  // 尝试匹配 /hostname/path 格式
  const match = originalPath.match(/^\/([^\/]+)\/(.*)$/);
  if (match) {
    const potentialHost = match[1];
    // 检查是否像域名（包含 . 且不是文件扩展名）
    if (potentialHost.includes('.') && !potentialHost.endsWith('.js') && !potentialHost.endsWith('.css') && !potentialHost.endsWith('.ico') && !potentialHost.endsWith('.png') && !potentialHost.endsWith('.jpg') && !potentialHost.endsWith('.svg') && !potentialHost.endsWith('.woff') && !potentialHost.endsWith('.woff2') && !potentialHost.endsWith('.json') && !potentialHost.endsWith('.webp') && !potentialHost.endsWith('.gif') && !potentialHost.endsWith('.map')) {
      return '/' + match[2];
    }
  }
  return originalPath;
}

// 从路径中提取目标主机名
function extractTargetHost(pathname) {
  const clean = cleanPath(pathname);
  const match = clean.match(/^\/([^\/]+)\//);
  if (match) {
    return match[1];
  }
  return null;
}

// 获取完整的上游 URL
function buildUpstreamUrl(pathname, search, hostOverride) {
  const clean = cleanPath(pathname);
  if (hostOverride) {
    return `https://${hostOverride}${clean}${search}`;
  }
  // 尝试从路径中提取
  const match = pathname.match(/^\/([^\/]+)\/(.*)$/);
  if (match && match[1].includes('.')) {
    return `https://${match[1]}/${match[2]}${search}`;
  }
  return null;
}

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;
    const search = url.search;

    // 1. 根路径 → 导航页
    if (pathname === '/' || pathname === '') {
      return sendNavPage(res, url.origin);
    }

    // 2. 检查是否是 /https:/hostname/path 格式
    if (pathname.startsWith('/https:/') || pathname.startsWith('/http:/')) {
      const fixed = pathname.slice(1).replace('https:/', 'https://').replace('http:/', 'http://');
      try {
        const targetURL = new URL(fixed);
        return proxyRequest(targetURL, req, res);
      } catch (e) {
        return res.status(400).send(`Invalid URL: ${fixed}`);
      }
    }

    // 3. 尝试从路径中提取主机名
    const targetHost = extractTargetHost(pathname);
    if (!targetHost) {
      return res.status(400).send(`
        <h1>400 Bad Request</h1>
        <p>Usage:</p>
        <ul>
          <li><code>/hostname/path</code> - e.g. <code>/github.com/</code></li>
          <li><code>/https:/hostname/path</code> - e.g. <code>/https:/example.com/page</code></li>
        </ul>
        <p>Current path: <code>${pathname}</code></p>
      `);
    }

    const upstreamUrl = `https://${targetHost}${cleanPath(pathname)}${search}`;
    let targetURL;
    try {
      targetURL = new URL(upstreamUrl);
    } catch (e) {
      return res.status(400).send(`Invalid URL: ${upstreamUrl}`);
    }

    return proxyRequest(targetURL, req, res);

  } catch (err) {
    console.error('PROXY_ERROR:', err);
    if (!res.headersSent) {
      res.status(500).send('Internal Server Error: ' + err.message);
    }
  }
}

async function proxyRequest(targetURL, req, res) {
  const host = targetURL.hostname;

  // 构造请求头
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    const lower = key.toLowerCase();
    if (['host', 'cf-connecting-ip', 'x-vercel-id', 'connection', 'content-length'].includes(lower)) continue;
    headers.set(key, value);
  }
  headers.set('Host', host);
  headers.set('Origin', targetURL.origin);
  headers.set('Referer', targetURL.origin + '/');

  // 确保有 User-Agent
  if (!headers.get('User-Agent')) {
    headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
  }

  // 发起请求
  const upstreamResp = await fetch(targetURL.toString(), {
    method: req.method,
    headers: headers,
    body: (req.method !== 'GET' && req.method !== 'HEAD') ? req : undefined,
    redirect: 'manual',
  });

  // 处理 3xx 重定向
  if ([301, 302, 303, 307, 308].includes(upstreamResp.status)) {
    const location = upstreamResp.headers.get('Location');
    if (location) {
      try {
        const locURL = new URL(location);
        // 重写 Location 为继续走我们的代理
        const newLocation = `/${locURL.hostname}${locURL.pathname}${locURL.search}`;
        res.setHeader('Location', newLocation);
        return res.status(upstreamResp.status).end();
      } catch {}
      // 如果 Location 是相对路径
      try {
        const absoluteLoc = new URL(location, targetURL.origin);
        const newLocation = `/${absoluteLoc.hostname}${absoluteLoc.pathname}${absoluteLoc.search}`;
        res.setHeader('Location', newLocation);
        return res.status(upstreamResp.status).end();
      } catch {}
    }
    return res.status(upstreamResp.status).end();
  }

  // 构造响应头
  const respHeaders = {};
  upstreamResp.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (['content-encoding', 'transfer-encoding', 'content-security-policy',
         'content-security-policy-report-only', 'cross-origin-resource-policy'].includes(lower)) return;
    respHeaders[key] = value;
  });

  // 强制正确的 MIME 类型
  const pathForExt = targetURL.pathname;
  const ext = pathForExt.split('.').pop().toLowerCase();
  const mimeMap = {
    'css': 'text/css',
    'js': 'application/javascript',
    'mjs': 'application/javascript',
    'json': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf',
    'zip': 'application/zip',
    'tar': 'application/x-tar',
    'gz': 'application/gzip',
    'rar': 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    'bin': 'application/octet-stream',
    'pt': 'application/octet-stream',
    'safetensors': 'application/octet-stream',
    'pdf': 'application/pdf',
    'mp4': 'video/mp4',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'webm': 'video/webm',
    'xml': 'application/xml',
    'csv': 'text/csv',
    'txt': 'text/plain',
    'html': 'text/html',
    'htm': 'text/html',
  };
  if (mimeMap[ext] && !respHeaders['Content-Type']) {
    respHeaders['Content-Type'] = mimeMap[ext];
  }

  // 删除 CSP，添加 CORS
  delete respHeaders['content-security-policy'];
  delete respHeaders['content-security-policy-report-only'];
  respHeaders['Access-Control-Allow-Origin'] = '*';
  respHeaders['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
  respHeaders['Access-Control-Allow-Headers'] = '*';

  // Set-Cookie 重写（去掉 Domain 属性）
  const setCookie = upstreamResp.headers.get('set-cookie');
  if (setCookie) {
    respHeaders['Set-Cookie'] = setCookie.replace(/Domain=[^;]+;/gi, '');
  }

  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // 流式传输
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
}

// 导航页
function sendNavPage(res, origin) {
  const examples = [
    { icon: '🐙', title: 'GitHub', url: '/github.com/', desc: 'github.com' },
    { icon: '🤗', title: 'Hugging Face', url: '/huggingface.co/', desc: 'huggingface.co' },
    { icon: '☁️', title: 'Internxt', url: '/drive.internxt.com/', desc: 'drive.internxt.com' },
    { icon: '▲', title: 'Vercel', url: '/vercel.com/', desc: 'vercel.com' },
    { icon: '⛅', title: 'Cloudflare', url: '/dash.cloudflare.com/', desc: 'dash.cloudflare.com' },
    { icon: '🌐', title: 'Example', url: '/example.com/', desc: 'example.com' },
  ];

  const cardHtml = examples.map(c => `
    <a class="card" href="${c.url}" title="${c.desc}">
      <div class="icon">${c.icon}</div>
      <h3>${c.title}</h3>
      <span>${c.desc}</span>
    </a>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>🧭 通用反代导航</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:linear-gradient(135deg,#0f172a 0%,#1e293b 50%,#0f172a 100%);min-height:100vh;display:flex;align-items:center;justify-content:center;color:#e2e8f0;padding:20px}
.container{max-width:960px;width:100%;text-align:center}
h1{font-size:2.4rem;margin-bottom:.5rem;background:linear-gradient(90deg,#8b5cf6,#3b82f6,#06b6d4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.sub{color:#94a3b8;margin-bottom:1rem;font-size:1rem}
.badge{display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:20px;padding:4px 14px;font-size:.8rem;color:#818cf8;margin-bottom:2.5rem}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:18px}
.card{background:#1e293b/80;border:1px solid #334155;border-radius:16px;padding:28px 20px;text-decoration:none;color:#e2e8f0;transition:all .25s ease;backdrop-filter:blur(10px)}
.card:hover{transform:translateY(-6px);border-color:#6366f1;box-shadow:0 12px 40px rgba(99,102,241,.2);background:#1e293b}
.icon{font-size:2.8rem;margin-bottom:12px}
.card h3{font-size:1.15rem;margin-bottom:6px;color:#fff}
.card span{font-size:.8rem;color:#94a3b8}
.section{margin-top:3rem;text-align:left}
.section h2{font-size:.9rem;color:#64748b;margin-bottom:.8rem;font-weight:500;text-transform:uppercase;letter-spacing:1px}
.example{background:#0f172a;border:1px solid #334155;border-radius:10px;padding:14px 18px;font-size:.82rem;color:#818cf8;word-break:break-all;line-height:1.8;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.example code{color:#a5b4fc}
.tip{margin-top:2rem;font-size:.8rem;color:#475569}
.tip a{color:#6366f1;text-decoration:none}
.tip a:hover{text-decoration:underline}
</style></head>
<body><div class="container">
<h1>🧭 通用反代导航</h1>
<p class="sub">输入任意网站，通过 Vercel 边缘节点转发</p>
<div class="badge">🌐 无白名单 · 代理所有网站</div>
<div class="grid">${cardHtml}</div>
<div class="section">
<h2>📖 使用方式</h2>
<div class="example">
<code>/hostname/path</code> &nbsp;&nbsp;→&nbsp;&nbsp; 反代 https://hostname/path<br>
<code>/https:/example.com/page</code> &nbsp;&nbsp;→&nbsp;&nbsp; 完整 URL 格式<br>
<br>
<b>下载示例：</b><br>
<code>aria2c -x 16 -s 16 -c "${origin}/github.com/owner/repo/archive/main.zip"</code>
</div>
</div>
<p class="tip">仅限个人合法使用 · Powered by Vercel Serverless Functions</p>
</div></body></html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}
