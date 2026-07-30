const { URL } = require('url');
const { Buffer } = require('buffer');

// 1. 白名单：只允许这些域名的请求通过
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

function isAllowedHost(host) {
  return ALLOWED.some(d => host === d || host.endsWith('.' + d));
}

module.exports = async (req, res) => {
  try {
    // 解析请求 URL
    const reqUrl = new URL(req.url, `http://${req.headers.host}`);

    // 2. 根路径处理：返回导航页
    if (reqUrl.pathname === '/' || reqUrl.pathname === '') {
      return sendNav(res);
    }

    // 3. 提取目标域名和路径
    // 支持两种格式：
    // A) /github.com/user/repo  -> host=github.com, path=/user/repo
    // B) /api.github.com/repos/... -> host=api.github.com, path=/repos/...
    const pathParts = reqUrl.pathname.split('/').filter(Boolean);
    if (pathParts.length === 0) {
      return sendNav(res);
    }

    const potentialHost = pathParts[0];
    let targetHost, targetPath;

    if (isAllowedHost(potentialHost)) {
      targetHost = potentialHost;
      targetPath = '/' + pathParts.slice(1).join('/');
    } else {
      // 如果没有明确的主机前缀，默认当作 github.com 处理
      // 例如 /owner/repo 当作 https://github.com/owner/repo
      targetHost = 'github.com';
      targetPath = reqUrl.pathname;
    }

    // 4. 严格校验
    if (!isAllowedHost(targetHost)) {
      res.statusCode = 403;
      return res.end('Forbidden: ' + targetHost + ' not in whitelist');
    }

    // 5. 构建上游 URL
    const upstreamUrl = `https://${targetHost}${targetPath}${reqUrl.search}`;
    
    // 6. 准备请求头（关键：欺骗 GitHub 以为请求来自真实浏览器）
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      const low = k.toLowerCase();
      if (['host', 'cf-connecting-ip', 'x-vercel-id', 'connection', 'content-length'].includes(low)) continue;
      headers.set(k, v);
    }
    headers.set('Host', targetHost);
    headers.set('Origin', `https://${targetHost}`);
    headers.set('Referer', `https://${targetHost}/`);
    // GitHub 对 UA 有要求，必须像浏览器
    headers.set('User-Agent', req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');

    // 7. 发起请求
    const fetchOpts = {
      method: req.method,
      headers,
      redirect: 'manual' // 手动处理重定向
    };
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      const buf = await req.arrayBuffer();
      fetchOpts.body = Buffer.from(buf);
    }

    const upRes = await fetch(upstreamUrl, fetchOpts);

    // 8. 处理重定向 (301/302/303/307/308)
    if ([301, 302, 303, 307, 308].includes(upRes.status)) {
      const loc = upRes.headers.get('location');
      if (loc) {
        try {
          const locUrl = new URL(loc, upstreamUrl);
          if (isAllowedHost(locUrl.hostname)) {
            // 把 Location 改写为我们的代理路径
            const newLoc = '/' + locUrl.hostname + locUrl.pathname + locUrl.search;
            res.statusCode = upRes.status;
            res.setHeader('Location', newLoc);
            return res.end();
          }
        } catch {}
      }
      // 不在白名单的重定向，直接放行
      res.statusCode = upRes.status;
      res.setHeader('Location', loc);
      return res.end();
    }

    // 9. 收集响应头
    const respHeaders = {};
    upRes.headers.forEach((val, key) => {
      const low = key.toLowerCase();
      if (['content-encoding', 'transfer-encoding', 'content-security-policy',
           'content-security-policy-report-only', 'cross-origin-resource-policy'].includes(low)) return;
      respHeaders[key] = val;
    });
    // 删除 CSP（防止阻止我们的注入脚本）
    delete respHeaders['content-security-policy'];
    delete respHeaders['content-security-policy-report-only'];
    respHeaders['Access-Control-Allow-Origin'] = '*';

    // 10. 处理 HTML：注入修复脚本 + 替换所有 github.com 链接
    const ct = (respHeaders['Content-Type'] || '').toLowerCase();
    
    if (ct.includes('text/html')) {
      let html = await upRes.text();

      // 关键修复：把所有 https://github.com 替换成 /github.com
      // 这样所有链接都会走我们的代理
      html = html.replace(/https:\/\/github\.com/g, '/github.com');
      html = html.replace(/https:\/\/api\.github\.com/g, '/api.github.com');
      html = html.replace(/https:\/\/raw\.githubusercontent\.com/g, '/raw.githubusercontent.com');
      html = html.replace(/https:\/\/codeload\.github\.com/g, '/codeload.github.com');

      // 注入一个极简的修复脚本（只修复 fetch 的 Host）
      const injectScript = `
        <script>
          // 修复 fetch 请求，让 api.github.com 的请求走代理
          var origFetch = window.fetch;
          window.fetch = function(input, init) {
            if (typeof input === 'string' && input.indexOf('api.github.com') !== -1) {
              input = '/' + input;
            } else if (typeof input === 'string' && input.indexOf('github.com') !== -1 && input.indexOf('https') === 0) {
              input = '/' + input.replace('https://', '');
            }
            return origFetch.call(this, input, init);
          };
          // 修复 XMLHttpRequest
          var origOpen = XMLHttpRequest.prototype.open;
          XMLHttpRequest.prototype.open = function(method, url) {
            if (typeof url === 'string' && url.indexOf('api.github.com') !== -1) {
              arguments[1] = '/' + url;
            }
            return origOpen.apply(this, arguments);
          };
        </script>
      `;

      html = html.replace('</head>', injectScript + '</head>');

      res.statusCode = upRes.status;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end(html);
    }

    // 11. 非 HTML（JS/CSS/图片/文件）：直接透传
    res.statusCode = upRes.status;
    Object.keys(respHeaders).forEach(k => res.setHeader(k, respHeaders[k]));

    if (upRes.body) {
      const buf = await upRes.arrayBuffer();
      res.end(Buffer.from(buf));
    } else {
      res.end();
    }

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
