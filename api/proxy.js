// api/proxy.js - 通用反代 + SPA 路径改写
export const config = {
  maxDuration: 300,
};

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const target = url.searchParams.get('to');

    // 没有 to 参数 → 导航页
    if (!target) {
      return sendNavPage(res, url.origin);
    }

    // 解码目标 URL
    let targetURL;
    try {
      targetURL = new URL(decodeURIComponent(target));
    } catch {
      // 兼容直接传 to=https://xxx 的情况
      try {
        targetURL = new URL(target);
      } catch {
        return res.status(400).send('Invalid target URL: ' + target);
      }
    }

    const targetHost = targetURL.hostname;

    // 构造转发请求
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      const lower = key.toLowerCase();
      if (['host', 'cf-connecting-ip', 'x-vercel-id', 'connection', 'content-length'].includes(lower)) continue;
      headers.set(key, value);
    }
    headers.set('Host', targetHost);
    headers.set('Origin', targetURL.origin);
    headers.set('User-Agent', req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    const upstreamResp = await fetch(targetURL.toString(), {
      method: req.method,
      headers: headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : req,
      redirect: 'manual',
    });

    // 处理 3xx 重定向：把 Location 改写成继续走代理
    if ([301, 302, 303, 307, 308].includes(upstreamResp.status)) {
      const location = upstreamResp.headers.get('Location');
      if (location) {
        try {
          const locURL = new URL(location);
          const newTo = encodeURIComponent(locURL.toString());
          res.setHeader('Location', `/api/proxy?to=${newTo}`);
          return res.status(upstreamResp.status).end();
        } catch {
          res.setHeader('Location', location);
          return res.status(upstreamResp.status).end();
        }
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
    delete respHeaders['content-security-policy'];
    delete respHeaders['content-security-policy-report-only'];
    respHeaders['Access-Control-Allow-Origin'] = '*';

    // Set-Cookie 重写
    const setCookie = upstreamResp.headers.get('set-cookie');
    if (setCookie) {
      respHeaders['Set-Cookie'] = setCookie.replace(/Domain=[^;]+;/gi, '');
    }

    // 判断内容类型，决定是否做 HTML/JS 改写
    const contentType = (respHeaders['Content-Type'] || respHeaders['content-type'] || '').toLowerCase();
    const isText = contentType.includes('text/html') || contentType.includes('application/javascript') ||
                   contentType.includes('text/javascript') || contentType.includes('application/json');

    if (isText) {
      // 读取完整响应体
      const text = await upstreamResp.text();

      // 把 huggingface.co 及其子域名的所有绝对 URL 改写成代理形式
      const rewritten = rewriteHFContent(text, url.origin);

      // 设置正确的 Content-Type（去掉 charset 避免乱码问题）
      if (contentType.includes('text/html')) {
        respHeaders['Content-Type'] = 'text/html; charset=utf-8';
      }

      res.writeHead(upstreamResp.status, respHeaders);
      res.end(rewritten);
    } else {
      // 二进制文件（模型、图片等）直接流式传输
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

  } catch (err) {
    console.error('PROXY_ERROR:', err);
    if (!res.headersSent) {
      res.status(500).send('Internal Server Error: ' + err.message);
    }
  }
}

// 核心：把 HTML/JS 里的 HF 绝对地址改写成代理地址
function rewriteHFContent(text, origin) {
  // 匹配 https://huggingface.co 和 https://*.hf.co（包括 cdn-lfs.hf.co, cas-server.xethub.hf.co 等）
  const hfUrlRegex = /https:\/\/([a-z0-9-]+\.)*hf\.co(?=\/|$)/gi;

  return text.replace(hfUrlRegex, (match) => {
    // 编码整个 URL 作为 to 参数
    return `${origin}/api/proxy?to=${encodeURIComponent(match)}`;
  });
}

// 导航页
function sendNavPage(res, origin) {
  const sites = [
    { name: 'Hugging Face', url: 'https://huggingface.co/', icon: '🤗', color: '#ff9d00' },
    { name: 'GitHub', url: 'https://github.com/', icon: '🐙', color: '#8b949e' },
    { name: 'Internxt Drive', url: 'https://drive.internxt.com/', icon: '☁️', color: '#6366f1' },
    { name: 'Vercel', url: 'https://vercel.com/', icon: '▲', color: '#000000' },
    { name: 'Cloudflare', url: 'https://dash.cloudflare.com/', icon: '☁️', color: '#f38020' },
  ];

  const cards = sites.map(s => {
    const to = encodeURIComponent(s.url);
    return `<a class="card" href="/api/proxy?to=${to}" style="--accent:${s.color}">
      <div class="icon">${s.icon}</div>
      <h3>${s.name}</h3>
      <span>${s.url}</span>
    </a>`;
  }).join('');

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
.card{background:#1e293b;border:1px solid #334155;border-radius:16px;padding:28px 20px;text-decoration:none;color:#e2e8f0;transition:.25s;border-top:3px solid var(--accent)}
.card:hover{transform:translateY(-6px);border-color:var(--accent);box-shadow:0 12px 40px rgba(0,0,0,.4)}
.icon{font-size:2.8rem;margin-bottom:12px}
.card h3{font-size:1.2rem;margin-bottom:6px;color:#fff}
.card span{font-size:.85rem;color:#94a3b8}
.footer{margin-top:3rem;font-size:.8rem;color:#475569}
.example{margin-top:1rem;font-size:.8rem;color:#475569;word-break:break-all}
code{background:#0f172a;padding:2px 6px;border-radius:4px;color:#818cf8}
</style></head>
<body><div class="container">
<h1>🧭 反代导航</h1>
<p class="sub">Vercel Hobby · 100万请求/月 · 100GB 带宽</p>
<div class="grid">${cards}</div>
<p class="example">下载示例：<br>
<code>aria2c -x 16 -s 16 -c "${origin}/api/proxy?to=https://huggingface.co/bert-base-uncased/resolve/main/pytorch_model.bin"</code></p>
<p class="footer">点击卡片进入对应网站 · 仅限个人使用</p>
</div></body></html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}
