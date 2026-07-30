module.exports = async function handler(req, res) {
  try {
    var rawPath = req.url || '/';

    // 根路径 -> 导航页
    if (rawPath === '/' || rawPath === '') {
      return sendNavPage(res);
    }

    // /frame/github.com/owner/repo -> 我们的包装页（带按钮）
    if (rawPath.indexOf('/frame/') === 0) {
      var targetUrl = 'https://' + rawPath.substring(7);
      return sendFramePage(res, targetUrl, rawPath);
    }

    // 其他路径 -> 直接代理到上游
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
      if (rawPath === p || rawPath.indexOf(p + '/') === 0) {
        matched = p;
        break;
      }
    }

    if (!matched) {
      return sendNavPage(res);
    }

    var targetHost = matched.substring(1);
    var remainingPath = rawPath.substring(matched.length);
    if (remainingPath === '') remainingPath = '/';

    var upstreamUrl = 'https://' + targetHost + remainingPath;
    var qIdx = req.url.indexOf('?');
    if (qIdx >= 0) upstreamUrl += req.url.substring(qIdx);

    var headers = {};
    var reqHeaders = req.headers;
    for (var key in reqHeaders) {
      if (!reqHeaders.hasOwnProperty(key)) continue;
      var low = key.toLowerCase();
      if (low === 'host' || low === 'cf-connecting-ip' || low === 'x-vercel-id' || low === 'connection' || low === 'content-length') continue;
      headers[key] = reqHeaders[key];
    }
    headers['Host'] = targetHost;
    headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

    var fetchOpts = { method: req.method, headers: headers, redirect: 'manual' };
    var upstreamRes = await fetch(upstreamUrl, fetchOpts);
    var status = upstreamRes.status;

    if (status >= 300 && status < 400) {
      var loc = upstreamRes.headers.get('location') || '';
      res.writeHead(status, { 'Location': loc });
      return res.end();
    }

    var respHeaders = {};
    upstreamRes.headers.forEach(function(val, key) {
      var low = key.toLowerCase();
      if (low === 'content-encoding' || low === 'transfer-encoding' || low === 'content-security-policy' || low === 'x-frame-options' || low === 'frame-options') return;
      respHeaders[key] = val;
    });
    respHeaders['Access-Control-Allow-Origin'] = '*';

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
    console.error('Error:', err.message);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Error: ' + err.message);
    }
  }
};

function sendNavPage(res) {
  var html =
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">' +
    '<title>GitHub Proxy</title><style>' +
    '*{margin:0;padding:0;box-sizing:border-box}' +
    'body{font-family:-apple-system,sans-serif;background:#0d1117;color:#c9d1d9;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}' +
    '.c{max-width:600px;width:100%;text-align:center}' +
    'h1{color:#fff;font-size:2rem;margin-bottom:1rem}' +
    '.box{display:flex;gap:8px;margin-bottom:1rem}' +
    '.box input{flex:1;padding:12px;border:1px solid #30363d;border-radius:8px;background:#161b22;color:#fff;font-size:1rem;outline:0}' +
    '.box button{padding:12px 20px;border:0;border-radius:8px;background:#238636;color:#fff;font-size:1rem;cursor:pointer;font-weight:600}' +
    '.tip{margin-top:1rem;color:#8b949e;font-size:.85rem;line-height:1.6}' +
    '</style></head><body><div class="c">' +
    '<h1>&#11015; GitHub Proxy</h1>' +
    '<div class="box"><input id="i" placeholder="owner/repo" /><button onclick="go()">Open</button></div>' +
    '<p class="tip">Enter a repo like <code>tanle-mtr/vercel-proxy</code><br>Click Open to see it with a download button</p>' +
    '</div>' +
    '<script>' +
    'function go(){' +
    'var v=document.getElementById("i").value.trim();' +
    'if(!v)return;' +
    'v=v.replace(/^https?:\\/\\//,"").replace(/^github.com\\//,"");' +
    'var parts=v.split("/");if(parts.length<2)return alert("Need owner/repo");' +
    'var url="https://"+location.host+"/frame/github.com/"+parts[0]+"/"+parts[1];' +
    'location.href=url;' +
    '}' +
    'document.getElementById("i").addEventListener("keydown",function(e){if(e.key==="Enter")go()});' +
    '</script></body></html>';
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

function sendFramePage(res, targetUrl, rawPath) {
  // 从 URL 提取 owner/repo/branch
  var pathOnly = rawPath.substring(7); // 去掉 /frame
  var qIdx = pathOnly.indexOf('?');
  if (qIdx >= 0) pathOnly = pathOnly.substring(0, qIdx);

  var repoMatch = pathOnly.match(/^\/([^\/]+)\/([^\/]+)/);
  var owner = repoMatch ? repoMatch[1] : 'unknown';
  var repo = repoMatch ? repoMatch[2] : 'unknown';

  var branchMatch = pathOnly.match(/\/tree\/([^\/]+)/);
  var branch = branchMatch ? branchMatch[1] : 'main';

  var zipUrl = '/github.com/' + owner + '/' + repo + '/archive/refs/heads/' + branch + '.zip';

  var html =
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">' +
    '<title>' + owner + '/' + repo + ' - Proxy</title><style>' +
    '*{margin:0;padding:0}' +
    'body{font-family:-apple-system,sans-serif;overflow:hidden}' +
    '.bar{position:fixed;top:0;left:0;right:0;height:44px;background:#161b22;border-bottom:1px solid #30363d;display:flex;align-items:center;padding:0 16px;gap:12px;z-index:999999;}' +
    '.bar a{color:#58a6ff;text-decoration:none;font-size:13px;font-weight:600}' +
    '.bar .sep{color:#484f58}' +
    '.bar .spacer{flex:1}' +
    '.bar .btn{background:#238636;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;display:inline-flex;align-items:center;gap:6px;}' +
    '.bar .btn:hover{background:#2ea043}' +
    '.bar .btn-api{background:#1f6feb;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;}' +
    '.bar .btn-api:hover{background:#388bfd}' +
    'iframe{position:fixed;top:44px;left:0;width:100%;height:calc(100vh - 44px);border:0}' +
    '</style></head><body>' +
    '<div class="bar">' +
    '  <a href="/">&#11015; Proxy</a>' +
    '  <span class="sep">|</span>' +
    '  <span style="color:#c9d1d9;font-size:13px">' + owner + '/' + repo + '</span>' +
    '  <span class="sep">|</span>' +
    '  <span style="color:#8b949e;font-size:12px">&#127800; ' + branch + '</span>' +
    '  <span class="spacer"></span>' +
    '  <a class="btn-api" href="/api.github.com/repos/' + owner + '/' + repo + '" target="_blank">&#128268; API</a>' +
    '  <a class="btn" href="' + zipUrl + '" target="_blank">&#11015; Download (' + branch + '.zip)</a>' +
    '</div>' +
    '<iframe src="' + targetUrl + '" allow="fullscreen"></iframe>' +
    '</body></html>';

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}
