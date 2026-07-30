// api/proxy.js
module.exports = async (req, res) => {
  // 设置响应头，告诉浏览器这是一个完整的 HTML 页面
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  
  // 提取路径（去掉开头的斜杠）
  const path = req.url.substring(1);
  
  // 默认分支
  let branch = 'main';
  // 尝试从路径中提取分支名（例如 .../repo/tree/dev -> dev）
  const treeMatch = path.match(/\/tree\/([^\/]+)/);
  if (treeMatch) {
    branch = treeMatch[1];
  }

  // 提取 Owner 和 Repo 名称 (例如 tanle-mtr/vercel-proxy)
  let owner = 'unknown';
  let repo = 'unknown';
  const repoMatch = path.match(/([^\/]+)\/([^\/]+)\/?/);
  if (repoMatch) {
    owner = repoMatch[1];
    repo = repoMatch[2];
  }

  // 构建 GitHub 原始链接和 ZIP 下载链接
  const targetUrl = `https://github.com/${owner}/${repo}`;
  const zipUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/${branch}.zip`;

  // 输出纯粹的 HTML
  res.end(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${owner}/${repo}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; background-color: #0d1117; color: #c9d1d9; height: 100vh; display: flex; flex-direction: column; }
        
        /* 顶部固定导航条 */
        .top-bar {
          position: fixed;
          top: 0; left: 0; right: 0;
          height: 50px;
          background-color: #161b22;
          border-bottom: 1px solid #30363d;
          display: flex;
          align-items: center;
          padding: 0 20px;
          z-index: 9999;
        }
        .top-bar a { color: #58a6ff; text-decoration: none; margin-right: 20px; font-weight: 600; }
        .top-bar span { color: #8b949e; font-size: 14px; }
        
        /* 真正的下载按钮 (右下角) */
        .dl-btn {
          position: fixed;
          bottom: 20px; right: 20px;
          background-color: #238636;
          color: white;
          padding: 10px 16px;
          border-radius: 6px;
          text-decoration: none;
          font-weight: 600;
          font-size: 14px;
          box-shadow: 0 0 10px rgba(0,0,0,0.5);
          z-index: 9999;
          cursor: pointer;
        }
        .dl-btn:hover { background-color: #2ea043; }

        /* 中间区域用来放 iframe */
        .iframe-container {
          flex: 1;
          margin-top: 50px; /* 避开顶部导航条 */
          margin-bottom: 60px; /* 避开可能的底部占位 */
        }
        iframe {
          width: 100%;
          height: 100%;
          border: none;
          background-color: white;
        }
      </style>
    </head>
    <body>

      <!-- 1. 我们的自定义顶部条 (绝对有按钮) -->
      <div class="top-bar">
        <a href="/">&#8592; Proxy Home</a>
        <span>|</span>
        <span style="font-weight:bold; color:white;">${owner}/${repo}</span>
        <span style="margin-left:auto; margin-right:20px; color:#8b949e;">&#127793; ${branch}</span>
        <a href="https://github.com/${owner}/${repo}" target="_blank" style="background:#21262d; padding:4px 10px; border-radius:6px; font-size:12px;">GitHub</a>
        <!-- 这里的按钮是写在 HTML 里的，绝对不会被拦截 -->
        <a href="${zipUrl}" target="_blank" class="dl-btn">&#11015; Download (${branch}.zip)</a>
      </div>

      <!-- 2. 嵌入真实的 GitHub 页面 -->
      <div class="iframe-container">
        <iframe src="${targetUrl}" allowfullscreen></iframe>
      </div>

    </body>
    </html>
  `);
};
