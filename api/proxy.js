// api/proxy.js - Vercel GitHub Proxy (Node.js Runtime, stable)
// No DOM injection. No fetch/XHR hijacking. Clean reverse proxy + nav page.

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
  for (var i = 0; i < ALLOWED.length; i++) {
    if (h === ALLOWED[i] || h.endsWith('.' + ALLOWED[i])) return true;
  }
  return false;
}

// ============ NAV PAGE ============
function getNavPage(host) {
  var h = '<!DOCTYPE html>';
  h += '<html lang="en"><head><meta charset="UTF-8">';
  h += '<meta name="viewport" content="width=device-width,initial-scale=1.0">';
  h += '<title>GitHub Download Proxy</title>';
  h += '<style>';
  h += '*{margin:0;padding:0;box-sizing:border-box}';
  h += 'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#0d1117;color:#c9d1d9;min-height:100vh;padding:24px}';
  h += '.wrap{max-width:720px;margin:40px auto}';
  h += 'h1{color:#fff;font-size:2rem;margin-bottom:.4rem}';
  h += 'h1 em{color:#58a6ff;font-style:normal}';
  h += '.sub{color:#8b949e;margin-bottom:1.5rem;font-size:.95rem}';
  h += '.card{background:#161b22;border:1px solid #30363d;border-radius:10px;padding:20px;margin-bottom:14px}';
  h += '.card h3{color:#58a6ff;margin-bottom:8px;font-size:1rem}';
  h += '.card p{color:#8b949e;font-size:.85rem;line-height:1.6}';
  h += '.card code{background:#0d1117;padding:2px 6px;border-radius:3px;color:#79c0ff;font-size:.8rem}';
  h += '.row{display:flex;gap:8px;margin-top:12px}';
  h += '.row input{flex:1;padding:12px 14px;border:1px solid #30363d;border-radius:8px;background:#0d1117;color:#c9d1d9;font-size:1rem;outline:0}';
  h += '.row input:focus{border-color:#58a6ff}';
  h += '.row button{padding:12px 20px;border:0;border-radius:8px;background:#238636;color:#fff;font-size:1rem;font-weight:600;cursor:pointer}';
  h += '.row button:hover{background:#2ea043}';
  h += '.btns{display:none;flex-wrap:wrap;gap:10px;margin-top:14px}';
  h += '.btns a{padding:10px 16px;background:#238636;color:#fff;text-decoration:none;border-radius:8px;font-size:.88rem;font-weight:600}';
  h += '.btns a:hover{background:#2ea043}';
  h += '.btns a.alt{background:#21262d;border:1px solid #30363d;color:#c9d1d9}';
  h += '.btns a.alt:hover{background:#30363d}';
  h += '.tip{margin-top:14px;padding:14px;background:#1c2128;border:1px solid #f0883e;border-radius:8px}';
  h += '.tip h3{color:#f0883e;font-size:.88rem;margin-bottom:6px}';
  h += '.tip li{color:#8b949e;font-size:.82rem;line-height:1.6;margin-left:18px}';
  h += '.tip code{background:#0d1117;padding:2px 6px;border-radius:3px;color:#79c0ff;font-size:.78rem}';
  h += '.ft{margin-top:2rem;font-size:.78rem;color:#484f58;text-align:center}';
  h += '</style></head><body><div class="wrap">';
  h += '<h1><em>&#11015;</em> GitHub Download Proxy</h1>';
  h += '<p class="sub">Enter a GitHub repo to get a high-speed download link</p>';
  h += '<div class="card">';
  h += '  <h3>&#128190; Download Source Code</h3>';
  h += '  <p>Enter <code>owner/repo</code> (e.g. <code>vercel/next.js</code>) and click Generate.</p>';
  h += '  <div class="row">';
  h += '    <input id="repo" placeholder="owner/repo" autofocus />';
  h += '    <button onclick="gen()">Generate</button>';
  h += '  </div>';
  h += '  <div class="btns" id="btns"></div>';
  h += '</div>';
  h += '<div class="card">';
  h += '  <h3>&#128209; Direct URL Format</h3>';
  h += '  <p>Replace <code>DOMAIN</code> with your Vercel domain:</p>';
  h += '  <p style="margin-top:8px"><code>https://DOMAIN/github.com/owner/repo/archive/refs/heads/main.zip</code></p>';
  h += '  <p style="margin-top:4px"><code>https://DOMAIN/github.com/owner/repo/releases/download/v1.0/file.zip</code></p>';
  h += '  <p style="margin-top:4px"><code>https://DOMAIN/raw.githubusercontent.com/owner/repo/branch/file</code></p>';
  h += '</div>';
  h += '<div class="tip">';
  h += '  <h3>&#128161; Tips</h3>';
  h += '  <ul>';
  h += '    <li>aria2c: <code>aria2c -x 16 -s 16 -c "DOWNLOAD_URL"</code></li>';
  h += '    <li>For browsing GitHub, use <code>github.com</code> directly</li>';
  h += '    <li>This proxy focuses on fast, reliable file downloads</li>';
  h += '  </ul>';
  h += '</div>';
  h += '<p class="ft">Vercel Hobby &middot; 1M req/month &middot; 100GB bandwidth</p>';
  h += '</div>';
  h += '<script>';
  h += 'function gen(){';
  h += '  var v=document.getElementById("repo").value.trim();';
  h += '  if(!v)return alert("Please enter owner/repo");';
  h += '  v=v.replace(/^https?:\\/\\//,"").replace(/^github\\.com\\//,"").replace(/^\\/+/,"");';
  h += '  var p=v.split("/");if(p.length<2)return alert("Format: owner/repo");';
  h += '  var o=p[0],r=p[1],b=p[2]||"main";';
  h += '  var base="https://"+location.host;';
  h += '  var zip=base+"/github.com/"+o+"/"+r+"/archive/refs/heads/"+b+".zip";';
  h += '  var browse=base+"/github.com/"+o+"/"+r;';
  h += '  var api=base+"/api.github.com/repos/"+o+"/"+r;';
  h += '  var raw=base+"/raw.githubusercontent.com/"+o+"/"+r+"/"+b+"/README.md";';
  h += '  document.getElementById("btns").innerHTML=';
  h += '    "<a href=\\""+zip+"\\" target=\\"_blank\\">&#11015; Download ZIP ("+b+")</a>"+';
  h += '    "<a href=\\""+browse+"\\" target=\\"_blank\\" class=\\"alt\\">&#128451; Browse</a>"+';
  h += '    "<a href=\\""+api+"\\" target=\\"_blank\\" class=\\"alt\\">&#128268; API</a>"+';
  h += '    "<a href=\\""+raw+"\\" target=\\"_blank\\" class=\\"alt\\">&#128196; Raw</a>";';
  h += '  document.getElementById("btns").style.display="flex";';
  h += '}';
  h += 'document.getElementById("repo").addEventListener("keydown",function(e){if(e.key==="Enter")gen()});';
  h += '</script></body></html>';
  return h;
}

