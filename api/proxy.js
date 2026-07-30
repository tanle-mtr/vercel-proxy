// api/proxy.js - 导航页 + 反代（智能降级）
const { URL } = require('url');

// 允许代理的主机
const ALLOWED = ['github.com', 'api.github.com', 'raw.githubusercontent.com', 'codeload.github.com'];

function isAllowed(host) {
  return ALLOWED.some(h => host === h || host.endsWith('.' + h));
}

// 导航页 HTML
function homePage() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>GitHub 下载助手 + 反代</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#0d1117;color:#c9d1d9;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
    .c{max-width:640px;width:100%;text-align:center}
    h1{color:#fff;font-size:2.2rem;margin-bottom:.5rem}
    h1 span{color:#58a6ff}
    .s{color:#8b949e;margin-bottom:1.5rem;font-size:.95rem}
    .box{display:flex;gap:8px;margin-bottom:1.5rem}
    .box input{flex:1;padding:12px 14px;border:1px solid #30363d;border-radius:8px;background:#161b22;color:#c9d1d9;font-size:1rem;outline:0}
    .box input:focus{border-color:#58a6ff}
    .box button{padding:12px 20px;border:0;border-radius:8px;background:#238636;color:#fff;font-size:1rem;font-weight:600;cursor:pointer}
    .box button:hover{background:#2ea043}
    .links{display:none;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:1.5rem}
    .links a{display:block;padding:16px;background:#161b22;border:1px solid #30363d;border-radius:10px;color:#58a6ff;text-decoration:none;font-size:.9rem;transition:border-color .2s}
    .links a:hover{border-color:#58a6ff}
    .links a b{display:block;color:#fff;margin-bottom:4px;font-size:.95rem}
    .tip{text-align:left;padding:14px 16px;background:#161b22;border:1px solid #f0883e;border-radius:8px;margin-bottom:1rem}
    .tip h3{color:#f0883e;font-size:.9rem;margin-bottom:6px}
    .tip p,.tip li{color:#8b949e;font-size:.82rem;line-height:1.6}
    .tip ul{list-style:none;padding:0}
    .tip code{background:#0d1117;padding:2px 6px;border-radius:3px;color:#79c0ff;font-size:.78rem}
    .f{margin-top:1.5rem;font-size:.78rem;color:#484f58}
  </style>
</head>
<body>
<div class="c">
  <h1><span>⬇️</span> GitHub 下载助手 + 反代</h1>
  <p class="s">输入仓库名，一键下载或反代浏览</p>
  <div class="box">
    <input id="i" placeholder="owner/repo（如 tanle-mtr/vercel-proxy）" />
    <button onclick="generate()">生成</button>
  </div>
  <div class="links" id="links">
    <a id="dlLink" target="_blank"><b>⬇️ 下载源码 (zip)</b><span id="dlSpan"></span></a>
    <a id="proxyLink" target="_blank"><b>🔄 反代浏览</b><span id="proxySpan"></span></a>
  </div>
  <div class="tip">
    <h3>💡 说明</h3>
    <ul>
      <li>输入 <code>owner/repo</code> 后点击“生成”</li>
      <li>“下载源码”直接下载 zip（直连 GitHub）</li>
      <li>“反代浏览”通过本代理访问仓库页面（若代理失败会自动降级为 iframe）</li>
      <li>aria2c：<code>aria2c -x 16 -s 16 -c "下载链接"</code></li>
    </ul>
  </div>
  <p class="f">Vercel Hobby · 智能降级，永不 500</p>
</div>
<script>
function generate() {
  var v = document.getElementById('i').value.trim();
  if (!v) return;
  v = v.replace(/^https?:\/\//, '').replace(/^github\.com\//, '').replace(/^\/+/, '');
  var parts = v.split('/');
  if (parts.length < 2) { alert('格式错误'); return; }
  var owner = parts[0], repo = parts[1];
  var base = location.origin;
  var dl = 'https://github.com/' + owner + '/' + repo + '/archive/refs/heads/main.zip';
  var proxy = base + '/github.com/' + owner + '/' + repo;
  document.getElementById('dlLink').href = dl;
  document.getElementById('dlSpan').textContent = dl;
  document.getElementById('proxyLink').href = proxy;
  document.getElementById('proxySpan').textContent = proxy;
  document.getElementById('links').style.display = 'grid';
}
document.getElementById('i').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') generate();
});
</script>
</body>
</html>`;
}

// 降级页面：iframe 包装（浏览器直连 GitHub）
function fallbackPage(owner, repo, branch) {
  const ghUrl = `https://github.com/${owner}/${repo}${branch !== 'main' ? `/tree/${branch}` : ''}`;
  const zipUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/${branch}.zip`;
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${owner}/${repo} (降级模式)</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,sans-serif;background:#0d1117;color:#c9d1d9;height:100vh;display:flex;flex-direction:column;overflow:hidden}
    .bar{position:fixed;top:0;left:0;right:0;height:44px;background:#161b22;border-bottom:1px solid #30363d;display:flex;align-items:center;padding:0 12px;z-index:9999}
    .bar a{color:#58a6ff;text-decoration:none;font-size:13px;font-weight:600}
    .bar .spacer{flex:1}
    .bar .btn{background:#238636;color:#fff;padding:6px 14px;border-radius:6px;text-decoration:none;font-size:12px;font-weight:600;margin-left:8px}
    .iframe-wrap{flex:1;margin-top:44px}
    iframe{width:100%;height:100%;border:none;background:#fff}
    .notice{position:fixed;bottom:10px;left:50%;transform:translateX(-50%);background:#f0883e;color:#fff;padding:6px 14px;border-radius:6px;font-size:12px;z-index:9999}
  </style>
</head>
<body>
  <div class="bar">
    <a href="/">← Home</a>
    <span class="spacer"></span>
    <span style="color:#8b949e;font-size:12px">${owner}/${repo} @ ${branch}</span>
    <a class="btn" href="${zipUrl}" target="_blank">⬇️ Download</a>
  </div>
  <div class="iframe-wrap">
    <iframe src="${ghUrl}" allowfullscreen></iframe>
  </div>
  <div class="notice">代理请求失败，已降级为 iframe 直连</div>
</body>
</html>`;
}

// 提取 owner/repo/branch
function parseRepo(path) {
  const parts = path.split('/').filter(Boolean);
  if (parts.length < 3 || parts[0].toLowerCase() !== 'github.com') return null;
  const owner = parts[1];
  const repo = parts[2];
  let branch = 'main';
  const treeIdx = parts.indexOf('tree');
  if (treeIdx !== -1 && treeIdx + 1 < parts.length) {
    branch = parts[treeIdx + 1];
  }
  return { owner, repo, branch };
}

module.exports = async (req, res) => {
  try {
    const rawPath = req.url || '/';

    // 导航页
    if (rawPath === '/' || rawPath === '') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(homePage());
    }

    // 非 github.com 路径 -> 导航页
    const parsed = parseRepo(rawPath);
    if (!parsed) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(homePage());
    }

    const { owner, repo, branch } = parsed;

    // 尝试 fetch 代理
    const upstreamPath = rawPath.replace(/^\/github\.com/, '') || '/';
    const upstreamUrl = `https://github.com${upstreamPath}`;

    try {
      const upstreamRes = await fetch(upstreamUrl, {
        method: req.method,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        },
        redirect: 'follow',
        timeout: 10000
      });

      const status = upstreamRes.status;
      const contentType = upstreamRes.headers.get('content-type') || '';

      if (!contentType.includes('text/html')) {
        const body = await upstreamRes.buffer();
        res.writeHead(status, { 'Content-Type': contentType, 'Access-Control-Allow-Origin': '*' });
        return res.end(body);
      }

      let html = await upstreamRes.text();

      // 替换链接
      html = html.replace(/https:\/\/github\.com/g, '/github.com');
      html = html.replace(/https:\/\/api\.github\.com/g, '/api.github.com');
      html = html.replace(/https:\/\/raw\.githubusercontent\.com/g, '/raw.githubusercontent.com');
      html = html.replace(/https:\/\/codeload\.github\.com/g, '/codeload.github.com');

      // 注入下载按钮（纯 HTML）
      const zipUrl = `/github.com/${owner}/${repo}/archive/refs/heads/${branch}.zip`;
      const btn = `<div style="position:fixed;bottom:20px;right:20px;z-index:2147483647;background:#238636;color:#fff;padding:12px 20px;border-radius:8px;font-family:sans-serif;font-size:14px;font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,0.3);display:flex;align-items:center;gap:8px"><a href="${zipUrl}" target="_blank" style="color:#fff;text-decoration:none">⬇️ Download Source (${branch}.zip)</a></div>`;
      html = html.replace('</body>', btn + '</body>');

      res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
      return res.end(html);

    } catch (fetchErr) {
      console.error('Fetch failed, falling back to iframe:', fetchErr.message);
      // 降级为 iframe 包装页
      const fallbackHtml = fallbackPage(owner, repo, branch);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(fallbackHtml);
    }

  } catch (err) {
    console.error('Handler error:', err.message);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal Server Error');
  }
};
