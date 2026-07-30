// api/proxy.js - Vercel GitHub 下载代理（稳定版）
// 专注做好下载加速，网页浏览降级提示

const ALLOWED = [
  'github.com',
  'api.github.com',
  'raw.githubusercontent.com',
  'codeload.github.com',
  'objects.githubusercontent.com',
  'camo.githubusercontent.com',
  'avatars.githubusercontent.com',
  'gist.github.com',
  'gist.githubusercontent.com'
];

function isAllowedHost(host) {
  for (var i = 0; i < ALLOWED.length; i++) {
    if (host === ALLOWED[i]) return true;
    if (host.endsWith('.' + ALLOWED[i])) return true;
  }
  return false;
}

function getNavPage(host) {
  return '<!DOCTYPE html>'
    + '<html lang="zh-CN"><head><meta charset="UTF-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1.0">'
    + '<title>GitHub 下载代理</title>'
    + '<style>'
    + '*{margin:0;padding:0;box-sizing:border-box}'
    + 'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#0d1117;color:#c9d1d9;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}'
    + '.container{max-width:860px;width:100%;text-align:center}'
    + 'h1{color:#fff;font-size:2.4rem;margin-bottom:.5rem}'
    + 'h1 span{color:#58a6ff}'
    + '.sub{color:#8b949e;margin-bottom:2rem;font-size:1rem}'
    + '.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-bottom:2rem;text-align:left}'
    + '.card{background:#161b22;border:1px solid #30363d;border-radius:10px;padding:18px;transition:all .2s}'
    + '.card:hover{border-color:#58a6ff;transform:translateY(-2px)}'
    + '.card h3{color:#58a6ff;margin-bottom:6px;font-size:1rem}'
    + '.card p{color:#8b949e;font-size:.82rem;line-height:1.5}'
    + '.card code{background:#0d1117;padding:2px 6px;border-radius:4px;color:#79c0ff;font-size:.78rem;display:inline-block;margin-top:4px}'
    + '.warn{margin-top:1.5rem;padding:14px 18px;background:#1c2128;border:1px solid #f0883e;border-radius:8px;text-align:left}'
    + '.warn h3{color:#f0883e;margin-bottom:6px;font-size:.95rem}'
    + '.warn p,.warn li{color:#8b949e;font-size:.82rem;line-height:1.6}'
    + '.warn ul{list-style:none;padding:0}'
    + '.warn li::before{content:"\\2713  ";color:#3fb950}'
    + '.search{display:flex;gap:8px;max-width:600px;margin:0 auto 2rem;flex-wrap:wrap}'
    + '.search input{flex:1;min-width:200px;padding:12px 16px;border:1px solid #30363d;border-radius:8px;background:#161b22;color:#c9d1d9;font-size:1rem;outline:none}'
    + '.search input:focus{border-color:#58a6ff}'
    + '.search button{padding:12px 20px;border:none;border-radius:8px;background:#238636;color:#fff;font-size:1rem;cursor:pointer;font-weight:600}'
    + '.search button:hover{background:#2ea043}'
    + '.footer{margin-top:2rem;font-size:.78rem;color:#484f58}'
    + '</style></head><body><div class="container">'
    + '<h1><span>\\u2B07\\uFE0F</span> GitHub 下载代理</h1>'
    + '<p class="sub">基于 Vercel Functions 的高速下载加速</p>'
    + '<div class="search">'
    + '  <input id="repoInput" placeholder="输入 owner/repo（如 vercel/next.js）" />'
    + '  <button onclick="goRepo()">打开</button>'
    + '</div>'
    + '<div class="grid">'
    + '  <div class="card"><h3>\\U0001F4E6 仓库主页</h3><p>直接访问 GitHub 仓库</p><code>/github.com/owner/repo</code></div>'
    + '  <div class="card"><h3>\\u2B07\\uFE0F Release 下载</h3><p>高速下载 Release 附件</p><code>/github.com/owner/repo/releases</code></div>'
    + '  <div class="card"><h3>\\U0001F4C4 Raw 文件</h3><p>单文件直链下载</p><code>/raw.githubusercontent.com/...</code></div>'
    + '  <div class="card"><h3>\\U0001F4E6 Archive 下载</h3><p>下载整个仓库 zip/tar</p><code>/github.com/owner/repo/archive/main.zip</code></div>'
    + '</div>'
    + '<div class="warn">'
    + '  <h3>\\U0001F4A1 使用建议</h3>'
    + '  <ul>'
    + '    <li>网页浏览请直接使用 <a href="https://github.com" style="color:#58a6ff">github.com</a>（体验最完整）</li>'
    + '    <li>本代理最适合：Release 下载、Archive 打包下载、Raw 文件直链、aria2c 多线程加速</li>'
    + '    <li>aria2c：<code style="color:#79c0ff">aria2c -x 16 -s 16 -c "https://' + host + '/github.com/owner/repo/archive/main.zip"</code></li>'
    + '    <li>如需完美网页反代，推荐使用 Cloudflare Workers</li>'
    + '  </ul>'
    + '</div>'
    + '<p class="footer">Vercel Hobby \\u00B7 100 万请求/月 \\u00B7 100GB 带宽 \\u00B7 仅限个人使用</p>'
    + '</div>'
    + '<script>'
    + 'function goRepo(){var v=document.getElementById("repoInput").value.trim();if(!v)return;if(v.startsWith("http")){try{var u=new URL(v);window.location="/"+u.hostname+u.pathname}catch(e){}}else{window.location="/github.com/"+v}}'
    + 'document.getElementById("repoInput").addEventListener("keydown",function(e){if(e.key==="Enter")goRepo()});'
    + '</script></body></html>';
}