// ============ TEXT REPLACE ============
function replaceText(t) {
  if (!t) return t;
  var rep = [
    ['https://github.com', '/github.com'],
    ['https://api.github.com', '/api.github.com'],
    ['https://raw.githubusercontent.com', '/raw.githubusercontent.com'],
    ['https://codeload.github.com', '/codeload.github.com'],
    ['https://objects.githubusercontent.com', '/objects.githubusercontent.com'],
    ['https://avatars.githubusercontent.com', '/avatars.githubusercontent.com'],
    ['https://camo.githubusercontent.com', '/camo.githubusercontent.com']
  ];
  for (var i = 0; i < rep.length; i++) {
    t = t.split(rep[i][0]).join(rep[i][1]);
  }
  return t;
}

// ============ HTTP REQUEST ============
var https = require('https');
var http = require('http');
var urlModule = require('url');

function httpRequest(upstreamUrl, headers, timeoutMs) {
  return new Promise(function(resolve, reject) {
    var parsed = urlModule.parse(upstreamUrl);
    var lib = parsed.protocol === 'https:' ? https : http;
    var opts = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.path,
      method: 'GET',
      headers: headers,
      timeout: timeoutMs || 30000
    };
    var req = lib.request(opts, function(res) {
      resolve(res);
    });
    req.on('error', reject);
    req.on('timeout', function() { req.destroy(new Error('timeout')); });
    req.end();
  });
}

