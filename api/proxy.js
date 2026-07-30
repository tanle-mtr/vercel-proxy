// api/proxy.js - Final working version
// Two modes:
//   1) GET /              -> Nav page (enter owner/repo, get links)
//   2) GET /go/owner/repo  -> Iframe wrapper with download button
//   3) GET /raw/github.com/... -> Direct proxy (no modification)

module.exports = async function handler(req, res) {
  try {
    var rawPath = req.url || '/';

    // === ROUTE 1: Root -> Navigation Page ===
    if (rawPath === '/' || rawPath === '') {
      return sendNavPage(res);
    }

    // === ROUTE 2: /go/owner/repo -> Iframe wrapper ===
    if (rawPath.indexOf('/go/') === 0) {
      var repoPath = rawPath.substring(4); // remove /go/
      var qIdx = repoPath.indexOf('?');
      if (qIdx >= 0) repoPath = repoPath.substring(0, qIdx);
      return sendFramePage(res, repoPath);
    }

    // === ROUTE 3: Direct proxy for assets, api, raw, archive ===
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
      // Unknown path -> show nav page
      return sendNavPage(res);
    }

    // Build upstream URL
    var targetHost = matched.substring(1);
    var remainingPath = rawPath.substring(matched.length);
    if (remainingPath === '') remainingPath = '/';

    var upstreamUrl = 'https://' + targetHost + remainingPath;
    var queryIdx = req.url.indexOf('?');
    if (queryIdx >= 0) upstreamUrl += req.url.substring(queryIdx);

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
    headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

    var fetchOpts = { method: req.method, headers: headers, redirect: 'manual' };

    var upstreamRes = await fetch(upstreamUrl, fetchOpts);
    var status = upstreamRes.status;

    // Handle redirects
    if (status >= 300 && status < 400) {
      var loc = upstreamRes.headers.get('location') || '';
      res.writeHead(status, { 'Location': loc });
      return res.end();
    }

    // Copy response headers
    var respHeaders = {};
    upstreamRes.headers.forEach(function(val, key) {
      var low = key.toLowerCase();
      if (low === 'content-encoding' || low === 'transfer-encoding' || low === 'content-security-policy' || low === 'x-frame-options' || low === 'frame-options') return;
      respHeaders[key] = val;
    });
    respHeaders['Access-Control-Allow-Origin'] = '*';

    res.writeHead(status, respHeaders);

    // Stream body
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

// === Navigation Page ===
function sendNavPage(res) {
  var html =
    '<!DOCTYPE html>' +
    '<html lang="en"><head>' +
    '<meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1.0">' +
    '<title>GitHub Proxy</title>' +
    '<style>' +
    '*{margin:0;padding:0;box-sizing:border-box}' +
    'body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#0d1117;color:#c9d1d9;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}' +
    '.c{max-width:600px;width:100%;text-align:center}' +
    'h1{color:#fff;font-size:2.2rem;margin-bottom:.3rem}' +
    'h1 span{color:#58a6ff}' +
    '.sub{color:#8b949e;margin-bottom:1.5rem;font-size:.95rem}' +
    '.box{display:flex;gap:8px;margin-bottom:1.5rem}' +
    '.box input{flex:1;padding:12px 14px;border:1px solid #30363d;border-radius:8px;background:#161b22;color:#fff;font-size:1rem;outline:0}' +
    '.box input:focus{border-color:#58a6ff}' +
    '.box button{padding:12px 24px;border:0;border-radius:8px;background:#238636;color:#fff;font-size:1rem;font-weight:600;cursor:pointer}' +
    '.box button:hover{background:#2ea043}' +
    '.tip{margin-top:1rem;padding:12px 16px;background:#161b22;border:1px solid #30363d;border-radius:8px;text-align:left}' +
    '.tip h3{color:#f0883e;font-size:.9rem;margin-bottom:6px}' +
    '.tip p,.tip li{color:#8b949e;font-size:.82rem;line-height:1.6}' +
    '.tip ul{list-style:none;padding:0}' +
    '.tip code{background:#0d1117;padding:2px 6px;border-radius:3px;color:#79c0ff;font-size:.78rem}' +
    '.footer{margin-top:1.5rem;font-size:.78rem;color:#484f58}' +
    '</style></head><body><div class="c">' +
    '<h1><span>&#11015;</span> GitHub Proxy</h1>' +
    '<p class="sub">Enter a repo to open it with a download button</p>' +
    '<div class="box">' +
    '  <input id="i" placeholder="owner/repo (e.g. vercel/next.js)" autofocus />' +
    '  <button onclick="go()">Open</button>' +
    '</div>' +
    '<div class="tip">' +
    '  <h3>How it works</h3>' +
    '<ul>' +
    '    <li>Enter <code>tanle-mtr/vercel-proxy</code> and click Open</li>' +
    '    <li>A page opens with GitHub in an iframe + a download button</li>' +
    '    <li>The button is on YOUR domain, so it always works</li>' +
    '  </ul>' +
    '</div>' +
    '<p class="footer">Vercel Hobby</p>' +
    '</div>' +
    '<script>' +
    'function go(){' +
    '  var v=document.getElementById("i").value.trim();' +
    '  if(!v)return;' +
    '  v=v.replace(/^https?:\\/\\//,"").replace(/^github\\.com\\//,"");' +
    '  var parts=v.split("/");' +
    '  if(parts.length<2)return alert("Need owner/repo");' +
    '  var url="https://"+location.host+"/go/"+parts[0]+"/"+parts[1];' +
    '  location.href=url;' +
    '}' +
    'document.getElementById("i").addEventListener("keydown",function(e){if(e.key==="Enter")go()});' +
    '</script></body></html>';

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

// === Iframe Wrapper Page (with download button) ===
function sendFramePage(res, repoPath) {
  // repoPath like "owner/repo" or "owner/repo/tree/branch"
  var parts = repoPath.split('/');
  var owner = parts[0] || 'unknown';
  var repo = parts[1] || 'unknown';

  // Extract branch
  var branch = 'main';
  var treeIdx = repoPath.indexOf('/tree/');
  if (treeIdx >= 0) {
    var afterTree = repoPath.substring(treeIdx + 6);
    var branchEnd = afterTree.indexOf('/');
    branch = branchEnd >= 0 ? afterTree.substring(0, branchEnd) : afterTree;
  }

  var githubUrl = 'https://github.com/' + owner + '/' + repo;
  var zipUrl = '/' + owner + '/' + repo + '/archive/refs/heads/' + branch + '.zip';

  var html =
    '<!DOCTYPE html>' +
    '<html lang="en"><head>' +
    '<meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1.0">' +
    '<title>' + owner + '/' + repo + ' - Proxy</title>' +
    '<style>' +
    '*{margin:0;padding:0}' +
    'body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;overflow:hidden;height:100vh}' +
    // Top bar
    '.bar{position:fixed;top:0;left:0;right:0;height:48px;background:#161b22;border-bottom:1px solid #30363d;display:flex;align-items:center;padding:0 16px;gap:12px;z-index:2147483647}' +
    '.bar a{color:#58a6ff;text-decoration:none;font-size:13px;font-weight:600}' +
    '.bar a:hover{text-decoration:underline}' +
    '.bar .sep{color:#484f58;font-size:14px}' +
    '.bar .repo{color:#c9d1d9;font-size:13px;font-weight:600}' +
    '.bar .branch{color:#8b949e;font-size:12px}' +
    '.bar .spacer{flex:1}' +
    // Buttons
    '.btn{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;cursor:pointer}' +
    '.btn-green{background:#238636;color:#fff}' +
    '.btn-green:hover{background:#2ea043}' +
    '.btn-blue{background:#1f6feb;color:#fff}' +
    '.btn-blue:hover{background:#388bfd}' +
    // Iframe
    'iframe{position:fixed;top:48px;left:0;width:100%;height:calc(100vh - 48px);border:0;background:#fff}' +
    '</style></head><body>' +
    // Top bar (always visible, on your domain)
    '<div class="bar">' +
    '  <a href="/">&#8592; Home</a>' +
    '  <span class="sep">|</span>' +
    '  <span class="repo">' + owner + '/' + repo + '</span>' +
    '  <span class="sep">|</span>' +
    '  <span class="branch">&#127800; ' + branch + '</span>' +
    '  <span class="spacer"></span>' +
    '  <a class="btn btn-blue" href="/api.github.com/repos/' + owner + '/' + repo + '" target="_blank">&#128268; API</a>' +
    '  <a class="btn btn-green" href="' + zipUrl + '" target="_blank">&#11015; Download (' + branch + '.zip)</a>' +
    '</div>' +
    // Iframe with GitHub page
    '<iframe src="' + githubUrl + '" allowfullscreen></iframe>' +
    '</body></html>';

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}
