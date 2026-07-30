// api/proxy.js - Vercel GitHub 代理
// 在服务端将"下载源码"按钮注入到 GitHub 页面 HTML 中
// 不依赖客户端 JS 执行，绕过 CSP 和 SPA 限制

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
  return ALLOWED.some(function(d) { return h === d || h.endsWith('.' + d); });
}

// 提取 owner/repo
function getRepoInfo(path) {
  var m = path.match(/^\/([^\/]+)\/([^\/]+)(\/.*)?$/);
  if (!m) return null;
  return { owner: m[1], repo: m[2] };
}

// 提取当前分支名
function getBranch(path) {
  var m = path.match(/\/tree\/([^\/]+)/);
  return m ? m[1] : 'main';
}

// ===== 核心：在服务端注入下载按钮 HTML =====
// 策略顺序：star-button → fork-button → Code按钮后 → BtnGroup后 → </body>前
function injectDownloadButton(html, path) {
  var repo = getRepoInfo(path);
  if (!repo) return html;
  var branch = getBranch(path);
  var zipUrl = '/' + repo.owner + '/' + repo.repo + '/archive/refs/heads/' + branch + '.zip';

  // 按钮 HTML（模仿 GitHub 原生 btn-sm 样式，绿色 #2ea043）
  var btn = ' <a href="' + zipUrl + '" class="btn btn-sm"';
  btn += ' style="margin-left:8px!important;display:inline-flex!important;align-items:center!important;gap:6px!important;';
  btn += 'padding:5px 16px!important;font-size:14px!important;font-weight:600!important;';
  btn += 'color:#fff!important;background:#2ea043!important;';
  btn += 'border:1px solid rgba(240,246,252,0.1)!important;border-radius:6px!important;';
  btn += 'text-decoration:none!important;cursor:pointer!important;vertical-align:middle!important;line-height:20px!important;"';
  btn += ' target="_blank" rel="noopener"';
  btn += ' onmouseover="this.style.background=\'#3fb950\'"';
  btn += ' onmouseout="this.style.background=\'#2ea043\'"';
  btn += '>⬇️ 下载源码 (' + branch + '.zip)</a>';

  // 策略1：在 star-button 前面插入（最可靠）
  var starRe = /(<button[^>]*data-testid="star-button"[^>]*>)/;
  if (starRe.test(html)) {
    return html.replace(starRe, btn + '\n        $1');
  }

  // 策略2：在 fork-button 前面插入
  var forkRe = /(<button[^>]*data-testid="fork-button"[^>]*>)/;
  if (forkRe.test(html)) {
    return html.replace(forkRe, btn + '\n        $1');
  }

  // 策略3：在 Code 按钮的 </a> 后面插入
  var codeRe = /(data-testid="download-button"[^>]*>[\s\S]*?<\/a>)/;
  if (codeRe.test(html)) {
    return html.replace(codeRe, '$1' + btn);
  }

  // 策略4：在最后一个 BtnGroup 的闭合 </div> 后面插入
  var btnGroupRe = /(<\/div>\s*\n\s*)(<button[^>]*data-testid)/;
  if (btnGroupRe.test(html)) {
    return html.replace(btnGroupRe, '$1' + btn + '\n        $2');
  }

  // 策略5：兜底，插入到 </body> 前
  return html.replace('</body>', btn + '\n</body>');
}

// 文本替换：将绝对 URL 转为代理相对路径
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

// 导航页
function getNavPage() {
  return '<!DOCTYPE html>\n'
    + '<html lang="zh-CN"><head><meta charset="UTF-8">\n'
    + '<meta name="viewport" content="width=device-width,initial-scale=1.0">\n'
    + '<title>GitHub 下载代理</title>\n'
    + '<style>\n'
    + '*{margin:0;padding:0;box-sizing:border-box}\n'
    + 'body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#0d1117;color:#c9d1d9;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}\n'
    + '.container{max-width:860px;width:100%;text-align:center}\n'
    + 'h1{color:#fff;font-size:2.4rem;margin-bottom:.5rem}\n'
    + 'h1 span{color:#58a6ff}\n'
    + '.sub{color:#8b949e;margin-bottom:2rem;font-size:1rem}\n'
    + '.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-bottom:2rem;text-align:left}\n'
    + '.card{background:#161b22;border:1px solid #30363d;border-radius:10px;padding:18px}\n'
    + '.card h3{color:#58a6ff;margin-bottom:6px;font-size:1rem}\n'
    + '.card p{color:#8b949e;font-size:.84rem;line-height:1.5}\n'
    + '.card code{background:#0d1117;padding:2px 6px;border-radius:4px;color:#79c0ff;font-size:.80rem;display:inline-block;margin-top:4px}\n'
    + '.footer{margin-top:2rem;font-size:.78rem;color:#484f58}\n'
    + '</style></head><body><div class="container">\n'
    + '<h1><span>⬇️</span> GitHub 下载代理</h1>\n'
    + '<p class="sub">基于 Vercel Functions 的高速下载加速</p>\n'
    + '<div class="grid">\n'
    + '  <div class="card"><h3>📦 仓库主页</h3><p>直接访问 GitHub 仓库</p><code>/github.com/owner/repo</code></div>\n'
    + '  <div class="card"><h3>⬇️ Release 下载</h3><p>高速下载 Release 附件</p><code>/github.com/owner/repo/releases</code></div>\n'
    + '  <div class="card"><h3>📄 Raw 文件</h3><p>单文件直链下载</p><code>/raw.githubusercontent.com/owner/repo/file</code></div>\n'
    + '  <div class="card"><h3>📦 Archive 下载</h3><p>下载整个仓库 zip</p><code>/github.com/owner/repo/archive/main.zip</code></div>\n'
    + '</div>\n'
    + '<p class="footer">Vercel Hobby · 100 万请求/月 · 100GB 带宽 · 仅限个人使用</p>\n'
    + '</div></body></html>';
}

