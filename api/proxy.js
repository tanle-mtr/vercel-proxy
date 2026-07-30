// api/proxy.js - Vercel GitHub Proxy + Download Button (iframe bridge approach)
// Strategy: For repo pages, return a lightweight bridge page with iframe + floating download button.
// The button is on OUR page (not GitHub's), so CSP/SPA cannot block it.

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

// ========== BRIDGE PAGE: iframe + floating download button ==========
// This page is served at /github.com/owner/repo
// It loads the REAL GitHub page in an iframe, and puts a download button on top.
function getBridgePage(owner, repo, branch, fullProxyPath) {
  var zipUrl = '/github.com/' + owner + '/' + repo + '/archive/refs/heads/' + branch + '.zip';
  var apiUrl = '/api.github.com/repos/' + owner + '/' + repo;
  var rawUrl = '/raw.githubusercontent.com/' + owner + '/' + repo + '/' + branch + '/README.md';
  var browseUrl = '/github.com/' + owner + '/' + repo;

  return '<!DOCTYPE html>' +
    '<html lang="en"><head>' +
    '<meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1.0">' +
    '<title>' + owner + '/' + repo + ' - GitHub Proxy</title>' +
    '<style>' +
    '*{margin:0;padding:0;box-sizing:border-box}' +
    'body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#fff;overflow:hidden;height:100vh}' +
    // Top bar
    '.topbar{position:fixed;top:0;left:0;right:0;height:48px;background:#24292e;z-index:999999;display:flex;align-items:center;padding:0 14px;gap:10px;color:#fff;font-size:13px;box-shadow:0 2px 8px rgba(0,0,0,0.3)}' +
    '.topbar a{color:#58a6ff;text-decoration:none;font-weight:600}' +
    '.topbar a:hover{text-decoration:underline}' +
    '.topbar .sep{color:#484f58}' +
    '.topbar .spacer{flex:1}' +
    // Download button (top bar, always visible)
    '.dl-btn{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;background:#2ea043;color:#fff;border:1px solid rgba(240,246,252,0.1);border-radius:6px;font-size:13px;font-weight:600;text-decoration:none;cursor:pointer;transition:background 0.15s}' +
    '.dl-btn:hover{background:#3fb950}' +
    '.dl-btn svg{width:16px;height:16px;fill:currentColor}' +
    // Secondary buttons
    '.sec-btn{display:inline-flex;align-items:center;gap:5px;padding:5px 10px;background:#21262d;color:#c9d1d9;border:1px solid #30363d;border-radius:6px;font-size:12px;text-decoration:none;cursor:pointer;transition:all 0.15s}' +
    '.sec-btn:hover{background:#30363d;border-color:#8b949e;color:#fff}' +
    // Iframe
    '.frame{position:fixed;top:48px;left:0;right:0;bottom:0;width:100%;height:calc(100vh - 48px);border:0}' +
    // Floating button (bottom-right) - extra visibility
    '.fab{position:fixed;bottom:24px;right:24px;z-index:999999;display:flex;align-items:center;gap:8px;padding:12px 20px;background:#2ea043;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;text-decoration:none;box-shadow:0 4px 16px rgba(46,160,67,0.4);transition:all 0.2s}' +
    '.fab:hover{background:#3fb950;transform:translateY(-2px);box-shadow:0 6px 20px rgba(46,160,67,0.5)}' +
    '.fab svg{width:18px;height:18px;fill:currentColor}' +
    // Toast
    '.toast{position:fixed;bottom:80px;right:24px;z-index:999999;background:#161b22;color:#c9d1d9;padding:12px 18px;border:1px solid #30363d;border-radius:8px;font-size:13px;box-shadow:0 4px 12px rgba(0,0,0,0.3);opacity:0;transform:translateY(10px);transition:all 0.3s;pointer-events:none}' +
    '.toast.show{opacity:1;transform:translateY(0)}' +
    '.toast a{color:#58a6ff;text-decoration:none}' +
    '.toast a:hover{text-decoration:underline}' +
    '</style></head><body>' +
    // Top bar
    '<div class="topbar">' +
    '  <span style="color:#8b949e;font-size:12px">GitHub Proxy</span>' +
    '  <span class="sep">|</span>' +
    '  <a href="' + browseUrl + '" target="_blank">' + owner + '/' + repo + '</a>' +
    '  <span style="color:#8b949e;font-size:12px">@' + branch + '</span>' +
    '  <span class="spacer"></span>' +
    '  <a class="sec-btn" href="' + apiUrl + '" target="_blank" title="View API JSON">🔌 API</a>' +
    '  <a class="sec-btn" href="' + rawUrl + '" target="_blank" title="View README raw">📄 Raw</a>' +
    '  <a class="dl-btn" href="' + zipUrl + '" target="_blank" download>' +
    '    <svg viewBox="0 0 16 16"><path d="M7.47 10.78a.75.75 0 001.06 0l3.75-3.75a.75.75 0 00-1.06-1.06L8.75 8.44V1.75a.75.75 0 00-1.5 0v6.69L4.78 5.97a.75.75 0 00-1.06 1.06l3.75 3.75zM2.75 13.5a.75.75 0 000 1.5h10.5a.75.75 0 000-1.5H2.75z"/></svg>' +
    '    Download ZIP' +
    '  </a>' +
    '</div>' +
    // Iframe with real GitHub page
    '<iframe class="frame" src="' + browseUrl + '" allow="fullscreen"></iframe>' +
    // Floating Action Button (bottom-right)
    '<a class="fab" href="' + zipUrl + '" target="_blank" download id="fabBtn">' +
    '  <svg viewBox="0 0 16 16"><path d="M7.47 10.78a.75.75 0 001.06 0l3.75-3.75a.75.75 0 00-1.06-1.06L8.75 8.44V1.75a.75.75 0 00-1.5 0v6.69L4.78 5.97a.75.75 0 00-1.06 1.06l3.75 3.75zM2.75 13.5a.75.75 0 000 1.5h10.5a.75.75 0 000-1.5H2.75z"/></svg>' +
    '  Download Source (' + branch + '.zip)' +
    '</a>' +
    // Toast for copy feedback
    '<div class="toast" id="toast"></div>' +
    '<script>' +
    '(function(){' +
    '  var fab=document.getElementById("fabBtn");' +
    '  var toast=document.getElementById("toast");' +
    '  // Pulse animation to draw attention' +
    '  var pulse=setInterval(function(){' +
    '    fab.style.transform="scale(1.05)";' +
    '    setTimeout(function(){fab.style.transform="scale(1)"},300);' +
    '  },2000);' +
    '  setTimeout(function(){clearInterval(pulse)},10000);' +
    '  // Show toast on click' +
    '  fab.addEventListener("click",function(){' +
    '    toast.innerHTML="⬇️ Downloading ' + branch + '.zip ...<br><span style=color:#8b949e;font-size:11px>Save file or copy link to aria2c</span>";' +
    '    toast.classList.add("show");' +
    '    setTimeout(function(){toast.classList.remove("show")},4000);' +
    '  });' +
    '})();' +
    '</script></body></html>';
}

