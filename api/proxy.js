// Vercel Functions - GitHub 代理（参考 Cloudflare Worker 思路）
export default async function handler(request) {
  try {
    // 修复：Vercel 中 request.url 只包含路径，需补全基址
    const url = new URL(request.url, `https://${request.headers.get('host') || 'localhost'}`);

    // 根路径 → 导航页
    if (url.pathname === '/' || url.pathname === '') {
      return new Response(getNavPage(), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    const pathParts = url.pathname.split('/').filter(Boolean);
    if (pathParts.length === 0) {
      return new Response('Bad Request', { status: 400 });
    }

    const firstSegment = pathParts[0];
    const allowedHosts = ['github.com', 'api.github.com', 'raw.githubusercontent.com', 'codeload.github.com', 'objects.githubusercontent.com', 'camo.githubusercontent.com', 'avatars.githubusercontent.com'];

    let targetHost;
    if (allowedHosts.includes(firstSegment)) {
      targetHost = firstSegment;
    } else {
      targetHost = 'github.com'; // 默认
    }

    // 构建上游 URL：去掉代理前缀，还原真实路径
    let upstreamPath = url.pathname;
    for (const host of allowedHosts) {
      if (upstreamPath.startsWith('/' + host)) {
        upstreamPath = upstreamPath.slice(host.length + 1) || '/';
        break;
      }
    }
    const upstreamUrl = `https://${targetHost}${upstreamPath}${url.search}`;

    // 构建新请求（核心：保留原始请求的方法和主体，手动处理重定向）
    const newReq = new Request(upstreamUrl, {
      method: request.method,
      headers: request.headers,
      // 注意：Vercel 的 request.body 是 ReadableStream，直接传递可能不稳定
      // 改为读取为 ArrayBuffer 再传入（兼容性更好）
      body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.arrayBuffer() : null,
      redirect: 'manual'
    });

    // 设置关键请求头
    newReq.headers.set('Host', targetHost);
    newReq.headers.set('Origin', `https://${targetHost}`);
    newReq.headers.set('Referer', `https://${targetHost}/`);
    newReq.headers.delete('cf-connecting-ip');
    newReq.headers.delete('x-vercel-ip-address');

    const response = await fetch(newReq);
    let responseHeaders = new Headers(response.headers);

    // 删除危险响应头
    responseHeaders.delete('content-security-policy');
    responseHeaders.delete('content-security-policy-report-only');
    responseHeaders.delete('clear-site-data');
    responseHeaders.set('access-control-allow-origin', '*');
    // 注意：access-control-allow-credentials 不能与 * 同时使用，故移除
    responseHeaders.delete('access-control-allow-credentials');

    // 处理重定向 Location
    const location = responseHeaders.get('location');
    if (location) {
      try {
        const locUrl = new URL(location);
        if (locUrl.hostname.includes('github.com') || locUrl.hostname.includes('githubusercontent.com')) {
          const newLoc = '/' + locUrl.hostname + locUrl.pathname + locUrl.search;
          responseHeaders.set('location', newLoc);
        }
      } catch {}
    }

    const contentType = responseHeaders.get('content-type') || '';

    // HTML 内容：替换绝对 URL + 注入轻量修复脚本
    if (contentType.includes('text/html')) {
      let text = await response.text();
      text = replaceText(text);

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
      text = text.replace('</head>', fixScript + '</head>');

      return new Response(text, {
        status: response.status,
        headers: responseHeaders
      });
    }

    // 非 HTML：直接流式返回（文件下载、API JSON 等）
    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders
    });

  } catch (err) {
    console.error(err);
    return new 应答('Proxy Error: ' + err.message, { status: 500 });
  }
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
