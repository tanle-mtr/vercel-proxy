// api/proxy.js - Final Stable Version
// Strategy: Inject a pure HTML/CSS download bar into GitHub pages
// No JavaScript injection (blocked by GitHub CSP)
// Uses only inline style attributes (allowed by GitHub CSP: style-src 'unsafe-inline')

const ALLOWED_HOSTS = [
  'github.com',
  'api.github.com',
  'raw.githubusercontent.com',
  'codeload.github.com',
  'objects.githubusercontent.com',
  'camo.githubusercontent.com',
  'avatars.githubusercontent.com'
];

function isAllowedHost(host) {
  for (var i = 0; i < ALLOWED_HOSTS.length; i++) {
    if (host === ALLOWED_HOSTS[i]) return true;
    if (host.endsWith('.' + ALLOWED_HOSTS[i])) return true;
  }
  return false;
}

// Extract owner/repo from path like /owner/repo/...
function extractRepo(path) {
  var m = path.match(/^\/([^\/]+)\/([^\/]+)(\/.*)?$/);
  if (!m) return null;
  return { owner: m[1], repo: m[2] };
}

// Extract branch from path like /owner/repo/tree/branch/...
function extractBranch(path) {
  var m = path.match(/\/tree\/([^\/]+)/);
  if (m) return m[1];
  // Also check for /blob/branch/file
  var m2 = path.match(/\/blob\/([^\/]+)/);
  if (m2) return m2[1];
  return 'main';
}

// Navigation page (root path)
function getNavPage() {
  return '<!DOCTYPE html>'
    + '<html lang="en"><head><meta charset="UTF-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1.0">'
    + '<title>GitHub Download Proxy</title>'
    + '<style>'
    + '*{margin:0;padding:0;box-sizing:border-box}'
    + 'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#0d1117;color:#c9d1d9;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}'
    + '.c{max-width:680px;width:100%;text-align:center}'
    + 'h1{color:#fff;font-size:2.2rem;margin-bottom:.4rem}'
    + 'h1 span{color:#58a6ff}'
    + '.s{color:#8b949e;margin-bottom:1.5rem;font-size:.95rem}'
    + '.box{display:flex;gap:8px;margin-bottom:1.5rem}'
    + '.box input{flex:1;padding:12px 14px;border:1px solid #30363d;border-radius:8px;background:#161b22;color:#c9d1d9;font-size:1rem;outline:0}'
    + '.box input:focus{border-color:#58a6ff}'
    + '.box button{padding:12px 20px;border:0;border-radius:8px;background:#238636;color:#fff;font-size:1rem;font-weight:600;cursor:pointer}'
    + '.box button:hover{background:#2ea043}'
    + '.result{margin-top:1rem;text-align:left;padding:14px;background:#161b22;border:1px solid #30363d;border-radius:8px;display:none}'
    + '.result a{color:#58a6ff;text-decoration:none;word-break:break-all;font-size:.85rem}'
    + '.result a:hover{text-decoration:underline}'
    + '.tip{text-align:left;padding:14px 16px;background:#161b22;border:1px solid #f0883e;border-radius:8px;margin-top:1rem}'
    + '.tip h3{color:#f0883e;font-size:.9rem;margin-bottom:6px}'
    + '.tip p,.tip li{color:#8b949e;font-size:.82rem;line-height:1.6}'
    + '.tip ul{list-style:none;padding:0}'
    + '.tip code{background:#0d1117;padding:2px 6px;border-radius:3px;color:#79c0ff;font-size:.78rem}'
    + '.f{margin-top:1.5rem;font-size:.78rem;color:#484f58}'
    + '</style></head><body><div class="c">'
    + '<h1><span>⬇</span> GitHub Download Proxy</h1>'
    + '<p class="s">Enter a repo to get a high-speed download link</p>'
    + '<div class="box">'
    + '  <input id="i" placeholder="owner/repo (e.g. vercel/next.js)" />'
    + '  <button onclick="go()">Generate</button>'
    + '</div>'
    + '<div class="result" id="r">'
    + '  <p style="color:#8b949e;font-size:.8rem;margin-bottom:8px">Download Link:</p>'
    + '  <a id="link" target="_blank"></a>'
    + '</div>'
    + '<div class="tip">'
    + '  <h3>How to use</h3>'
    + '  <ul>'
    + '    <li>Enter <code>owner/repo</code> and click Generate</li>'
    + '    <li>aria2c: <code>aria2c -x 16 -s 16 -c "download_url"</code></li>'
    + '    <li>Or visit <code>/github.com/owner/repo</code> directly</li>'
    + '  </ul>'
    + '</div>'
    + '<p class="f">Vercel Hobby | 1M req/month | 100GB bandwidth</p>'
    + '</div>'
    + '<script>'
    + 'function go(){'
    + '  var v=document.getElementById("i").value.trim();'
    + '  if(!v)return;'
    + '  if(v.indexOf("github.com/")>=0)v=v.split("github.com/")[1].replace(/^[/]+/,"");'
    + '  v=v.replace(/^https?:\\/\\//,"").replace(/^[/]+/,"");'
    + '  var p=v.split("/");if(p.length<2)return alert("Format: owner/repo");'
    + '  var owner=p[0],repo=p[1];'
    + '  var url="https://"+location.host+"/github.com/"+owner+"/"+repo+"/archive/refs/heads/main.zip";'
    + '  var r=document.getElementById("r");'
    + '  var a=document.getElementById("link");'
    + '  a.href=url;a.textContent=url;'
    + '  r.style.display="block";'
    + '}'
    + 'document.getElementById("i").addEventListener("keydown",function(e){if(e.key==="Enter")go()});'
    + '</script></body></html>';
}

