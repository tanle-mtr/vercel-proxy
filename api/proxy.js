export default async function handler(request) {
  try {
    const url = new URL(request.url, `https://${request.headers.get('host') || 'localhost'}`);
    const path = url.pathname;

    // 根路径 → 导航页
    if (path === '/' || path === '') {
      return new Response(getNavPage(), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // 只处理以白名单域名开头的路径
    const allowedPrefixes = [
      '/github.com',
      '/api.github.com',
      '/raw.githubusercontent.com',
      '/codeload.github.com',
      '/objects.githubusercontent.com',
      '/camo.githubusercontent.com',
      '/avatars.githubusercontent.com'
    ];

    let matchedPrefix = null;
    for (const prefix of allowedPrefixes) {
      if (path.startsWith(prefix + '/') || path === prefix) {
        matchedPrefix = prefix;
        break;
      }
    }

    if (!matchedPrefix) {
      // 路径不符合格式，返回导航页
      return new Response(getNavPage(), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // 提取目标域名和剩余路径
    const targetHost = matchedPrefix.slice(1); // 去掉开头的 /
    let remainingPath = path.slice(matchedPrefix.length) || '/';
    // 如果 remainingPath 为空，设为 /
    if (remainingPath === '') remainingPath = '/';

    const upstreamUrl = `https://${targetHost}${remainingPath}${url.search}`;

    // 构建新请求（保留原始方法、头、body，手动处理重定向）
    const newReq = new Request(upstreamUrl, {
      method: request.method,
      headers: request.headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? null : request.body,
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

    // 非 HTML：直接流式返回
    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders
    });

  } catch (err) {
    console.error('Proxy Error:', err);
    return new 应答('Internal Server Error: ' + err.message, { status: 500 });
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
