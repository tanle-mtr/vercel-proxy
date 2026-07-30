// api/proxy.js - Vercel GitHub 代理 + 右下角下载按钮
const ALLOWED_PREFIXES = [
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
  return ALLOWED_PREFIXES.some(d => host === d || host.endsWith('.' + d));
}

function getNavPage() {
  return `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>GitHub 代理</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,sans-serif;background:#0d1117;color:#c9d1d9;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.container{max-width:860px;width:100%;text-align:center}
h1{color:#fff;font-size:2.4rem;margin-bottom:.5rem}
h1 span{color:#58a6ff}
.sub{color:#8b949e;margin-bottom:2rem;font-size:1rem}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin-bottom:2rem;text-align:left}
.card{background:#161b22;border:1px solid #30363d;border-radius:10px;padding:18px}
.card h3{color:#58a6ff;margin-bottom:6px;font-size:1rem}
.card p{color:#8b949e;font-size:.84rem;line-height:1.5}
.card code{background:#0d1117;padding:2px 6px;border-radius:4px;color:#79c0ff;font-size:.80rem;display:inline-block;margin-top:4px}
.warn{margin-top:1.5rem;padding:14px 18px;background:#1c2128;border:1px solid #f0883e;border-radius:8px;text-align:left}
.warn h3{color:#f0883e;margin-bottom:6px;font-size:.95rem}
.warn p,.warn li{color:#8b949e;font-size:.83rem;line-height:1.6}
.warn ul{list-style:none;padding:0}
.warn li::before{content:"✓ ";color:#3fb950}
.footer{margin-top:2rem;font-size:.78rem;color:#484f58}
</style></head>
<body><div class="container">
<h1><span>⬇️</span> GitHub 下载代理</h1>
<p class="sub">基于 Vercel Functions 的高速下载加速，专注做好文件下载</p>
<div class="grid">
  <div class="card"><h3>📦 仓库主页</h3><p>直接访问 GitHub 仓库（页面由 github.com 渲染）</p><code>/github.com/owner/repo</code></div>
  <div class="card"><h3>⬇️ Release 下载</h3><p>高速下载 Release 附件</p><code>/github.com/owner/repo/releases</code></div>
  <div class="card"><h3>📄 Raw 文件</h3><p>单文件直链下载</p><code>/raw.githubusercontent.com/owner/repo/branch/file</code></div>
  <div class="card"><h3>📦 Archive 下载</h3><p>下载整个仓库 zip/tar</p><code>/github.com/owner/repo/archive/main.zip</code></div>
</div>
<div class="warn">
  <h3>💡 使用建议</h3>
  <ul>
    <li>网页浏览请直接使用 <a href="https://github.com" style="color:#58a6ff">github.com</a>（体验最完整）</li>
    <li>本代理最适合：Release 下载、Archive 打包下载、Raw 文件直链、aria2c 多线程加速</li>
    <li>aria2c 命令：<code style="color:#79c0ff">aria2c -x 16 -s 16 -c "https://你的域名/github.com/owner/repo/archive/main.zip"</code></li>
    <li>如需完美网页反代，推荐使用 Cloudflare Workers（边缘层改写，无需 JS 劫持）</li>
  </ul>
</div>
<p class="footer">Vercel Hobby · 100 万请求/月 · 100GB 带宽 · 仅限个人使用</p>
</div></body></html>`;
}

function replaceText(text) {
  if (!text) return text;
  return text
    .replace(/https:\/\/github\.com/g, '/github.com')
    .replace(/https:\/\/api\.github\.com/g, '/api.github.com')
    .replace(/https:\/\/raw\.githubusercontent\.com/g, '/raw.githubusercontent.com')
    .replace(/https:\/\/codeload\.github\.com/g, '/codeload.github.com')
    .replace(/https:\/\/objects\.githubusercontent\.com/g, '/objects.githubusercontent.com')
    .replace(/https:\/\/avatars\.githubusercontent\.com/g, '/avatars.githubusercontent.com')
    .replace(/https:\/\/camo\.githubusercontent\.com/g, '/camo.githubusercontent.com');
}