// ===== Vercel Serverless Function Handler =====
module.exports = async function handler(req, res) {
  try {
    var rawPath = req.url || '/';

    // 根路径 → 导航页
    if (rawPath === '/' || rawPath === '') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(getNavPage());
    }

    // 分离路径和查询字符串
    var qIdx = rawPath.indexOf('?');
    var pathOnly = qIdx >= 0 ? rawPath.substring(0, qIdx) : rawPath;
    var queryStr = qIdx >= 0 ? rawPath.substring(qIdx) : '';

    // 匹配白名单前缀
    var prefixes = [
      '/github.com',
      '/api.github.com',
      '/raw.githubusercontent.com',
      '/codeload.github.com',
      '/objects.githubusercontent.com',
      '/camo.githubusercontent.com',
      '/avatars.githubusercontent.com'
    ];

    var matched = null;
    for (var i = 0; i < prefixes.length; i++) {
      var p = prefixes[i];
      if (pathOnly === p || pathOnly.indexOf(p + '/') === 0) {
        matched = p;
        break;
      }
    }

    // 不在白名单 → 导航页
    if (!matched) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(getNavPage());
    }

    var targetHost = matched.substring(1); // 去掉开头的 /
    var remainingPath = pathOnly.substring(matched.length);
    if (remainingPath === '') remainingPath = '/';

    var upstreamUrl = 'https://' + targetHost + remainingPath + queryStr;

    // 构建请求头
    var headers = {};
    var reqHeaders = req.headers;
    for (var key in reqHeaders) {
      if (!reqHeaders.hasOwnProperty(key)) continue;
      var low = key.toLowerCase();
      if (low === 'host' || low === 'cf-connecting-ip' || low === 'x-vercel-id'
          || low === 'connection' || low === 'content-length') continue;
      headers[key] = reqHeaders[key];
    }
    headers['Host'] = targetHost;
    headers['Origin'] = 'https://' + targetHost;
    headers['Referer'] = 'https://' + targetHost + '/';
    if (!headers['User-Agent']) {
      headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
    }

    // 请求体处理
    var fetchOpts = {
      method: req.method,
      headers: headers,
      redirect: 'manual'
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      var bodyBuf = await new Promise(function(resolve, reject) {
        var chunks = [];
        req.on('data', function(c) { chunks.push(c); });
        req.on('end', function() { resolve(Buffer.concat(chunks)); });
        req.on('error', reject);
      });
      fetchOpts.body = bodyBuf;
    }

    // 发起上游请求
    var upstreamRes = await fetch(upstreamUrl, fetchOpts);
    var status = upstreamRes.status;

    // 处理重定向
    if (status === 301 || status === 302 || status === 303 || status === 307 || status === 308) {
      var loc = upstreamRes.headers.get('location');
      if (loc) {
        try {
          var locUrl = new URL(loc);
          if (isAllowedHost(locUrl.hostname)) {
            var newLoc = '/' + locUrl.hostname + locUrl.pathname + locUrl.search;
            res.writeHead(status, { 'Location': newLoc });
            return res.end();
          }
        } catch (e) {}
      }
      res.writeHead(status, { 'Location': loc || '' });
      return res.end();
    }

    // 收集响应头
    var respHeaders = {};
    upstreamRes.headers.forEach(function(val, key) {
      var low = key.toLowerCase();
      if (low === 'content-encoding' || low === 'transfer-encoding'
          || low === 'content-security-policy' || low === 'content-security-policy-report-only'
          || low === 'clear-site-data') return;
      respHeaders[key] = val;
    });
    respHeaders['Access-Control-Allow-Origin'] = '*';
    delete respHeaders['access-control-allow-credentials'];

    var contentType = (respHeaders['Content-Type'] || '').toLowerCase();

    // HTML 处理：文本替换 + 注入下载按钮
    if (contentType.indexOf('text/html') >= 0) {
      var html = await upstreamRes.text();
      html = replaceText(html);
      html = injectDownloadButton(html, remainingPath);

      res.writeHead(status, Object.assign({}, respHeaders, { 'Content-Type': 'text/html; charset=utf-8' }));
      return res.end(html);
    }

    // 非 HTML：流式传输
    res.writeHead(status, respHeaders);
    if (upstreamRes.body) {
      var reader = upstreamRes.body.getReader();
      while (true) {
        var result = await reader.read();
        if (result.done) break;
        res.write(Buffer.from(result.value));
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
