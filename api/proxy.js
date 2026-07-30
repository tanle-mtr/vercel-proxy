// api/proxy.js
module.exports = (req, res) => {
  try {
    // 从 URL 中提取仓库路径（如 /github.com/tanle-mtr/vercel-proxy）
    const urlPath = req.url.replace(/^\//, ''); // 移除开头的 /
    const [domain, owner, repo, ...rest] = urlPath.split('/');
    
    // 仅处理 github.com 的请求
    if (domain !== 'github.com') {
      return res.status(400).send('Only github.com is supported');
    }

    // 解析分支（默认 main，如 /tree/dev 则提取 dev）
    let branch = 'main';
    const treeIndex = rest.indexOf('tree');
    if (treeIndex !== -1 && rest[treeIndex + 1]) {
      branch = rest[treeIndex + 1];
    }

    // 构建 GitHub 页面地址和 ZIP 下载地址
    const ghPageUrl = `https://github.com/${owner}/${repo}${treeIndex !== -1 ? `/tree/${branch}` : ''}`;
    const zipUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/${branch}.zip`;

    // 生成 HTML（包含 iframe 和下载按钮）
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${owner}/${repo}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
      background: #0d1117; 
      color: #c9d1d9; 
      height: 100vh; 
      display: flex; 
      flex-direction: column; 
      overflow: hidden; 
    }
    /* 顶部导航条 */
    .top-bar { 
      position: fixed; 
      top: 0; left: 0; right: 0; 
      height: 48px; 
      background: #161b22; 
      border-bottom: 1px solid #30363d; 
      display: flex; 
      align-items: center; 
      padding: 0 16px; 
      z-index: 9999; 
      box-shadow: 0 2px 8px rgba(0,0,0,0.3); 
    }
    .top-bar a { 
      color: #58a6ff; 
      text-decoration: none; 
      font-size: 13px; 
      font-weight: 600; 
    }
    .top-bar .sep { color: #484f58; margin: 0 10px; }
    .top-bar .spacer { flex: 1; }
    .top-bar .btn { 
      background: #238636; 
      color: #fff; 
      padding: 8px 16px; 
      border-radius: 6px; 
      text-decoration: none; 
      font-size: 13px; 
      font-weight: 600; 
      display: inline-flex; 
      align-items: center; 
      gap: 6px; 
      margin-left: 8px; 
    }
    .top-bar .btn:hover { background: #2ea043; }
    .top-bar .gh-link { 
      background: #21262d; 
      color: #c9d1d9; 
      padding: 6px 12px; 
      border-radius: 6px; 
      font-size: 12px; 
      text-decoration: none; 
    }
    /* iframe 容器 */
    .iframe-wrap { 
      flex: 1; 
      margin-top: 48px; /* 避开顶部导航条 */
    }
    iframe { 
      width: 100%; 
      height: 100%; 
      border: none; 
      background: #fff; 
    }
    /* 右下角下载按钮 */
    .dl-btn { 
      position: fixed; 
      bottom: 20px; 
      right: 20px; 
      background: #238636; 
      color: #fff; 
      padding: 12px 20px; 
      border-radius: 8px; 
      text-decoration: none; 
      font-weight: 700; 
      font-size: 15px; 
      box-shadow: 0 4px 12px rgba(0,0,0,0.5); 
      z-index: 9999; 
      display: flex; 
      align-items: center; 
      gap: 8px; 
    }
    .dl-btn:hover { background: #2ea043; }
  </style>
</head>
<body>
  <!-- 顶部导航条 -->
  <div class="top-bar">
    <a href="/">← Home</a>
    <span class="sep">|</span>
    <span style="font-weight:600;color:#fff">${owner}/${repo}</span>
    <span class="sep">|</span>
    <span style="color:#8b949e;font-size:12px">🌿 ${branch}</span>
    <span class="spacer"></span>
    <a class="gh-link" href="${ghPageUrl}" target="_blank">View on GitHub</a>
    <a class="btn" href="${zipUrl}" target="_blank">⬇️ Download (${branch}.zip)</a>
  </div>

  <!-- 嵌入 GitHub 页面 -->
  <div class="iframe-wrap">
    <iframe src="${ghPageUrl}" allowfullscreen></iframe>
  </div>

  <!-- 右下角下载按钮（重复，确保可见） -->
  <a class="dl-btn" href="${zipUrl}" target="_blank">⬇️ Download Source (${branch}.zip)</a>
</body>
</html>`;

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);

  } catch (err) {
    console.error('Proxy Error:', err.message);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal Server Error: ' + err.message);
  }
};
