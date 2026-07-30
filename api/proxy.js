// api/proxy.js - Vercel GitHub 代理 + 下载源码按钮（精准插入版）
const ALLOWED = [
  'github.com',
  'api.github.com',
  'raw.githubusercontent.com',
  'codeload.github.com',
  'objects.githubusercontent.com',
  'camo.githubusercontent.com',
  'avatars.githubusercontent.com'
];

function isAllowedHost(h) {
  return ALLOWED.some(d => h === d || h.endsWith('.' + d));
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
h1{color:#fff;font-size:2.4rem;margin-bottom:.5rem}
h1 span{color:#58a6ff}
.sub{color:#8b949e;margin-bottom:2rem}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-bottom:2rem;text-align:left}
.card{background:#161b22;border:1px solid #30363d;border-radius:10px;padding:18px}
.card h3{color:#58a6ff;margin-bottom:6px;font-size:1rem}
.card p{color:#8b949e;font-size:.82rem;line-height:1.5}
.card code{background:#0d1117;padding:2px 6px;border-radius:4px;color:#79c0ff;font-size:.78rem;display:inline-block;margin-top:4px}
.tips{margin-top:1.5rem;padding:14px 18px;background:#1c2128;border:1px solid #f0883e;border-radius:8px;text-align:left}
.tips h3{color:#f0883e;margin-bottom:6px;font-size:.95rem}
.tips p,.tips li{color:#8b949e;font-size:.82rem;line-height:1.6}
.tips ul{list-style:none;padding:0}
.tips li::before{content:"✓ ";color:#3fb950}
.footer{margin-top:2rem;font-size:.78rem;color:#484f58}
</style></head>
<body><div class="container">
<h1><span>⬇️</span> GitHub 下载代理</h1>
<p class="sub">基于 Vercel Functions 的高速下载加速</p>
<div class="grid">
  <div class="card"><h3>📦 仓库主页</h3><p>直接访问 GitHub 仓库</p><code>/github.com/owner/repo</code></div>
  <div class="card"><h3>⬇️ Release 下载</h3><p>高速下载 Release 附件</p><code>/github.com/owner/repo/releases</code></div>
  <div class="card"><h3>📄 Raw 文件</h3><p>单文件直链下载</p><code>/raw.githubusercontent.com/owner/repo/file</code></div>
  <div class="card"><h3>📦 Archive 下载</h3><p>下载整个仓库 zip</p><code>/github.com/owner/repo/archive/main.zip</code></div>
</div>
<div class="tips">
  <h3>💡 使用建议</h3>
  <ul>
    <li>网页浏览请直接使用 <a href="https://github.com" style="color:#58a6ff">github.com</a></li>
    <li>本代理最适合：Release 下载、Archive 打包、Raw 文件、aria2c 多线程</li>
    <li>aria2c：<code style="color:#79c0ff">aria2c -x 16 -s 16 -c "https://你的域名/github.com/owner/repo/archive/main.zip"</code></li>
  </ul>
</div>
<p class="footer">Vercel Hobby · 100 万请求/月 · 100GB 带宽</p>
</div></body></html>`;
}

function replaceText(t) {
  if (!t) return t;
  return t
    .replace(/https:\/\/github\.com/g, '/github.com')
    .replace(/https:\/\/api\.github\.com/g, '/api.github.com')
    .replace(/https:\/\/raw\.githubusercontent\.com/g, '/raw.githubusercontent.com')
    .replace(/https:\/\/codeload\.github\.com/g, '/codeload.github.com')
    .replace(/https:\/\/objects\.githubusercontent\.com/g, '/objects.githubusercontent.com')
    .replace(/https:\/\/avatars\.githubusercontent\.com/g, '/avatars.githubusercontent.com')
    .replace(/https:\/\/camo\.githubusercontent\.com/g, '/camo.githubusercontent.com');
}

// 提取 owner/repo
function getRepoInfo(path) {
  const m = path.match(/^\/([^\/]+)\/([^\/]+)(\/.*)?$/);
  if (!m) return null;
  return { owner: m[1], repo: m[2] };
}

// 提取当前分支名
function getBranch(path) {
  const m = path.match(/\/tree\/([^\/]+)/);
  return m ? m[1] : 'main';
}

// 注入下载按钮的脚本（精准插入到 GitHub 原生按钮区域）
function getInjectScript(path) {
  const repo = getRepoInfo(path);
  if (!repo) return '';
  const branch = getBranch(path);
  const zipUrl = `/${repo.owner}/${repo.repo}/archive/refs/heads/${branch}.zip`;

  return `<script>
(function(){
  function createBtn(){
    // 防止重复插入
    if(document.getElementById('proxy-dl-btn')) return;

    // 创建按钮
    var btn = document.createElement('a');
    btn.id = 'proxy-dl-btn';
    btn.href = '${zipUrl}';
    btn.target = '_blank';
    btn.rel = 'noopener';
    btn.innerHTML = '⬇️ 下载源码 (${branch}.zip)';
    btn.setAttribute('style',
      'display:inline-flex!important;align-items:center!important;gap:6px!important;' +
      'margin-left:8px!important;padding:5px 16px!important;' +
      'font-size:14px!important;font-weight:600!important;' +
      'color:#fff!important;background:#2ea043!important;' +
      'border:1px solid rgba(240,246,252,0.1)!important;' +
      'border-radius:6px!important;text-decoration:none!important;' +
      'cursor:pointer!important;vertical-align:middle!important;' +
      'line-height:20px!important;'
    );

    // 鼠标悬停效果
    btn.addEventListener('mouseenter',function(){btn.style.background='#3fb950!important';});
    btn.addEventListener('mouseleave',function(){btn.style.background='#2ea043!important';});

    // 插入策略：找到 GitHub 原生的按钮组
    // 方法1：找 "Code" 按钮的父容器
    var codeBtn = document.querySelector('a[aria-label*="Code"],button[aria-label*="Code"],a[title*="Code"]');
    if(codeBtn && codeBtn.parentNode){
      codeBtn.parentNode.appendChild(btn);
      return;
    }

    // 方法2：找文件导航区域
    var nav = document.querySelector('.file-navigation,.repository-content .d-flex');
    if(nav){
      nav.appendChild(btn);
      return;
    }

    // 方法3：找 repo 标题区域
    var repoTitle = document.querySelector('#repository-container-header,#repo-title');
    if(repoTitle){
      repoTitle.appendChild(btn);
      return;
    }

    // 方法4：兜底 - 插入到 body 开头
    document.body.insertBefore(btn, document.body.firstChild);
  }

  // 多重时机确保插入
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){
      setTimeout(createBtn, 500);
      setTimeout(createBtn, 1500);
      setTimeout(createBtn, 3000);
    });
  } else {
    setTimeout(createBtn, 100);
    setTimeout(createBtn, 1000);
    setTimeout(createBtn, 2500);
  }

  // 监听 URL 变化（GitHub 是 SPA，路由切换不会刷新页面）
  var lastUrl = location.href;
  setInterval(function(){
    if(location.href !== lastUrl){
      lastUrl = location.href;
      // URL 变了，重新插入
      setTimeout(function(){
        var old = document.getElementById('proxy-dl-btn');
        if(old) old.remove();
        createBtn();
      }, 800);
    }
  }, 1000);
})();
</script>`;
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
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(getNavPage());
    }

    const targetHost = matched.substring(1);
    let remainingPath = pathOnly.substring(matched.length);
    if (remainingPath === '') remainingPath = '/';

    const upstreamUrl = 'https://' + targetHost + remainingPath + queryStr;

    // 构建请求头
    const headers = {};
    for (const [key, value] of Object.entries(req.headers)) {
      const low = key.toLowerCase();
      if (['host','cf-connecting-ip','x-vercel-id','connection','content-length'].includes(low)) continue;
      headers[key] = value;
    }
    headers['Host'] = targetHost;
    headers['Origin'] = 'https://' + targetHost;
    headers['Referer'] = 'https://' + targetHost + '/';
    if (!headers['User-Agent']) {
      headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
    }

    // 发起请求
    const fetchOpts = { method: req.method, headers, redirect: 'manual' };

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
    if ([301,302,303,307,308].includes(status)) {
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
      if (['content-encoding','transfer-encoding','content-security-policy',
           'content-security-policy-report-only','clear-site-data'].includes(low)) return;
      respHeaders[key] = val;
    });
    respHeaders['Access-Control-Allow-Origin'] = '*';
    delete respHeaders['access-control-allow-credentials'];

    const contentType = (respHeaders['Content-Type'] || '').toLowerCase();

    // HTML 处理
    if (contentType.includes('text/html')) {
      let html = await upstreamRes.text();
      html = replaceText(html);

      // 注入下载按钮脚本
      const injectScript = getInjectScript(remainingPath);
      html = html.replace('</head>', injectScript + '</head>');

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