// ============ MAIN HANDLER ============
module.exports = async function handler(req, res) {
  try {
    var rawPath = req.url || '/';

    // Root -> nav page
    if (rawPath === '/' || rawPath === '') {
      var navHtml = getNavPage(req.headers.host);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(Buffer.from(navHtml, 'utf-8'));
      return;
    }

    // Split path and query
    var qIdx = rawPath.indexOf('?');
    var pathOnly = qIdx >= 0 ? rawPath.substring(0, qIdx) : rawPath;
    var queryStr = qIdx >= 0 ? rawPath.substring(qIdx) : '';

    // Match whitelist prefix
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
      var nav2 = getNavPage(req.headers.host);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(Buffer.from(nav2, 'utf-8'));
      return;
    }

    var targetHost = matched.substring(1);
    var remainingPath = pathOnly.substring(matched.length);
    if (remainingPath === '') remainingPath = '/';

    var upstreamUrl = 'https://' + targetHost + remainingPath + queryStr;

    // Build headers
    var fwdHeaders = {};
    var reqHeaders = req.headers;
    for (var key in reqHeaders) {
      if (!reqHeaders.hasOwnProperty(key)) continue;
      var low = key.toLowerCase();
      if (low === 'host' || low === 'cf-connecting-ip' || low === 'x-vercel-id' ||
          low === 'connection' || low === 'content-length') continue;
      fwdHeaders[key] = reqHeaders[key];
    }
    fwdHeaders['Host'] = targetHost;
    fwdHeaders['Origin'] = 'https://' + targetHost;
    fwdHeaders['Referer'] = 'https://' + targetHost + '/';
    if (!fwdHeaders['User-Agent']) {
      fwdHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
    }

    // Upstream request
    var upstreamRes;
    try {
      upstreamRes = await httpRequest(upstreamUrl, fwdHeaders, 30000);
    } catch (err) {
      console.error('Upstream error:', err.message);
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end(Buffer.from('Bad Gateway: ' + err.message));
      return;
    }

    var status = upstreamRes.statusCode;

    // Handle redirects
    if (status >= 300 && status < 400) {
      var loc = upstreamRes.headers.location;
      upstreamRes.resume(); // drain
      if (loc) {
        try {
          var locUrl = new URL(loc, upstreamUrl);
          if (isAllowedHost(locUrl.hostname)) {
            var newLoc = '/' + locUrl.hostname + locUrl.pathname + locUrl.search;
            res.writeHead(status, { 'Location': newLoc });
            res.end(Buffer.from(''));
            return;
          }
        } catch (e) {}
      }
      res.writeHead(status, { 'Location': loc || '' });
      res.end(Buffer.from(''));
      return;
    }

    // Collect response headers
    var respHeaders = {};
    for (var hkey in upstreamRes.headers) {
      if (!upstreamRes.headers.hasOwnProperty(hkey)) continue;
      var hlow = hkey.toLowerCase();
      if (hlow === 'content-encoding' || hlow === 'transfer-encoding' ||
          hlow === 'content-security-policy' || hlow === 'content-security-policy-report-only' ||
          hlow === 'clear-site-data') continue;
      respHeaders[hkey] = upstreamRes.headers[hkey];
    }
    respHeaders['Access-Control-Allow-Origin'] = '*';
    delete respHeaders['access-control-allow-credentials'];

    var contentType = (respHeaders['Content-Type'] || '').toLowerCase();

    // HTML: collect full body, replace text, send as Buffer
    if (contentType.indexOf('text/html') >= 0) {
      var htmlChunks = [];
      upstreamRes.on('data', function(c) { htmlChunks.push(c); });
      upstreamRes.on('end', function() {
        var body = Buffer.concat(htmlChunks).toString('utf-8');
        body = replaceText(body);
        respHeaders['Content-Type'] = 'text/html; charset=utf-8';
        delete respHeaders['Content-Length'];
        res.writeHead(status, respHeaders);
        res.end(Buffer.from(body, 'utf-8'));
      });
      upstreamRes.on('error', function(err) {
        console.error('Stream error:', err.message);
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'text/plain' });
          res.end(Buffer.from('Stream Error: ' + err.message));
        }
      });
      return;
    }

    // Non-HTML: collect and send as Buffer
    var binChunks = [];
    upstreamRes.on('data', function(c) { binChunks.push(c); });
    upstreamRes.on('end', function() {
      res.writeHead(status, respHeaders);
      res.end(Buffer.concat(binChunks));
    });
    upstreamRes.on('error', function(err) {
      console.error('Stream error:', err.message);
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end(Buffer.from('Stream Error: ' + err.message));
      }
    });

  } catch (err) {
    console.error('FATAL:', err.message, err.stack);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(Buffer.from('Internal Server Error: ' + err.message));
    }
  }
};
