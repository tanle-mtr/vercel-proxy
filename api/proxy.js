// Vercel Functions 使用 Web Standard API
// 参考 Cloudflare Worker 的反代思路：直接改写 url.hostname，保留原始请求
export const config = { runtime: 'nodejs' };

const UPSTREAM = 'github.com';
const UPSTREAM_API = 'api.github.com';

// 文本替换字典：把 github.com 绝对 URL 替换成我们的代理路径
function replaceText(text, customDomain) {
  // 替换 html/css/js 中的绝对 URL 为代理相对路径
  text = text.replace(/https:\/\/github\.com/g, '/github.com');
  text = text.replace(/https:\/\/api\.github\.com/g, '/api.github.com');
  text = text.replace(/https:\/\/raw\.githubusercontent\.com/g, '/raw.githubusercontent.com');
  text = text.replace(/https:\/\/codeload\.github\.com/g, '/codeload.github.com');
  text = text.replace(/https:\/\/objects\.githubusercontent\.com/g, '/objects.githubusercontent.com');
  text = text.replace(/https:\/\/avatars\.githubusercontent\.com/g, '/avatars.githubusercontent.com');
  text = text.replace(/https:\/\/camo\.githubusercontent\.com/g, '/camo.githubusercontent.com');
  return text;
}

