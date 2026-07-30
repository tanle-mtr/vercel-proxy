// api/proxy.js - 稳定版，服务器代理 + 注入下载按钮
const { URL } = require('url');

// 允许代理的主机列表
const ALLOWED_HOSTS = ['github.com', 'api.github.com', 'raw.githubusercontent.com', 'codeload.github.com'];

function isAllowed(host) {
  return ALLOWED_HOSTS.some(h => host === h || host.endsWith('.' + h));
}

// 注入下载按钮（纯 HTML，不依赖 JS）
function injectDownloadButton(html, owner, repo, branch) {
  const zipUrl = `/github.com/${owner}/${repo}/archive/refs/heads/${branch}.zip`;
  const btn = `
    <div style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 2147483647;
      background: #238636;
      color: #fff;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      gap: 8px;
    ">
      <a href="${zipUrl}" target="_blank" style="color: #fff; text-decoration: none;">
        ⬇️ Download Source (${branch}.zip)
      </a>
    </div>
  `;
  return html.replace('</body>', btn + '</body>');
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
    const reqPath = req.url || '/';
    const parsed = parseRepo(reqPath);

    // 如果不是 github.com 路径，返回导航页或 404
    if (!parsed) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(`
        <!DOCTYPE html>
        <html><head><title>Proxy</title></head>
        <body style="font-family:sans-serif;padding:50px;background:#0d1117;color:#c9d1d9;">
          <h1>GitHub Proxy</h1>
          <p>用法：访问 <code>/github.com/owner/repo</code></p>
        </body></html>
      `);
    }

    const { owner, repo, branch } = parsed;

    // 构建上游 URL（保持原始路径，但去掉开头的 /github.com）
    const upstreamPath = reqPath.replace(/^\/github\.com/, '') || '/';
    const upstreamUrl = `https://github.com${upstreamPath}`;

    // 发起 fetch 请求
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

    // 如果是非 HTML（如重定向、图片等），直接透传
    if (!contentType.includes('text/html')) {
      const body = await upstreamRes.buffer();
      res.writeHead(status, { 'Content-Type': contentType, 'Access-Control-Allow-Origin': '*' });
      return res.end(body);
    }

    // 读取 HTML
    let html = await upstreamRes.text();

    // 替换所有绝对链接为代理链接
    html = html.replace(/https:\/\/github\.com/g, '/github.com');
    html = html.replace(/https:\/\/api\.github\.com/g, '/api.github.com');
    html = html.replace(/https:\/\/raw\.githubusercontent\.com/g, '/raw.githubusercontent.com');
    html = html.replace(/https:\/\/codeload\.github\.com/g, '/codeload.github.com');

    // 注入下载按钮
    html = injectDownloadButton(html, owner, repo, branch);

    // 返回修改后的 HTML
    res.writeHead(status, {
      'Content-Type': 'text/html; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(html);

  } catch (err) {
    console.error('Fetch error:', err.message);
    // 如果 fetch 失败，降级为 iframe 方式（但可能仍然无法加载）
    const fallbackHtml = `
      <!DOCTYPE html>
      <html><head><title>Proxy Fallback</title></head>
      <body style="font-family:sans-serif;background:#0d1117;color:#c9d1d9;padding:20px;">
        <h2>⚠️ 代理请求失败</h2>
        <p>无法直接从服务器获取 GitHub 页面，请尝试直接访问：</p>
        <p><a href="https://github.com${upstreamPath}" style="color:#58a6ff;">https://github.com${upstreamPath}</a></p>
        <hr>
        <p>或者使用下载链接（无需代理）：</p>
        <p><a href="https://github.com/${owner}/${repo}/archive/refs/heads/${branch}.zip" style="color:#238636;">⬇️ 下载 ${branch}.zip</a></p>
      </body></html>
    `;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fallbackHtml);
  }
};
