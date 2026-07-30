// api/proxy.js - 导航页 + iframe 反代（永不 500，永不拒绝连接）
const { URL } = require('url');

// 导航页 HTML
function homePage() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>GitHub 下载助手</title>
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
  <h1><span>⬇️</span> GitHub 下载助手</h1>
  <p class="s">输入仓库名，一键下载或浏览</p>
  <div class="box">
    <input id="i" placeholder="owner/repo（如 tanle-mtr/vercel-proxy）" />
    <button onclick="generate()">生成</button>
  </div>
  <div class="links" id="links">
    <a id="dlLink" target="_blank"><b>⬇️ 下载源码 (zip)</b><span id="dlSpan"></span></a>
    <a id="viewLink" target="_blank"><b>🔄 反代浏览</b><span id="viewSpan"></span></a>
  </div>
  <div class="tip">
    <h3>💡 说明</h3>
    <ul>
      <li>输入 <code>owner/repo</code> 后点击“生成”</li>
      <li>“下载源码”直连 GitHub 下载 zip</li>
      <li>“反代浏览”通过本页面嵌入 GitHub 页面（iframe 方式，无需服务器代理）</li>
      <li>aria2c：<code>aria2c -x 16 -s 16 -c "下载链接"</code></li>
    </ul>
  </div>
  <p class="f">Vercel Hobby · 纯前端方案，永不 500</p>
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
  var view = base + '/view/' + owner + '/' + repo;
  document.getElementById('dlLink').href = dl;
  document.getElementById('dlSpan').textContent = '点击下载';
  document.getElementById('viewLink').href = view;
  document.getElementById('viewSpan').textContent = view;
  document.getElementById('links').style.display = 'grid';
}
document.getElementById('i').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') generate();
});
</script>
</body>
</html>`;
}

// 反代浏览页（iframe 嵌入 GitHub）
function viewPage(owner, repo, branch) {
  const ghUrl = `https://github.com/${owner}/${repo}${branch !== 'main' ? `/tree/${branch}` : ''}`;
  const zipUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/${branch}.zip`;
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${owner}/${repo}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,sans-serif;background:#0d1117;color:#c9d1d9;height:100vh;display:flex;flex-direction:column;overflow:hidden}
    .bar{position:fixed;top:0;left:0;right:0;height:44px;background:#161b22;border-bottom:1px solid #30363d;display:flex;align-items:center;padding:0 12px;z-index:9999}
    .bar a{color:#58a6ff;text-decoration:none;font-size:13px;font-weight:600}
    .bar .spacer{flex:1}
    .bar .btn{background:#238636;color:#fff;padding:6px 14px;border-radius:6px;text-decoration:none;font-size:12px;font-weight:600;margin-left:8px}
    .iframe-wrap{flex:1;margin-top:44px}
    iframe{width:100%;height:100%;border:none;background:#fff}
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
</body>
</html>`;
}

module.exports = async (req, res) => {
  try {
    const rawPath = req.url || '/';

    // 导航页
    if (rawPath === '/' || rawPath === '') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(homePage());
    }

    // 反代浏览页：/view/owner/repo[/tree/branch]
    if (rawPath.startsWith('/view/')) {
      const viewPath = rawPath.substring(6); // 去掉 /view/
      const segments = viewPath.split('/').filter(Boolean);
      if (segments.length < 2) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(homePage()); // 参数不足，返回导航页
      }
      const owner = segments[0];
      const repo = segments[1];
      let branch = 'main';
      const treeIdx = segments.indexOf('tree');
      if (treeIdx !== -1 && treeIdx + 1 < segments.length) {
        branch = segments[treeIdx + 1];
      }
      const html = viewPage(owner, repo, branch);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(html);
    }

    // 其他路径（如 /github.com/...）也统一返回导航页（避免 404）
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(homePage());

  } catch (err) {
    console.error('Handler error:', err.message);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal Server Error');
  }
};