export default async function handler(request) {
  const url = new URL(request.url);
  
  // 根路径 → 导航页
  if (url.pathname === '/' || url.pathname === '') {
    return new Response(getNavPage(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  // 解析路径：/github.com/xxx → hostname=github.com, path=/xxx
  // 或者 /api.github.com/xxx → hostname=api.github.com
  const pathParts = url.pathname.split('/').filter(Boolean);
  if (pathParts.length === 0) {
    return new Response('Bad Request', { status: 400 });
  }

  const firstSegment = pathParts[0];
  
  // 判断是否是我们代理的 github 域名
  let targetHost;
  if (firstSegment === 'github.com' || firstSegment === 'api.github.com' || 
      firstSegment === 'raw.githubusercontent.com' || firstSegment === 'codeload.github.com' ||
      firstSegment === 'objects.githubusercontent.com') {
    targetHost = firstSegment;
  } else {
    // 默认当作 github.com 处理（如 /owner/repo/...）
    targetHost = 'github.com';
  }

  // 构建上游 URL（这是关键：参考 CF Worker 的做法）
  const upstreamUrl = new URL(url.toString());
  // 把路径中的 /github.com 前缀去掉，还原成真实路径
  if (firstSegment === 'github.com') {
    upstreamUrl.pathname = url.pathname.replace(/^\/github\.com/, '') || '/';
  } else if (firstSegment === 'api.github.com') {
    upstreamUrl.pathname = url.pathname.replace(/^\/api\.github\.com/, '') || '/';
  } else if (firstSegment === 'raw.githubusercontent.com') {
    upstreamUrl.pathname = url.pathname.replace(/^\/raw\.githubusercontent\.com/, '') || '/';
  } else if (firstSegment === 'codeload.github.com') {
    upstreamUrl.pathname = url.pathname.replace(/^\/codeload\.github\.com/, '') || '/';
  } else if (firstSegment === 'objects.githubusercontent.com') {
    upstreamUrl.pathname = url.pathname.replace(/^\/objects\.githubusercontent\.com/, '') || '/';
  }
  upstreamUrl.hostname = targetHost;
  upstreamUrl.protocol = 'https:';

  // 构建新请求（参考 CF Worker：new Request(url, request)）
  const newRequest = new Request(upstreamUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    redirect: 'manual'  // 手动处理重定向，防止跳出代理
  });
  
  // 设置关键请求头（CF Worker 的核心）
  newRequest.headers.set('Host', targetHost);
  newRequest.headers.set('Origin', `https://${targetHost}`);
  newRequest.headers.set('Referer', `https://${targetHost}/`);
  // 删除可能干扰的头
  newRequest.headers.delete('cf-connecting-ip');
  newRequest.headers.delete('x-vercel-ip-address');

  try {
    const response = await fetch(newRequest);
    let responseHeaders = new Headers(response.headers);

    // 删除危险的响应头
    responseHeaders.delete('content-security-policy');
    responseHeaders.delete('content-security-policy-report-only');
    responseHeaders.delete('clear-site-data');
    responseHeaders.set('access-control-allow-origin', '*');
    responseHeaders.set('access-control-allow-credentials', 'true');

    // 处理 3xx 重定向：把 Location 改写回代理路径（CF Worker 的核心逻辑）
    const location = responseHeaders.get('location');
    if (location) {
      try {
        const locUrl = new URL(location);
        // 如果跳转到 github 域内，改写成代理路径
        if (locUrl.hostname.includes('github.com') || locUrl.hostname.includes('githubusercontent.com')) {
          const newLoc = '/' + locUrl.hostname + locUrl.pathname + locUrl.search;
          responseHeaders.set('location', newLoc);
        }
      } catch {}
    }

    // 处理 HTML 内容：替换文本中的绝对 URL
    const contentType = responseHeaders.get('content-type') || '';
    if (contentType.includes('text/html')) {
      let text = await response.text();
      text = replaceText(text, url.host);
      
      // 注入轻量级修复脚本（作为最后一道防线）
      const fixScript = `
        <script>
          (function() {
            var proxyMap = {
              'https://github.com': '/github.com',
              'https://api.github.com': '/api.github.com',
              'https://raw.githubusercontent.com': '/raw.githubusercontent.com',
              'https://codeload.github.com': '/codeload.github.com'
            };
            function proxyUrl(u) {
              for (var k in proxyMap) {
                if (u.indexOf(k) === 0) return proxyMap[k] + u.substring(k.length);
              }
              return u;
            }
            // 劫持 fetch
            var _fetch = window.fetch;
            window.fetch = function(input, init) {
              if (typeof input === 'string') input = proxyUrl(input);
              else if (input instanceof Request) input = new Request(proxyUrl(input.url), input);
              return _fetch.call(this, input, init);
            };
            // 劫持 XHR
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

    // 非 HTML：直接返回（文件下载、API JSON 等）
    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders
    });

  } catch (err) {
    return new 应答('Proxy Error: ' + err.message, { status: 500 });
  }
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
<p class="sub">基于 Vercel Functions 的 GitHub 反代（参考 Cloudflare Worker 思路）</p>
<a class="card" href="/github.com/"><h3>📦 仓库浏览</h3><p>/github.com/owner/repo</p></a>
<a class="card" href="/api.github.com/"><h3>🔌 API 访问</h3><p>/api.github.com/repos/...</p></a>
<a class="card" href="/raw.githubusercontent.com/"><h3>📄 Raw 文件</h3><p>/raw.githubusercontent.com/...</p></a>
<div class="tips">
<strong>💡 使用方式：</strong><br>
• 仓库：<code>/github.com/vercel/next.js</code><br>
• Release 下载：<code>/github.com/owner/repo/releases/download/v1.0/file.zip</code><br>
• Archive：<code>/github.com/owner/repo/archive/refs/heads/main.zip</code><br>
• Raw：<code>/raw.githubusercontent.com/owner/repo/branch/file</code><br>
• aria2c：<code>aria2c -x 16 -s 16 -c "https://你的域名/github.com/owner/repo/archive/main.zip"</code><br><br>
<strong>⚠️ 说明：</strong>GitHub 网页是重度 SPA，文件树加载依赖 <code>api.github.com</code> 的动态请求。
本代理已参考 CF Worker 思路做底层改写，大部分场景可用。如遇复杂页面加载不全，建议直接使用 CF Worker 版本（Vercel 函数的流式处理能力有限）。
</div>
</div></body></html>`;
}
