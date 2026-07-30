const { parse } = require('url');

// 纯导航页 HTML
function homePage() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>GitHub 下载助手</title>
  <style>
    :root { --bg: #0d1117; --input-bg: #161b22; --border: #30363d; --text: #c9d1d9; --link: #58a6ff; --btn: #238636; --btn-hover: #2ea043; --card-bg: #010409; }
    body { background: var(--bg); color: var(--text); font-family: -apple-system, sans-serif; margin: 0; min-height: 100vh; display: flex; justify-content: center; align-items: center; }
    .card { background: var(--card-bg); padding: 40px; border-radius: 12px; border: 1px solid var(--border); width: 90%; max-width: 600px; box-shadow: 0 10px 20px rgba(0,0,0,0.3); }
    h1 { margin: 0 0 10px 0; font-size: 24px; text-align: center; }
    .subtitle { text-align: center; color: #8b949e; margin-bottom: 30px; font-size: 14px; }
    .input-group { display: flex; gap: 10px; margin-bottom: 20px; }
    input { flex: 1; background: var(--input-bg); border: 1px solid var(--border); border-radius: 6px; padding: 12px 16px; color: var(--text); font-size: 16px; outline: none; }
    input:focus { border-color: var(--link); box-shadow: 0 0 0 3px rgba(56,139,253,0.3); }
    button { background: var(--btn); color: white; border: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 16px; }
    button:hover { background: var(--btn-hover); }
    .links { display: grid; gap: 15px; margin-top: 20px; }
    a { display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; background: var(--input-bg); border: 1px solid var(--border); border-radius: 6px; text-decoration: none; color: var(--text); transition: all 0.2s; }
    a:hover { background: #1f242c; border-color: var(--link); }
    a b { font-weight: 600; }
    .tip { margin-top: 30px; padding-top: 20px; border-top: 1px solid var(--border); font-size: 13px; color: #8b949e; }
    .tip code { background: rgba(110,118,129,0.4); padding: 2px 6px; border-radius: 4px; color: #c9d1d9; }
    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #484f58; }
  </style>
</head>
<body>
  <div class="card">
    <h1>⬇️ GitHub 下载助手</h1>
    <p class="subtitle">输入仓库名，一键获取下载链接和访问入口
    <div class="input-group">
      <input id="repoInput" placeholder="owner/repo (例如: tanle-mtr/vercel-proxy)" value="" />
      <button onclick="generateLinks()">生成</button>
    </div>
    <div class="links" id="linkBox" style="display:none;">
      <a id="dlLink" target="_blank"><b>⬇️ 下载源码 (.zip)</b><span id="dlUrl" style="font-size:12px;opacity:0.7"></span></a>
      <a id="visitLink" target="_blank"><b>🌐 访问开源页</b><span id="visitUrl" style="font-size:12px;opacity:0.7"></span></a>
    </div>
    <div class="tip">
      <h3>💡 提示</h3>
      <ul style="line-height:1.8;">
        <li>输入格式必须是 <code>用户名/仓库名</code></li>
        <li><b>下载源码</b>：直接下载仓库的 zip 压缩包</li>
        <li><b>访问开源页</b>：跳转到 GitHub 官方页面</li>
        <li>如果无法访问 GitHub，请检查本地网络环境或使用代理工具</li>
      </ul>
    </div>
    <div class="footer">Powered by Vercel | 纯前端导航，不存储任何数据</div>
  </div>

  <script>
    function generateLinks() {
      const val = document.getElementById('repoInput').value.trim();
      if (!val || !val.includes('/')) {
        alert('请输入正确的格式：owner/repo');
        return;
      }
      
      const parts = val.split('/');
      const owner = parts[0];
      const repo = parts[1].replace(/\.git$/, ''); // 兼容带 .git 的情况

      // 构造 URL
      const zipUrl = \`/\${owner}/\${repo}/archive/refs/heads/main.zip\`;
      const webUrl = \`https://github.com/\${owner}/\${repo}\`;

      document.getElementById('dlLink').href = zipUrl;
      document.getElementById('dlUrl').innerText = '点击下载';
      
      document.getElementById('visitLink').href = webUrl;
      document.getElementById('visitUrl').innerText = webUrl.replace('https://', '');

      document.getElementById('linkBox').style.display = 'grid';
    }

    // 支持回车键
    document.getElementById('repoInput').addEventListener('keypress', function(e) {
      if (e.key === 'Enter') generateLinks();
    });
  </script>
</body>
</html>`;
}

// 处理代理请求
module.exports = async (req, res) => {
  try {
    const parsed = parse(req.url, true);
    const pathname = parsed.pathname || '';

    // 1. 如果是根路径，显示导航页
    if (pathname === '/' || pathname === '') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(homePage());
    }

    // 2. 【核心修复】智能解析路径
    // 移除开头的 /github.com 或 /api/proxy/github.com
    // 我们要找的是 owner/repo 这种格式
    let cleanPath = pathname;
    
    // 如果路径以 /github.com/ 开头，去掉它
    if (cleanPath.startsWith('/github.com/')) {
      cleanPath = cleanPath.substring('/github.com/'.length);
    } else if (cleanPath.startsWith('/api/proxy/github.com/')) {
      cleanPath = cleanPath.substring('/api/proxy/github.com/'.length);
    } else {
      // 如果都不是，可能是用户直接访问了 /owner/repo，尝试去掉第一个斜杠
      cleanPath = cleanPath.replace(/^\//, '');
    }

    // 提取 owner 和 repo
    const segments = cleanPath.split('/').filter(Boolean);
    
    // 必须至少有两段 (owner 和 repo)
    if (segments.length < 2) {
      // 如果没有足够的段数，也不要直接回到首页，而是返回一个友好的提示或降级 iframe 页
      // 这里为了调试方便，我们返回一个提示
      return res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' }).end(
        `<h1>路径错误</h1>当前路径: ${pathname}解析后: ${cleanPath}需要至少两段路径 (owner/repo)`
      );
    }

    const owner = segments[0];
    const repo = segments[1];
    // Branch 可以是第三段，如果没有默认为 main
    const branch = segments[2] || 'main';

    // 构建目标 URL
    const targetPath = '/' + segments.slice(2).join('/'); // 剩下的部分作为路径
    const upstreamUrl = \`https://github.com/\${owner}/\${repo}\${targetPath}\`;

    console.log(\`[Proxy] Fetching: \${upstreamUrl}\`);

    try {
      const upstreamRes = await fetch(upstreamUrl, {
        method: req.method,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        },
        redirect: 'manual' // 手动处理重定向，防止 Vercel 死循环
      });

      // 处理重定向 (如 302)
      if (upstreamRes.status >= 300 && upstreamRes.status < 400) {
        const location = upstreamRes.headers.get('location');
        if (location) {
           // 将 GitHub 的重定向转换为我们自己的重定向
           return res.writeHead(upstreamRes.status, { Location: location.replace('https://github.com', '') }).end();
        }
      }

      const contentType = upstreamRes.headers.get('content-type') || '';
      let body = await upstreamRes.text();

      // 替换所有绝对链接为相对路径，防止跳出代理
      // 这一步很关键，否则页面里的链接会变成 https://github.com/xxx，导致无法访问
      body = body.replace(/https:\/\/github\.com\//g, '/');
      body = body.replace(/https:\/\/api\.github\.com\//g, '/api.github.com/');
      body = body.replace(/https:\/\/raw\.githubusercontent\.com\//g, '/raw.githubusercontent.com/');
      body = body.replace(/https:\/\/codeload\.github\.com\//g, '/codeload.github.com/');

      // 注入下载按钮 (使用相对路径，确保在任何层级都有效)
      const downloadRelPath = \`/\${owner}/\${repo}/archive/refs/heads/\${branch}.zip\`;
      const btn = \`
        <div style="position:fixed;bottom:20px;right:20px;z-index:99999;background:#238636;color:#fff;padding:12px 20px;border-radius:8px;font-family:sans-serif;font-size:14px;font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,0.3);display:flex;align-items:center;gap:8px;pointer-events:auto;">
          <a href="\${downloadRelPath}" style="color:#fff;text-decoration:none;display:flex;align-items:center;gap:8px;">⬇️ Download Source (\${branch}.zip)</a>
        </div>
      \`;
      
      // 确保在 </body> 之前插入
      if (body.includes('')) {
        body = body.replace('', btn);
      } else {
        // 如果没有 body 标签，直接追加
        body += btn;
      }


      res.writeHead(upstreamRes.status, { 
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });
      return res.end(body);

    } catch (fetchErr) {
      console.error('Fetch Error:', fetchErr);
      res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(\`<h1>代理失败</h1>无法连接到上游服务器。<pre>\${fetchErr.message}</pre>\`);
    }

  } catch (err) {
    console.error('Handler Error:', err);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
};