// ========== NAV PAGE ==========
function getNavPage() {
  return '<!DOCTYPE html>' +
    '<html lang="en"><head>' +
    '<meta charset="UTF-8">' +
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
    '.dl a{display:block;padding:14px;background:#161b22;border:1px solid #30363d;border-radius:10px;color:#58a6ff;text-decoration:none;font-size:.9rem;transition:all .15s}' +
    '.dl a:hover{border-color:#58a6ff;transform:translateY(-2px)}' +
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
    '  <a id="l2" target="_blank"><b>📦 Browse (proxy)</b><span id="t2"></span></a>' +
    '  <a id="l3" target="_blank"><b>🔌 API Info</b><span id="t3"></span></a>' +
    '  <a id="l4" target="_blank"><b>📄 Raw README</b><span id="t4"></span></a>' +
    '</div>' +
    '<div class="tip">' +
    '  <h3>Usage</h3>' +
    '  <ul>' +
    '    <li>Enter owner/repo, click Generate</li>' +
    '    <li>aria2c: <code>aria2c -x 16 -s 16 -c "download_url"</code></li>' +
    '    <li>Browse mode shows GitHub in an iframe with a floating download button</li>' +
    '  </ul>' +
    '</div>' +
    '<p class="f">Vercel Hobby</p>' +
    '</div>' +
    '<script>' +
    'function go(){' +
    '  var v=document.getElementById("i").value.trim();' +
    '  if(!v)return;' +
    '  v=v.replace(/^https?:\\/\\//,"").replace(/^[^/]+/,"");' +
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

// ========== HELPERS ==========
function extractRepoPath(path) {
  // /github.com/owner/repo[/...] -> {owner, repo, rest}
  var m = path.match(/^\/github\.com\/([^\/]+)\/([^\/]+)(\/.*)?$/);
  if (!m) return null;
  return { owner: m[1], repo: m[2], rest: m[3] || '/' };
}

function extractBranch(path) {
  // /github.com/owner/repo/tree/branch/...
  var m = path.match(/\/tree\/([^\/]+)/);
  if (m) return m[1];
  // /github.com/owner/repo/archive/...
  var m2 = path.match(/\/archive\/refs\/heads\/([^\/]+)/);
  if (m2) return m2[1];
  return 'main';
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

// ========== MAIN HANDLER ==========
module.exports = async function handler(req, res) {
  try {
    var rawPath = req.url || '/';

    // Root -> nav page
    if (rawPath === '/' || rawPath === '') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(getNavPage());
    }

    // Split path and query
    var qIdx = rawPath.indexOf('?');
    var pathOnly = qIdx >= 0 ? rawPath.substring(0, qIdx) : rawPath;
    var queryStr = qIdx >= 0 ? rawPath.substring(qIdx) : '';

    // Check if it's a GitHub repo page request
    // /github.com/owner/repo[/...]
    var repoInfo = extractRepoPath(pathOnly);

    if (repoInfo) {
      // This is a repo page -> serve bridge page with iframe + download button
      var branch = extractBranch(pathOnly);
      var html = getBridgePage(repoInfo.owner, repoInfo.repo, branch, pathOnly);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(html);
    }

    // For all other proxy paths, fetch from upstream
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
      // Not a proxy path -> nav page
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(getNavPage());
    }

    var targetHost = matched.substring(1);
    var remainingPath = pathOnly.substring(matched.length);
    if (remainingPath === '') remainingPath = '/';

    var upstreamUrl = 'https://' + targetHost + remainingPath + queryStr;

    // Build headers
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
      headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
    }

    // Fetch options
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

    // Handle redirects
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

    // Collect response headers
    var respHeaders = {};
    upstreamRes.headers.forEach(function(val, key) {
      var low = key.toLowerCase();
      if (low === 'content-encoding' || low === 'transfer-encoding' || low === 'content-security-policy' || low === 'content-security-policy-report-only' || low === 'clear-site-data') return;
      respHeaders[key] = val;
    });
    respHeaders['Access-Control-Allow-Origin'] = '*';
    delete respHeaders['access-control-allow-credentials'];

    var contentType = (respHeaders['Content-Type'] || '').toLowerCase();

    // HTML -> text replace only (no injection)
    if (contentType.indexOf('text/html') >= 0) {
      var html = await upstreamRes.text();
      html = replaceText(html);
      res.writeHead(status, Object.assign({}, respHeaders, { 'Content-Type': 'text/html; charset=utf-8' }));
      return res.end(html);
    }

    // Non-HTML -> collect into Buffer and send (max compat with Vercel Node runtime)
    res.writeHead(status, respHeaders);
    if (upstreamRes.body) {
      var _chunks = [];
      var _reader = upstreamRes.body.getReader();
      while (true) {
        var _r = await _reader.read();
        if (_r.done) break;
        _chunks.push(Buffer.from(_r.value));
      }
      res.write(Buffer.concat(_chunks));
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