function replaceText(text) {
  text = text.replace(/https:\/\/github\.com/g, '/github.com');
  text = text.replace(/https:\/\/api\.github\.com/g, '/api.github.com');
  text = text.replace(/https:\/\/raw\.githubusercontent\.com/g, '/raw.githubusercontent.com');
  text = text.replace(/https:\/\/codeload\.github\.com/g, '/codeload.github.com');
  text = text.replace(/https:\/\/objects\.githubusercontent\.com/g, '/objects.githubusercontent.com');
  text = text.replace(/https:\/\/avatars\.githubusercontent\.com/g, '/avatars.githubusercontent.com');
  text = text.replace(/https:\/\/camo\.githubusercontent\.com/g, '/camo.githubusercontent.com');
  return text;
}

// 在 HTML 页面右下角注入"下载源码"按钮
function injectDownloadButton(html, reqPath) {
  // 提取仓库信息：从路径中解析 owner/repo
  // 路径格式：/github.com/owner/repo/...
  var repoMatch = reqPath.match(/\/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!repoMatch) return html;

  var owner = repoMatch[1];
  var repo = repoMatch[2];
  // 去掉可能的 .git 后缀
  repo = repo.replace(/\.git$/, '');

  var branch = 'main'; // 默认分支
  // 尝试从路径中提取分支名
  var branchMatch = reqPath.match(/\/tree\/([^\/]+)/);
  if (branchMatch) branch = branchMatch[1];

  var downloadBtn = ''
    + '<div id="proxy-dl-btn" style="position:fixed;right:20px;bottom:20px;z-index:99999;font-family:-apple-system,sans-serif">'
    + '  <a href="/github.com/' + owner + '/' + repo + '/archive/refs/heads/' + branch + '.zip" '
    + '     style="display:inline-flex;align-items:center;gap:6px;padding:12px 20px;background:#238636;color:#fff;'
    + '           text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;'
    + '           box-shadow:0 4px 12px rgba(0,0,0,.3);transition:all .2s"'
    + '     onmouseover="this.style.background=\'#2ea043\'" onmouseout="this.style.background=\'#238636\'">'
    + '    \\u2B07\\uFE0F 下载源码 (' + branch + '.zip)'
    + '  </a>'
    + '</div>';

  // 注入到 body 末尾
  if (html.indexOf('</body>') >= 0) {
    html = html.replace('</body>', downloadBtn + '</body>');
  } else {
    html += downloadBtn;
  }

  return html;
}