// Build the download bar HTML (pure HTML + inline CSS, no JS)
// This is inserted server-side into the GitHub page
function buildDownloadBar(owner, repo, branch) {
  var zipUrl = '/github.com/' + owner + '/' + repo + '/archive/refs/heads/' + branch + '.zip';

  // Pure HTML/CSS - no JavaScript at all
  // Uses inline style attributes (allowed by GitHub CSP)
  // Uses CSS :hover via a <style> tag in the bar itself
  // But style tags might be blocked... so we use a different approach:
  // We use the :hover pseudo-class on the <a> tag via inline styles
  // Actually, :hover cannot be done inline. But we can use a simple
  // approach: just have the button always look "hovered" (brighter green)

  return '<div style="'
    + 'position:fixed;'
    + 'top:0;'
    + 'left:0;'
    + 'right:0;'
    + 'z-index:2147483647;'
    + 'background:#24292e;'
    + 'color:#fff;'
    + 'padding:8px 16px;'
    + 'font-family:-apple-system,BlinkMacSystemFont,sans-serif;'
    + 'font-size:14px;'
    + 'display:flex;'
    + 'align-items:center;'
    + 'justify-content:center;'
    + 'gap:12px;'
    + 'box-shadow:0 2px 8px rgba(0,0,0,0.4);'
    + 'height:44px;'
    + '">'
    + '<span style="color:#c9d1d9;font-weight:500;">'
    +   '&#128230; ' + owner + '/' + repo
    + '</span>'
    + '<span style="color:#484f58;">|</span>'
    + '<span style="color:#8b949e;">'
    +   '&#127807; ' + branch
    + '</span>'
    + '<a href="' + zipUrl + '" target="_blank" rel="noopener" style="'
    +   'display:inline-flex;'
    +   'align-items:center;'
    +   'gap:6px;'
    +   'background:#2ea043;'
    +   'color:#ffffff;'
    +   'padding:6px 16px;'
    +   'border-radius:6px;'
    +   'text-decoration:none;'
    +   'font-weight:600;'
    +   'font-size:13px;'
    +   'border:1px solid rgba(240,246,252,0.1);'
    +   '">'
    +   '&#11015; Download Source (' + branch + '.zip)'
    + '</a>'
    + '</div>'
    + '<div style="height:44px;"></div>';
}

// Text replacement: convert absolute GitHub URLs to proxy-relative URLs
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

// Main handler
module.exports = async function handler(req, res) {
  try {
    var rawPath = req.url || '/';

    // Root path → navigation page
    if (rawPath === '/' || rawPath === '') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(getNavPage());
    }

    // Split path and query
    var qIdx = rawPath.indexOf('?');
    var pathOnly = qIdx >= 0 ? rawPath.substring(0, qIdx) : rawPath;
    var queryStr = qIdx >= 0 ? rawPath.substring(qIdx) : '';

    // Match against allowed prefixes
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

    // Non-proxy path → navigation page
    if (!matched) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(getNavPage());
    }

    var targetHost = matched.substring(1);
    var remainingPath = pathOnly.substring(matched.length);
    if (remainingPath === '') remainingPath = '/';

    var upstreamUrl = 'https://' + targetHost + remainingPath + queryStr;

    // Build request headers
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

    // Handle request body
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

    // Fetch from upstream
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
      if (low === 'content-encoding' || low === 'transfer-encoding'
          || low === 'content-security-policy' || low === 'content-security-policy-report-only'
          || low === 'clear-site-data' || low === 'x-frame-options') return;
      respHeaders[key] = val;
    });
    respHeaders['Access-Control-Allow-Origin'] = '*';
    delete respHeaders['access-control-allow-credentials'];

    var contentType = (respHeaders['Content-Type'] || '').toLowerCase();

    // HTML pages: inject download bar + text replacement
    if (contentType.indexOf('text/html') >= 0) {
      var html = await upstreamRes.text();
      html = replaceText(html);

      // Inject download bar for github.com repo pages
      if (targetHost === 'github.com') {
        var repoInfo = extractRepo(remainingPath);
        if (repoInfo) {
          var branch = extractBranch(remainingPath);
          var bar = buildDownloadBar(repoInfo.owner, repoInfo.repo, branch);
          // Insert after <body> tag (not using </head> since we don't need JS)
          html = html.replace(/(<body[^>]*>)/i, '$1' + bar);
        }
      }

      res.writeHead(status, Object.assign({}, respHeaders, { 'Content-Type': 'text/html; charset=utf-8' }));
      return res.end(html);
    }

    // Non-HTML: stream directly
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
