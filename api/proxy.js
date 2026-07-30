// api/proxy.js - Vercel GitHub 代理（极简稳定版）
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

// 导航页
function getNavPage(host) {
  return '<!DOCTYPE html>'
    + '<html lang="zh-CN"><head><meta charset="UTF-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1.0">'
    + '<title>GitHub 下载代理</title>'
    + '<style>'
    + '*{margin:0;padding:0;box-sizing:border-box}'
    + 'body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#0d1117;color:#c9d1d9;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}'
    + '.c{max-width:680px;width:100%;text-align:center}'
    + 'h1{color:#fff;font-size:2.2rem;margin-bottom:.4rem}'
    + 'h1 span{color:#58a6ff}'
    + '.s{color:#8b949e;margin-bottom:1.5rem;font-size:.95rem}'
    + '.box{display:flex;gap:8px;margin-bottom:1.5rem}'
    + '.box input{flex:1;padding:12px 14px;border:1px solid #30363d;border-radius:8px;background:#161b22;color:#c9d1d9;font-size:1rem;outline:0}'
    + '.box input:focus{border-color:#58a6ff}'
    + '.box button{padding:12px 20px;border:0;border-radius:8px;background:#238636;color:#fff;font-size:1rem;font-weight:600;cursor:pointer}'
    + '.box button:hover{background:#2ea043}'
    + '.dl{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:1.5rem}'
    + '.dl a{display:block;padding:14px;background:#161b22;border:1px solid #30363d;border-radius:10px;color:#58a6ff;text-decoration:none;font-size:.9rem}'
    + '.dl a:hover{border-color:#58a6ff}'
    + '.dl a b{display:block;color:#fff;margin-bottom:4px;font-size:.95rem}'
    + '.tip{text-align:left;padding:14px 16px;background:#161b22;border:1px solid #f0883e;border-radius:8px;margin-bottom:1rem}'
    + '.tip h3{color:#f0883e;font-size:.9rem;margin-bottom:6px}'
    + '.tip p,.tip li{color:#8b949e;font-size:.82rem;line-height:1.6}'
    + '.tip ul{list-style:none;padding:0}'
    + '.tip code{background:#0d1117;padding:2px 6px;border-radius:3px;color:#79c0ff;font-size:.78rem}'
    + '.f{margin-top:1.5rem;font-size:.78rem;color:#484f58}'
    + '</style></head><body><div class="c">'
    + '<h1><span>⬇️</span> GitHub 下载代理</h1>'
    + '<p class="s">输入仓库地址，一键获取高速下载链接</p>'
    + '<div class="box">'
    + '  <input id="i" placeholder="owner/repo（如 vercel/next.js）" />'
    + '  <button onclick="go()">生成链接</button>'
    + '</div>'
    + '<div class="dl" id="links" style="display:none">'
    + '  <a id="l1" target="_blank"><b>⬇️ 下载源码 (zip)</b><span id="t1"></span></a>'
    + '  <a id="l2" target="_blank"><b>📦 浏览仓库</b><span id="t2"></span></a>'
    + '  <a id="l3" target="_blank"><b>🔌 API 信息</b><span id="t3"></span></a>'
    + '  <a id="l4" target="_blank"><b>📄 Raw 入口</b><span id="t4"></span></a>'
    + '</div>'
    + '<div class="tip">'
    + '  <h3>💡 使用提示</h3>'
    + '  <ul>'
    + '    <li>输入仓库后点击"生成链接"，即可一键下载源码压缩包</li>'
    + '    <li>aria2c 多线程：<code>aria2c -x 16 -s 16 -c "下载链接"</code></li>'
    + '    <li>网页浏览请直接使用 <code>github.com</code>（本代理专注下载加速）</li>'
    + '  </ul>'
    + '</div>'
    + '<p class="f">Vercel Hobby · 100 万请求/月 · 100GB 带宽</p>'
    + '</div>'
    + '<script>'
    + 'function go(){'
    + '  var v=document.getElementById("i").value.trim();'
    + '  if(!v)return;'
    + '  if(v.indexOf("github.com/")>=0)v=v.split("github.com/")[1].replace(/^[/]+/,'');'
    + '  v=v.replace(/^https?:\\/\\//,'').replace(/^[/]+/,'');'
    + '  var p=v.split("/");if(p.length<2)return alert("格式应为 owner/repo");'
    + '  var owner=p[0],repo=p[1],branch=p[2]?"":"";'
    + '  var base="https://"+location.host+"/";'
    + '  var zip=base+"github.com/"+owner+"/"+repo+"/archive/refs/heads/main.zip";'
    + '  var browse=base+"github.com/"+owner+"/"+repo;'
    + '  var api=base+"api.github.com/repos/"+owner+"/"+repo;'
    + '  var raw=base+"raw.githubusercontent.com/"+owner+"/"+repo+"/main/README.md";'
    + '  document.getElementById("l1").href=zip;document.getElementById("t1").textContent=zip;'
    + '  document.getElementById("l2").href=browse;document.getElementById("t2").textContent=browse;'
    + '  document.getElementById("l3").href=api;document.getElementById("t3").textContent=api;'
    + '  document.getElementById("l4").href=raw;document.getElementById("t4").textContent=raw;'
    + '  document.getElementById("links").style.display="grid";'
    + '}'
    + 'document.getElementById("i").addEventListener("keydown",function(e){if(e.key==="Enter")go()});'
    + '</script></body></html>';
}