module.exports = async function handler(req, res) {
  try {
    var rawPath = req.url || '/';

    // 根路径 → 导航页
    if (rawPath === '/' || rawPath === '') {
      var host = (req.headers && req.headers.host) || 'localhost';
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(getNavPage(host));
    }

    // 解析路径和查询字符串
    var queryIdx = rawPath.indexOf('?');
    var pathOnly = queryIdx >= 0 ? rawPath.substring(0, queryIdx) : rawPath;
    var queryStr = queryIdx >= 0 ? rawPath.substring(queryIdx) : '';

    // 白名单前缀检查
    var allowedPrefixes = [
      '/github.com',
      '/api.github.com',
      '/raw.githubusercontent.com',
      '/codeload.github.com',
      '/objects.githubusercontent.com',
      '/camo.githubusercontent.com',
      '/avatars.githubusercontent.com'
    ];

    var matchedPrefix = null;
    for (var i = 0; i < allowedPrefixes.length; i++) {
      var p = allowedPrefixes[i];
      if (pathOnly === p || pathOnly.indexOf(p + '/') === 0) {
        matchedPrefix = p;
        break;
      }
    }

    // 非代理路径 → 导航页
    if (!matchedPrefix) {
      var h = (req.headers && req.headers.host) || 'localhost';
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(getNavPage(h));
    }

    var targetHost = matchedPrefix.substring(1);
    var remainingPath = pathOnly.substring(matchedPrefix.length());
    if (remainingPath === '') remainingPath = '/';

    var upstreamUrl = 'https://' + targetHost + remainingPath + queryStr;

    // 构建请求头
    var headers = {};
    var reqHeaders = req.headers || {};
    for (var key in reqHeaders) {
      if (!reqHeaders.hasOwnProperty(key)) continue;
      var lower = key.toLowerCase();
      if (lower === 'host' || lower === 'cf-connecting-ip' || lower === 'x-vercel-id'
          || lower === 'connection' || lower === 'content-length') continue;
      headers[key] = reqHeaders[key];
    }
    headers['Host'] = targetHost;
    headers['Origin'] = 'https://' + targetHost;
    headers['Referer'] = 'https://' + targetHost + '/';
    if (!headers['User-Agent']) {
      headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
    }

    // 请求选项
    var fetchOpts = {
      method: req.method || 'GET',
      headers: headers,
      redirect: 'manual'
    };

    // 处理请求体
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      try {
        var bodyBuf = await new Promise(function(resolve, reject) {
          var chunks = [];
          req.on('data', function(c) { chunks.push(c); });
          req.on('end', function() { resolve(Buffer.concat(chunks)); });
          req.on('error', reject);
        });
        fetchOpts.body = bodyBuf;
      } catch (e) {
        console.error('Body read error:', e.message);
      }
    }

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

    var contentType = (respHeaders['Content-Type'] || respHeaders['content-type'] || '').toLowerCase();

    // HTML 页面处理
    if (contentType.indexOf('text/html') >= 0) {
      var html = await upstreamRes.text();
      html = replaceText(html);

      // 注入下载按钮
      html = injectDownloadButton(html, pathOnly);

      // 注入 fetch/XHR 劫持（最后防线）
      var fixScript = ''
        + '<script>'
        + '(function(){'
        + 'var m={"https://github.com":"/github.com","https://api.github.com":"/api.github.com",'
        + '"https://raw.githubusercontent.com":"/raw.githubusercontent.com",'
        + '"https://codeload.github.com":"/codeload.github.com"};'
        + 'function p(u){for(var k in m){if(u.indexOf(k)===0)return m[k]+u.substring(k.length);}return u;}'
        + 'var _f=window.fetch;window.fetch=function(i,o){if(typeof i==="string")i=p(i);'
        + 'else if(i instanceof Request)i=new Request(p(i.url),i);return _f.call(this,i,o);};'
        + 'var _o=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u){arguments[1]=p(u);return _o.apply(this,arguments);};'
        + '})();'
        + '</script>';

      html = html.replace('</head>', fixScript + '</head>');

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
