const { Buffer } = require('buffer');

// 安全白名单
const allowedHosts = [
  'github.com',
  'raw.githubusercontent.com',
  'api.github.com',
  'gist.github.com'
];

// 获取目标主机名（从 /github.com/xxx 中提取 github.com）
function getTargetHost(path) {
  const match = path.match(/^\/([^\/]+)/);
  if (match) {
    const host = match[1];
    // 验证是否在白名单中
    if (allowedHosts.includes(host)) {
      return host;
    }
  }
  return null;
}

// 检查是否为根路径
function isRootPath(path) {
  return !path || path === '/' || path === '';
}

module.exports = async (req, res) => {
  try {
    // 1. 根路径直接返回导航页
    if (isRootPath(req.url)) {
      return sendNavPage(res);
    }

    // 2. 提取目标主机
    const targetHost = getTargetHost(req.url);
    
    // 3. 如果不在白名单，拒绝服务
    if (!targetHost) {
      res.statusCode = 403;
      return res.end('Forbidden: Domain not allowed');
    }

    // 4. 构建上游 URL
    const upstreamUrl = 'https://' + targetHost + req.url.replace('/' + targetHost, '');

    // 5. 发起请求
    const upstreamRes = await fetch(upstreamUrl, {
      method: req.method,
      headers: req.headers,
      redirect: 'follow'
    });

    // 6. 处理 HTML 页面（注入修复脚本）
    const contentType = upstreamRes.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      let html = await upstreamRes.text();
      
      // 注入 GitHub API 修复脚本
      const fixScript = `
        <script>
          // 修复 GitHub API 请求的 Referer
          (function() {
            const originalFetch = window.fetch;
            window.fetch = function(url, options) {
              if (typeof url === 'string' && url.includes('api.github.com')) {
                if (options && options.headers) {
                  options.headers['Referer'] = 'https://github.com/';
                  options.headers['Origin'] = 'https://github.com';
                }
              }
              return originalFetch.apply(this, arguments);
            };
          })();
        </script>
      `;
      html = html.replace('</body>', fixScript + '</body>');
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.statusCode = upstreamRes.status;
      return res.end(html);
    }

    // 7. 透传其他文件（JS, CSS, 图片等）
    res.statusCode = upstreamRes.status;
    upstreamRes.headers.forEach((value, key) => {
      // 过滤掉会导致问题的响应头
      if (!['content-encoding', 'transfer-encoding'].includes(key)) {
        res.setHeader(key, value);
      }
    });

    // 8. 流式传输
    if (upstreamRes.body) {
      const reader = upstreamRes.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    }
    res.end();

  } catch (err) {
    console.error('Proxy Error:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end('Server Error: ' + err.message);
    }
  }
};

// 生成导航页 HTML
function sendNavPage(res) {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>GitHub 代理</title>
    <style>
        body { font-family: sans-serif; background: #f1f5f9; padding: 2rem; text-align: center; }
        .card { display: inline-block; margin: 1rem; padding: 2rem; background: white; border-radius: 12px; text-decoration: none; color: #333; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.15); }
        .icon { font-size: 2.5rem; display: block; margin-bottom: 0.5rem; }
    </style>
</head>
<body>
    <h1>🚀 GitHub 代理</h1>
    <a class="card" href="/github.com/"><span class="icon">🐙</span><h3>GitHub</h3></a>
    <a class="card" href="/raw.githubusercontent.com/"><span class="icon">⬇️</span><h3>Raw</h3></a>
    <a class="card" href="/api.github.com/"><span class="icon">⚙️</span><h3>API</h3></a>
</body>
</html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.statusCode = 200;
  res.end(html);
}
