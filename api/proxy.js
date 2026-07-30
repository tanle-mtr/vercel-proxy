
// api/proxy.js - 完整修复版，支持 GitHub API 请求
const allowedHosts = [
  'github.com',
  'raw.githubusercontent.com',
  'camo.githubusercontent.com',
  'objects.githubusercontent.com',
  'api.github.com' // 新增：允许 API 域名
];

export default async function handler(req, res) {
  try {
    const url = new URL(req.url);
    let path = url.pathname.slice(1); // 去掉开头的 '/'

    // 根路径或 index.html 显示导航页
    if (path === '' || path === 'index.html') {
      return sendNavPage(res);
    }

    // 判断是否为 GitHub API 请求
    const isGitHubApi = path.startsWith('api.github.com/');

    // 提取目标主机名
    let targetHost = path.split('/')[0];
    
    // 如果是 API 请求，强制使用 api.github.com
    if (isGitHubApi) {
      targetHost = 'api.github.com';
      path = path.substring('api.github.com/'.length);
    }

    // 验证主机是否在白名单中
    if (!allowedHosts.includes(targetHost)) {
      return res.status(403).send('Host not allowed: ' + targetHost);
    }

    // 构建上游 URL
    const upstreamUrl = `https://${targetHost}/${path}${url.search}`;

    // 复制请求头
    const headers = new Headers(req.headers);
    
    // 修复 Referer 和 Origin，防止 GitHub 校验失败
    if (isGitHubApi) {
      headers.set('referer', `https://github.com/${path.split('/')[0]}/${path.split('/')[1]}`);
      headers.set('origin', 'https://github.com');
    } else {
      headers.set('referer', `https://${targetHost}/`);
    }
    
    // 删除 host 头，让 node-fetch 自动处理
    headers.delete('host');

    // 发起请求
    const fetchOptions = {
      method: req.method,
      headers: headers,
      redirect: 'manual'
    };

    // 处理 POST 请求体
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const body = await req.arrayBuffer();
      fetchOptions.body = body;
      fetchOptions.headers.set('content-length', body.byteLength.toString());
    }

    const upstreamRes = await fetch(upstreamUrl, fetchOptions);
    const status = upstreamRes.status;
    
    // 处理重定向 (301/302)
    if ([301, 302, 303, 307, 308].includes(status)) {
      const location = upstreamRes.headers.get('location');
      if (location) {
        try {
          const locUrl = new URL(location, upstreamUrl);
          // 如果跳转到 GitHub 域内，重写为代理路径
          if (allowedHosts.some(host => locUrl.hostname.includes(host))) {
            const newPath = '/' + locUrl.hostname + locUrl.pathname + locUrl.search;
            res.writeHead(status, {
              ...Object.fromEntries(upstreamRes.headers),
              'location': newPath
            });
            return res.end();
          }
        } catch (e) {}
      }
    }

    // 处理 HTML 内容（注入修复脚本）
    const contentType = upstreamRes.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      let html = await upstreamRes.text();
      
      // 注入修复脚本，拦截 API 请求
      const fixScript = `
        <script>
          (function() {
            // 修复 GitHub API 请求的 Referer 和 Origin
            const githubApiPaths = ['/repos/', '/users/', '/orgs/'];
            const isGitHubApi = githubApiPaths.some(path => window.location.pathname.includes(path));
            
            if (isGitHubApi) {
              // 拦截 fetch 请求
              const originalFetch = window.fetch;
              window.fetch = function(url, options) {
                if (typeof url === 'string' && url.includes('api.github.com')) {
                  try {
                    const apiUrl = new URL(url, window.location.origin);
                    // 确保 Referer 和 Origin 正确
                    if (options && options.headers) {
                      options.headers['Referer'] = 'https://github.com/';
                      options.headers['Origin'] = 'https://github.com';
                    }
                  } catch(e) {}
                }
                return originalFetch.apply(this, arguments);
              };
              
              // 修复页面内的链接点击
              document.addEventListener('click', function(e) {
                const target = e.target.closest('a');
                if (target && target.href) {
                  try {
                    const linkUrl = new URL(target.href);
                    if (linkUrl.hostname === 'github.com' || linkUrl.hostname === 'api.github.com') {
                      e.preventDefault();
                      
                      if (linkUrl.hostname === 'api.github.com') {
                        window.location.href = target.href.replace('https://api.github.com', '/api.github.com');
                      } else {
                        const newPath = '/' + linkUrl.hostname + linkUrl.pathname + linkUrl.search;
                        window.location.href = newPath;
                      }
                    }
                  } catch(e) {}
                }
              });
            }
          })();
        </script>
      `;
      html = html.replace('</body>', fixScript + '</body>');
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(status).send(html);
    }

    // 其他文件直接透传
    res.setHeader('Content-Type', contentType);
    upstreamRes.headers.forEach((value, key) => {
      if (!['content-encoding', 'transfer-encoding'].includes(key)) {
        res.setHeader(key, value);
      }
    });
    res.status(status);
    
    if (upstreamRes.body) {
      const reader = upstreamRes.body.getReader();
      const pump = () => reader.read().then(({ done, value }) => {
        if (done) return res.end();
        res.write(value);
        pump();
      });
      return pump();
    }
    res.end();

  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.status(500).send('Server Error: ' + err.message);
    }
  }
}

// 导航页
function sendNavPage(res) {
  const html = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8">
<title>GitHub 代理</title>
<style>
body{font-family:sans-serif;background:#f1f5f9;padding:2rem;text-align:center}
.card{display:inline-block;margin:1rem;padding:2rem;background:white;border-radius:12px;text-decoration:none;color:#333;box-shadow:0 2px 8px rgba(0,0,0,0.1)}
.card:hover{box-shadow:0 4px 16px rgba(0,0,0,0.15)}
.icon{font-size:2.5rem;display:block;margin-bottom:0.5rem}
</style></head>
<body>
<h1>🚀 GitHub 代理</h1>
<a class="card" href="/github.com/"><span class="icon">🐙</span><h3>GitHub</h3></a>
<a class="card" href="/raw.githubusercontent.com/"><span class="icon">⬇️</span><h3>Raw</h3></a>
</body></html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}
