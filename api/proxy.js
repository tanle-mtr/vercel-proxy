// api/proxy.js - 最终版，全面拦截 GitHub API 请求
const ALLOWED = [
  'github.com',
  'api.github.com',
  'raw.githubusercontent.com',
  'codeload.github.com',
  'objects.githubusercontent.com',
  'camo.githubusercontent.com',
  'avatars.githubusercontent.com',
  'gist.github.com'
];

function isAllowed(host) {
  return ALLOWED.some(d => host === d || host.endsWith('.' + d));
}

module.exports = async (req, res) => {
  try {
    const reqUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathParts = reqUrl.pathname.split('/').filter(Boolean);

    // 根路径 → 导航页
    if (pathParts.length === 0) {
      return sendNav(res);
    }

    const potentialHost = pathParts[0];
    let targetHost, targetPath;

    if (isAllowed(potentialHost)) {
      targetHost = potentialHost;
      targetPath = '/' + pathParts.slice(1).join('/');
    } else {
      targetHost = 'github.com';
      targetPath = reqUrl.pathname;
    }

    if (!isAllowed(targetHost)) {
      res.statusCode = 403;
      return res.end('Forbidden');
    }

    const upstreamUrl = `https://${targetHost}${targetPath}${reqUrl.search}`;

    // 构造请求头
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      const low = k.toLowerCase();
      if (['host', 'cf-connecting-ip', 'x-vercel-id', 'connection', 'content-length'].includes(low)) continue;
      headers.set(k, v);
    }
    headers.set('Host', targetHost);
    headers.set('Origin', `https://${targetHost}`);
    headers.set('Referer', `https://${targetHost}/`);
    headers.set('User-Agent', req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    // 发起请求，手动处理重定向
    const fetchOpts = {
      method: req.method,
      headers,
      redirect: 'manual'
    };
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      const buf = await req.arrayBuffer();
      fetchOpts.body = Buffer.from(buf);
    }

    const upRes = await fetch(upstreamUrl, fetchOpts);
    const status = upRes.status;

    // 处理重定向（301/302/303/307/308）
    if ([301, 302, 303, 307, 308].includes(status)) {
      const loc = upRes.headers.get('location');
      if (loc) {
        try {
          const locUrl = new URL(loc, upstreamUrl);
          if (isAllowed(locUrl.hostname)) {
            const newLoc = '/' + locUrl.hostname + locUrl.pathname + locUrl.search;
            res.statusCode = status;
            res.setHeader('Location', newLoc);
            return res.end();
          }
        } catch {}
      }
      res.statusCode = status;
      res.setHeader('Location', loc);
      return res.end();
    }

    // 收集响应头
    const respHeaders = {};
    upRes.headers.forEach((val, key) => {
      const low = key.toLowerCase();
      if (['content-encoding', 'transfer-encoding', 'content-security-policy',
           'content-security-policy-report-only', 'cross-origin-resource-policy'].includes(low)) return;
      respHeaders[key] = val;
    });
    delete respHeaders['content-security-policy'];
    delete respHeaders['content-security-policy-report-only'];
    respHeaders['Access-Control-Allow-Origin'] = '*';

    const ct = (respHeaders['Content-Type'] || '').toLowerCase();

    if (ct.includes('text/html')) {
      let html = await upRes.text();

      // 1. 替换所有绝对 URL 为代理路径
      html = html.replace(/https:\/\/github\.com/g, '/github.com');
      html = html.replace(/https:\/\/api\.github\.com/g, '/api.github.com');
      html = html.replace(/https:\/\/raw\.githubusercontent\.com/g, '/raw.githubusercontent.com');
      html = html.replace(/https:\/\/codeload\.github\.com/g, '/codeload.github.com');

      // 2. 注入全面拦截脚本（包含 MutationObserver 和相对路径修复）
      const injectScript = `
        <script>
          (function() {
            // 辅助函数：将 api.github.com 的绝对路径转为代理路径
            function proxyUrl(url) {
              if (typeof url !== 'string') return url;
              // 如果已经是 /api.github.com 开头，保持不变
              if (url.startsWith('/api.github.com')) return url;
              // 如果包含 api.github.com，替换
              if (url.includes('api.github.com')) {
                return url.replace(/https?:\\/\\/api\\.github\\.com/g, '/api.github.com');
              }
              // 如果包含 github.com 且是绝对路径，替换
              if (url.includes('github.com') && (url.startsWith('http://') || url.startsWith('https://'))) {
                return url.replace(/https?:\\/\\/([^\\/]+)/, '/$1');
              }
              return url;
            }

            // 劫持 fetch
            var origFetch = window.fetch;
            window.fetch = function(input, init) {
              if (typeof input === 'string') {
                input = proxyUrl(input);
              } else if (input instanceof Request) {
                // 如果是 Request 对象，修改其 url 属性（可能需要克隆）
                var newInput = new Request(proxyUrl(input.url), input);
                return origFetch.call(this, newInput, init);
              }
              return origFetch.call(this, input, init);
            };

            // 劫持 XMLHttpRequest
            var origOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(method, url) {
              arguments[1] = proxyUrl(url);
              return origOpen.apply(this, arguments);
            };

            // 使用 MutationObserver 监控动态添加的资源（如 script, img, link）
            var observer = new MutationObserver(function(mutations) {
              mutations.forEach(function(mutation) {
                mutation.addedNodes.forEach(function(node) {
                  if (node.nodeType === 1) { // Element
                    // 处理 <script src="...">
                    if (node.tagName === 'SCRIPT' && node.src) {
                      node.src = proxyUrl(node.src);
                    }
                    // 处理 <img src="...">
                    if (node.tagName === 'IMG' && node.src) {
                      node.src = proxyUrl(node.src);
                    }
                    // 处理 <link href="...">
                    if (node.tagName === 'LINK' && node.href) {
                      node.href = proxyUrl(node.href);
                    }
                    // 处理 <iframe src="...">
                    if (node.tagName === 'IFRAME' && node.src) {
                      node.src = proxyUrl(node.src);
                    }
                  }
                });
              });
            });
            observer.observe(document.documentElement, {
              childList: true,
              subtree: true
            });
          })();
        </script>
      `;
      html = html.replace('</head>', injectScript + '</head>');

      res.statusCode = status;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end(html);
    }

    // 非 HTML（JS/CSS/图片/文件）
    res.statusCode = status;
    Object.keys(respHeaders).forEach(k => res.setHeader(k, respHeaders[k]));
    const buf = await upRes.arrayBuffer();
    res.end(Buffer.from(buf));

  } catch (err) {
    console.error('FATAL:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end('Server Error: ' + err.message);
    }
  }
};

function sendNav(res) {
  const html = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><title>GitHub 代理</title>
<style>
body{font-family:-apple-system,sans-serif;background:#f6f8fa;padding:2rem;text-align:center;color:#24292e}
.card{display:inline-block;margin:1rem;padding:2rem;background:white;border:1px solid #d0d7de;border-radius:12px;text-decoration:none;color:#24292e;transition:all .2s}
.card:hover{border-color:#0969da;box-shadow:0 4px 12px rgba(9,105,218,.15);transform:translateY(-2px)}
.icon{font-size:2.5rem;display:block;margin-bottom:.5rem}
h1{margin-bottom:1rem}
</style></head>
<body>
<h1>🐙 GitHub 代理</h1>
<a class="card" href="/github.com/"><span class="icon">📦</span><h3>GitHub.com</h3></a>
<a class="card" href="/api.github.com/"><span class="icon">🔌</span><h3>GitHub API</h3></a>
<a class="card" href="/raw.githubusercontent.com/"><span class="icon">📄</span><h3>Raw Files</h3></a>
<p style="margin-top:2rem;color:#656d76;font-size:.9rem">支持任意 GitHub 仓库浏览和文件下载</p>
</body></html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.statusCode = 200;
  res.end(html);
}