// 提取 owner/repo 和分支
function extractRepoInfo(path) {
  const match = path.match(/^\/([^\/]+)\/([^\/]+)(\/.*)?$/);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

function extractBranch(path) {
  const match = path.match(/\/tree\/([^\/]+)/);
  return match ? match[1] : 'main';
}

// 注入右下角下载按钮
function injectDownloadBtn(html, reqHost, upstreamPath) {
  const info = extractRepoInfo(upstreamPath);
  if (!info) return html;
  const branch = extractBranch(upstreamPath);
  const downloadUrl = `/${info.owner}/${info.repo}/archive/refs/heads/${branch}.zip`;

  const btnStyle = `
    position:fixed !important;
    bottom:20px !important;
    right:20px !important;
    z-index:99999 !important;
    background:#28a745 !important;
    color:#fff !important;
    padding:12px 20px !important;
    border-radius:6px !important;
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif !important;
    font-size:14px !important;
    font-weight:bold !important;
    text-decoration:none !important;
    box-shadow:0 4px 12px rgba(0,0,0,0.3) !important;
    border:none !important;
    cursor:pointer !important;
    display:flex !important;
    align-items:center !important;
    gap:8px !important;
  `;

  const btnHtml = `<a href="${downloadUrl}" style="${btnStyle}" target="_blank">⬇️ 下载源码 (${branch}.zip)</a>`;
  return html.replace('</body>', btnHtml + '</body>');
}

module.exports = async (req, res) => {
  try {
    const rawPath = req.url || '/';

    // 根路径 → 导航页
    if (rawPath === '/' || rawPath === '') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(getNavPage());
    }

    // 分离路径和查询
    const qIdx = rawPath.indexOf('?');
    const pathOnly = qIdx >= 0 ? rawPath.substring(0, qIdx) : rawPath;
    const queryStr = qIdx >= 0 ? rawPath.substring(qIdx) : '';

    // 匹配白名单前缀
    const prefixes = [
      '/github.com',
      '/api.github.com',
      '/raw.githubusercontent.com',
      '/codeload.github.com',
      '/objects.githubusercontent.com',
      '/camo.githubusercontent.com',
      '/avatars.githubusercontent.com'
    ];

    let matched = null;
    for (let i = 0; i < prefixes.length; i++) {
      const p = prefixes[i];
      if (pathOnly === p || pathOnly.startsWith(p + '/')) {
        matched = p;
        break;
      }
    }

    if (!matched) {
      // 非代理路径 → 导航页
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(getNavPage());
    }

    const targetHost = matched.substring(1); // 去掉开头的 /
    let remainingPath = pathOnly.substring(matched.length);
    if (remainingPath === '') remainingPath = '/';

    const upstreamUrl = 'https://' + targetHost + remainingPath + queryStr;

    // 构建请求头
    const headers = {};
    for (const [key, value] of Object.entries(req.headers)) {
      const low = key.toLowerCase();
      if (['host', 'cf-connecting-ip', 'x-vercel-id', 'connection', 'content-length'].includes(low)) continue;
      headers[key] = value;
    }
    headers['Host'] = targetHost;
    headers['Origin'] = 'https://' + targetHost;
    headers['Referer'] = 'https://' + targetHost + '/';
    if (!headers['User-Agent']) {
      headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
    }

    // 发起上游请求
    const fetchOpts = {
      method: req.method,
      headers,
      redirect: 'manual'
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const bodyBuf = await new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', c => chunks.push(c));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
      });
      fetchOpts.body = bodyBuf;
    }

    const upstreamRes = await fetch(upstreamUrl, fetchOpts);
    const status = upstreamRes.status;

    // 处理重定向
    if ([301, 302, 303, 307, 308].includes(status)) {
      const loc = upstreamRes.headers.get('location');
      if (loc) {
        try {
          const locUrl = new URL(loc);
          if (isAllowedHost(locUrl.hostname)) {
            const newLoc = '/' + locUrl.hostname + locUrl.pathname + locUrl.search;
            res.writeHead(status, { 'Location': newLoc });
            return res.end();
          }
        } catch {}
      }
      res.writeHead(status, { 'Location': loc || '' });
      return res.end();
    }

    // 收集响应头
    const respHeaders = {};
    upstreamRes.headers.forEach((val, key) => {
      const low = key.toLowerCase();
      if (['content-encoding', 'transfer-encoding', 'content-security-policy',
           'content-security-policy-report-only', 'clear-site-data'].includes(low)) return;
      respHeaders[key] = val;
    });
    respHeaders['Access-Control-Allow-Origin'] = '*';
    delete respHeaders['access-control-allow-credentials'];

    const contentType = (respHeaders['Content-Type'] || '').toLowerCase();

    // HTML 处理
    if (contentType.includes('text/html')) {
      let html = await upstreamRes.text();
      html = replaceText(html);
      // 注入下载按钮
      html = injectDownloadBtn(html, req.headers.host, remainingPath);

      // 注入极简劫持脚本（可选，不影响下载按钮）
      const fixScript = `<script>
        (function(){
          var m={'https://github.com':'/github.com','https://api.github.com':'/api.github.com','https://raw.githubusercontent.com':'/raw.githubusercontent.com','https://codeload.github.com':'/codeload.github.com'};
          function p(u){for(var k in m){if(u.indexOf(k)===0)return m[k]+u.substring(k.length);}return u;}
          var _f=window.fetch;window.fetch=function(i,o){if(typeof i==='string')i=p(i);else if(i instanceof Request)i=new Request(p(i.url),i);return _f.call(this,i,o);};
          var _o=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u){arguments[1]=p(u);return _o.apply(this,arguments);};
        })();
      </script>`;
      html = html.replace('</head>', fixScript + '</head>');

      res.writeHead(status, { ...respHeaders, 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(html);
    }

    // 非 HTML 流式传输
    res.writeHead(status, respHeaders);
    if (upstreamRes.body) {
      const reader = upstreamRes.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
    }
    res.end();

  } catch (err) {
    console.error('Proxy Error:', err.message);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Internal Server Error: ' + err.message);
    }
  }
};