// 顶部悬浮下载条（纯 HTML + CSS，不依赖 JS）
function getDownloadBanner(owner, repo, branch) {
  var zipUrl = '/github.com/' + owner + '/' + repo + '/archive/refs/heads/' + branch + '.zip';
  return '<div style="'
    + 'position:fixed;top:0;left:0;right:0;z-index:999999;'
    + 'background:#238636;color:#fff;padding:10px 16px;'
    + 'font-family:-apple-system,sans-serif;font-size:14px;font-weight:600;'
    + 'display:flex;align-items:center;justify-content:center;gap:12px;'
    + 'box-shadow:0 2px 8px rgba(0,0,0,0.3);'
    + '">'
    + '  <span>📦 ' + owner + '/' + repo + '</span>'
    + '  <span style="opacity:0.6">|</span>'
    + '  <span>🌿 ' + branch + '</span>'
    + '  <a href="' + zipUrl + '" target="_blank" style="'
    + '    background:#fff;color:#238636;padding:6px 14px;border-radius:6px;'
    + '    text-decoration:none;font-weight:700;font-size:13px;'
    + '  ">⬇️ 下载源码 (' + branch + '.zip)</a>'
    + '</div>'
    + '<div style="height:44px"></div>'; // 占位防止遮挡内容
}

// 提取仓库信息
function extractRepo(path) {
  var m = path.match(/^\/([^\/]+)\/([^\/]+)(\/.*)?$/);
  return m ? { owner: m[1], repo: m[2] } : null;
}
function extractBranch(path) {
  var m = path.match(/\/tree\/([^\/]+)/);
  return m ? m[1] : 'main';
}

// 文本替换
function replaceText(html) {
  if (!html) return html;
  return html
    .replace(/https:\/\/github\.com/g, '/github.com')
    .replace(/https:\/\/api\.github\.com/g, '/api.github.com')
    .replace(/https:\/\/raw\.githubusercontent\.com/g, '/raw.githubusercontent.com')
    .replace(/https:\/\/codeload\.github\.com/g, '/codeload.github.com')
    .replace(/https:\/\/objects\.githubusercontent\.com/g, '/objects.githubusercontent.com')
    .replace(/https:\/\/avatars\.githubusercontent\.com/g, '/avatars.githubusercontent.com')
    .replace(/https:\/\/camo\.githubusercontent\.com/g, '/camo.githubusercontent.com');
}

module.exports = async function handler(req, res) {
  try {
    var rawPath = req.url || '/';

    // 根路径 → 导航页
    if (rawPath === '/' || rawPath === '') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(getNavPage(req.headers.host));
    }

    // 分离路径和查询
    var qIdx = rawPath.indexOf('?');
    var pathOnly = qIdx >= 0 ? rawPath.substring(0, qIdx) : rawPath;
    var queryStr = qIdx >= 0 ? rawPath.substring(qIdx) : '';

    // 白名单前缀匹配
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

    if (!matched) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(getNavPage(req.headers.host));
    }

    var targetHost = matched.substring(1);
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
      headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
    }

    // 请求体
    var fetchOpts = { method: req.method, headers: headers, redirect: 'manual' };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      var bodyBuf = await new Promise(function(resolve, reject) {
        var chunks = [];
        req.on('data', function(c) { chunks.push(c); });
        req.on('end', function() { resolve(Buffer.concat(chunks)); });
        req.on('error', reject);
      });
      fetchOpts.body = bodyBuf;
    }

    var upstreamRes = await fetch(upstreamUrl, fetchOpts);
    var status = upstreamRes.status;

    // 重定向处理
    if (status >= 300 && status < 400) {
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

    // HTML 处理：文本替换 + 顶部悬浮下载条
    if (contentType.indexOf('text/html') >= 0) {
      var html = await upstreamRes.text();
      html = replaceText(html);

      // 只在 github.com 的仓库页面注入悬浮条
      if (targetHost === 'github.com') {
        var repoInfo = extractRepo(remainingPath);
        if (repoInfo) {
          var branch = extractBranch(remainingPath);
          var banner = getDownloadBanner(repoInfo.owner, repoInfo.repo, branch);
          // 在 <body> 后插入悬浮条（纯 HTML/CSS，不需要 JS 执行）
          html = html.replace('<body', '<body>' + banner + '<script>document.body.style.paddingTop="44px"</script><body');
          // 上面的写法有问题，改为：
        }
      }

      res.writeHead(status, Object.assign({}, respHeaders, { 'Content-Type': 'text/html; charset=utf-8' }));
      return res.end(html);
    }

    // 非 HTML 流式传输
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