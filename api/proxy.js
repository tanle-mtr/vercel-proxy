const url = require('url');

module.exports = async (req, res) => {
  try {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // 根路径 -> 导航页
    if (pathname === '/' || pathname === '') {
      return sendHomePage(res);
    }

    // 提取路径段
    const segments = pathname.split('/').filter(Boolean);

    // 必须至少包含 github.com/owner/repo
    if (segments.length < 3 || segments[0].toLowerCase() !== 'github.com') {
      return sendHomePage(res);
    }

    const owner = segments[1];
    const repo = segments[2];

    // 检测分支
    let branch = 'main';
    const treeIndex = segments.indexOf('tree');
    if (treeIndex !== -1 && treeIndex + 1 < segments.length) {
      branch = segments[treeIndex + 1];
    }

    // 构造真实 GitHub 链接和下载链接
    const ghUrl = `https://github.com/${owner}/${repo}${branch !== 'main' ? `/tree/${branch}` : ''}`;
    const zipUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/${branch}.zip`;

    // 返回包装页
    const html = buildWrapperPage(owner, repo, branch, ghUrl, zipUrl);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);

  } catch (err) {
    console.error('Handler error:', err.message);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
};

function sendHomePage(res) {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>GitHub Proxy</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#0d1117;color:#c9d1d9;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
    .c{max-width:600px;width:100%;text-align:center}
    h1{color:#fff;font-size:2rem;margin-bottom:1rem}
    .box{display:flex;gap:8px;margin-bottom:1rem}
    .box input{flex:1;padding:12px;border:1px solid #30363d;border-radius:8px;background:#161b22;color:#fff;font-size:1rem;outline:0}
    .box button{padding:12px 20px;border:0;border-radius:8px;background:#238636;color:#fff;font-size:1rem;cursor:pointer;font-weight:600}
    .tip{margin-top:1rem;color:#8b949e;font-size:.85rem;line-height:1.6}
    code{background:#161b22;padding:2px 6px;border-radius:3px;color:#79c0ff}
  </style>
</head>
<body>
  <div class="c">
    <h1>&#11015; GitHub Proxy</h1>
    <div class="box">
      <input id="i" placeholder="owner/repo (e.g. tanle-mtr/vercel-proxy)" />
      <button onclick="go()">Open</button>
    </div>
    <p class="tip">
      Enter a repo name and click Open.<br>
      You will see the page with a download button.
    </p>
  </div>
  <script>
    function go() {
      var v = document.getElementById('i').value.trim();
      if (!v) return;
      v = v.replace(/^https?:\\/\\//, '').replace(/^github.com\\//, '');
      var parts = v.split('/');
      if (parts.length < 2) return alert('Need owner/repo');
      var url = location.origin + '/github.com/' + parts[0] + '/' + parts[1];
      location.href = url;
    }
    document.getElementById('i').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') go();
    });
  </script>
</body>
</html>`;
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

function buildWrapperPage(owner, repo, branch, ghUrl, zipUrl) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${owner}/${repo}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#0d1117;color:#c9d1d9;height:100vh;display:flex;flex-direction:column;overflow:hidden}
    .bar{position:fixed;top:0;left:0;right:0;height:48px;background:#161b22;border-bottom:1px solid #30363d;display:flex;align-items:center;padding:0 16px;z-index:9999;box-shadow:0 2px 8px rgba(0,0,0,0.3)}
    .bar a{color:#58a6ff;text-decoration:none;font-size:13px;font-weight:600}
    .bar .sep{color:#484f58;margin:0 10px}
    .bar .spacer{flex:1}
    .bar .btn{background:#238636;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;display:inline-flex;align-items:center;gap:6px;margin-left:8px}
    .bar .btn:hover{background:#2ea043}
    .bar .gh-link{background:#21262d;color:#c9d1d9;padding:6px 12px;border-radius:6px;font-size:12px;text-decoration:none}
    .iframe-wrap{flex:1;margin-top:48px}
    iframe{width:100%;height:100%;border:none;background:#fff}
    .dl-btn{position:fixed;bottom:20px;right:20px;background:#238636;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;box-shadow:0 4px 12px rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;gap:8px}
    .dl-btn:hover{background:#2ea043}
  </style>
</head>
<body>
  <div class="bar">
    <a href="/">&#8592; Home</a>
    <span class="sep">|</span>
    <span style="font-weight:600;color:#fff">${owner}/${repo}</span>
    <span class="sep">|</span>
    <span style="color:#8b949e;font-size:12px">&#127793; ${branch}</span>
    <span class="spacer"></span>
    <a class="gh-link" href="${ghUrl}" target="_blank">View on GitHub</a>
    <a class="btn" href="${zipUrl}" target="_blank">&#11015; Download (${branch}.zip)</a>
  </div>
  <div class="iframe-wrap">
    <iframe src="${ghUrl}" allowfullscreen></iframe>
  </div>
  <a class="dl-btn" href="${zipUrl}" target="_blank">&#11015; Download Source (${branch}.zip)</a>
</body>
</html>`;
}
