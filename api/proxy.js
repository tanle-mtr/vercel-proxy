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

function getNavPage(host) {
  return '<!DOCTYPE html>' +
    '<html lang="zh-CN"><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1.0">' +
    '<title>GitHub Download Proxy</title>' +
    '<style>' +
    '*{margin:0;padding:0;box-sizing:border-box}' +
    'body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#0d1117;color:#c9d1d9;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}' +
    '.c{max-width:680px;width:100%;text-align:center}' +
    'h1{color:#fff;font-size:2.2rem;margin-bottom:.4rem}' +
    'h1 span{color:#58a6ff}' +
    '.s{color:#8b949e;margin-bottom:1.5rem;font-size:.95rem}' +
    '.box{display:flex;gap:8px;margin-bottom:1.5rem}' +
    '.box input{flex:1;padding:12px 14px;border:1px solid #30363d;border-radius:8px;background:#161b22;color:#c9d1d9;font-size:1rem;outline:0}' +
    '.box input:focus{border-color:#58a6ff}' +
    '.box button{padding:12px 20px;border:0;border-radius:8px;background:#238636;color:#fff;font-size:1rem;font-weight:600;cursor:pointer}' +
    '.box button:hover{background:#2ea043}' +
    '.dl{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:1.5rem}' +
    '.dl a{display:block;padding:14px;background:#161b22;border:1px solid #30363d;border-radius:10px;color:#58a6ff;text-decoration:none;font-size:.9rem}' +
    '.dl a:hover{border-color:#58a6ff}' +
    '.dl a b{display:block;color:#fff;margin-bottom:4px;font-size:.95rem}' +
    '.tip{text-align:left;padding:14px 16px;background:#161b22;border:1px solid #f0883e;border-radius:8px;margin-bottom:1rem}' +
    '.tip h3{color:#f0883e;font-size:.9rem;margin-bottom:6px}' +
    '.tip p,.tip li{color:#8b949e;font-size:.82rem;line-height:1.6}' +
    '.tip ul{list-style:none;padding:0}' +
    '.tip code{background:#0d1117;padding:2px 6px;border-radius:3px;color:#79c0ff;font-size:.78rem}' +
    '.f{margin-top:1.5rem;font-size:.78rem;color:#484f58}' +
    '</style></head><body><div class="c">' +
    '<h1><span>⬇️</span> GitHub Download Proxy</h1>' +
    '<p class="s">Enter repo, get download link</p>' +
    '<div class="box">' +
    '  <input id="i" placeholder="owner/repo (e.g. vercel/next.js)" />' +
    '  <button onclick="go()">Generate</button>' +
    '</div>' +
    '<div class="dl" id="links" style="display:none">' +
    '  <a id="l1" target="_blank"><b>⬇️ Download ZIP</b><span id="t1"></span></a>' +
    '  <a id="l2" target="_blank"><b>📦 Browse</b><span id="t2"></span></a>' +
    '  <a id="l3" target="_blank"><b>🔌 API</b><span id="t3"></span></a>' +
    '  <a id="l4" target="_blank"><b>📄 Raw</b><span id="t4"></span></a>' +
    '</div>' +
    '<div class="tip">' +
    '  <h3>Usage</h3>' +
    '  <ul>' +
    '    <li>Enter owner/repo, click Generate</li>' +
    '    <li>aria2c: <code>aria2c -x 16 -s 16 -c "download_url"</code></li>' +
    '  </ul>' +
    '</div>' +
    '<p class="f">Vercel Hobby</p>' +
    '</div>' +
    '<script>' +
    'function go(){' +
    '  var v=document.getElementById("i").value.trim();' +
    '  if(!v)return;' +
    '  v=v.replace(/^https?:\/\//,"").replace(/^[^/]+/,"");' +
    '  var p=v.split("/");if(p.length<2)return alert("Format: owner/repo");' +
    '  var owner=p[0],repo=p[1];' +
    '  var base="https://"+location.host+"/";' +
    '  var zip=base+"github.com/"+owner+"/"+repo+"/archive/refs/heads/main.zip";' +
    '  var browse=base+"github.com/"+owner+"/"+repo;' +
    '  var api=base+"api.github.com/repos/"+owner+"/"+repo;' +
    '  var raw=base+"raw.githubusercontent.com/"+owner+"/"+repo+"/main/README.md";' +
    '  document.getElementById("l1").href=zip;document.getElementById("t1").textContent=zip;' +
    '  document.getElementById("l2").href=browse;document.getElementById("t2").textContent=browse;' +
    '  document.getElementById("l3").href=api;document.getElementById("t3").textContent=api;' +
    '  document.getElementById("l4").href=raw;document.getElementById("t4").textContent=raw;' +
    '  document.getElementById("links").style.display="grid";' +
    '}' +
    'document.getElementById("i").addEventListener("keydown",function(e){if(e.key==="Enter")go()});' +
    '</script></body></html>';
}

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

    if (rawPath === '/' || rawPath === '') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(getNavPage(req.headers.host));
    }

    var qIdx = rawPath.indexOf('?');
    var pathOnly = qIdx >= 0 ? rawPath.substring(0, qIdx) : rawPath;
    var queryStr = qIdx >= 0 ? rawPath.substring(qIdx) : '';

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

    var headers = {};
    var reqHeaders = req.headers;
    for (var key in reqHeaders) {
      if (!reqHeaders.hasOwnProperty(key)) continue;
      var low = key.toLowerCase();
      if (low === 'host' || low === 'cf-connecting-ip' || low === 'x-vercel-id' || low === 'connection' || low === 'content-length') continue;
      headers[key] = reqHeaders[key];
    }
    headers['Host'] = targetHost;
    headers['Origin'] = 'https://' + targetHost;
    headers['Referer'] = 'https://' + targetHost + '/';
    if (!headers['User-Agent']) {
      headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
    }

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

    var respHeaders = {};
    upstreamRes.headers.forEach(function(val, key) {
      var low = key.toLowerCase();
      if (low === 'content-encoding' || low === 'transfer-encoding' || low === 'content-security-policy' || low === 'content-security-policy-report-only' || low === 'clear-site-data') return;
      respHeaders[key] = val;
    });
    respHeaders['Access-Control-Allow-Origin'] = '*';
    delete respHeaders['access-control-allow-credentials'];

    var contentType = (respHeaders['Content-Type'] || '').toLowerCase();

    if (contentType.indexOf('text/html') >= 0) {
      var html = await upstreamRes.text();
      html = replaceText(html);

      res.writeHead(status, Object.assign({}, respHeaders, { 'Content-Type': 'text/html; charset=utf-8' }));
      return res.end(html);
    }

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
