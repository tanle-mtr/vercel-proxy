const ALLOWED = [
  'huggingface.co',
  'github.com',
  'raw.githubusercontent.com',
  'codeload.github.com',
  'objects.githubusercontent.com',
  'vercel.com',
  'dash.cloudflare.com',
  'drive.internxt.com',
  'tanle.xyz'
];

function isAllowed(hostname) {
  return ALLOWED.some(function(domain) {
    return hostname === domain || hostname.endsWith('.' + domain);
  });
}

function getNav() {
  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Proxy Nav</title><style>body{font-family:sans-serif;background:#f1f5f9;padding:2rem;text-align:center}.card{display:inline-block;margin:1rem;padding:2rem;background:white;border-radius:12px;text-decoration:none;color:#333;box-shadow:0 2px 8px rgba(0,0,0,0.1)}.card:hover{box-shadow:0 4px 16px rgba(0,0,0,0.15)}.icon{font-size:2.5rem;display:block;margin-bottom:0.5rem}</style></head><body><h1>Proxy Nav</h1><a class="card" href="/huggingface.co/"><span class="icon">&#129439;</span><h3>Hugging Face</h3></a><a class="card" href="/github.com/"><span class="icon">&#128025;</span><h3>GitHub</h3></a><a class="card" href="/vercel.com/"><span class="icon">&#9651;</span><h3>Vercel</h3></a><a class="card" href="/drive.internxt.com/"><span class="icon">&#9925;</span><h3>Internxt</h3></a></body></html>';
}

module.exports = async function handler(req, res) {
  try {
    var url = new URL(req.url, 'http://' + req.headers.host);
    var target = url.searchParams.get('to');

    if (!target) {
      var m = url.pathname.match(/^\/([^\/]+)(\/.*)?$/);
      if (m && isAllowed(m[1])) {
        target = 'https://' + m[1] + (m[2] || '/') + url.search;
      }
    }

    if (!target) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(getNav());
    }

    var targetUrl;
    try {
      targetUrl = new URL(target);
    } catch(e) {
      res.writeHead(400);
      return res.end('Invalid URL: ' + target);
    }

    if (!isAllowed(targetUrl.hostname)) {
      res.writeHead(403);
      return res.end('Domain not allowed: ' + targetUrl.hostname);
    }

    var headers = new Headers();
    var entries = Object.entries(req.headers);
    for (var i = 0; i < entries.length; i++) {
      var key = entries[i][0];
      var value = entries[i][1];
      var lower = key.toLowerCase();
      if (lower === 'host' || lower === 'cf-connecting-ip' || lower === 'x-vercel-id' || lower === 'connection' || lower === 'content-length') {
        continue;
      }
      headers.set(key, value);
    }
    headers.set('Host', targetUrl.hostname);

    var fetchOptions = {
      method: req.method,
      headers: headers,
      redirect: 'manual'
    };

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      fetchOptions.body = req.body;
    }

    var upRes = await fetch(targetUrl.toString(), fetchOptions);

    if (upRes.status === 301 || upRes.status === 302 || upRes.status === 303 || upRes.status === 307 || upRes.status === 308) {
      var loc = upRes.headers.get('location');
      if (loc) {
        try {
          var locUrl = new URL(loc, targetUrl);
          if (isAllowed(locUrl.hostname)) {
            var newLoc = '/' + locUrl.hostname + locUrl.pathname + locUrl.search;
            res.writeHead(upRes.status, { 'Location': newLoc });
            return res.end();
          }
        } catch(e) {}
      }
      res.writeHead(upRes.status);
      return res.end();
    }

    var respHeaders = {};
    upRes.headers.forEach(function(value, key) {
      var lower = key.toLowerCase();
      if (lower === 'content-encoding' || lower === 'transfer-encoding' || lower === 'content-security-policy' || lower === 'content-security-policy-report-only' || lower === 'cross-origin-resource-policy') {
        return;
      }
      respHeaders[key] = value;
    });

    delete respHeaders['content-security-policy'];
    delete respHeaders['content-security-policy-report-only'];
    respHeaders['Access-Control-Allow-Origin'] = '*';

    var ct = (respHeaders['Content-Type'] || respHeaders['content-type'] || '').toLowerCase();

    if (ct.indexOf('text/html') !== -1) {
      var html = await upRes.text();
      var domain = targetUrl.hostname;
      var suffix = domain.split('.').slice(-2).join('.');
      var script = '<script>(function(){var b=window.location.pathname.split("/").slice(0,2).join("/")+"/";document.addEventListener("click",function(e){var l=e.target.closest("a");if(l&&l.href){try{var u=new URL(l.href);if(u.hostname==="'+domain+'"||u.hostname.endsWith(".('+suffix+')")){e.preventDefault();window.location.href=b+u.pathname.replace(/^\\//,"")+u.search}}}catch(e){}});})();</script>';
      html = html.replace('</body>', script + '</body>');
      res.writeHead(upRes.status, respHeaders);
      return res.end(html);
    }

    var buf = await upRes.arrayBuffer();
    res.writeHead(upRes.status, respHeaders);
    res.end(Buffer.from(buf));

  } catch (err) {
    console.error('PROXY_ERROR:', err.message);
    if (!res.headersSent) {
      res.writeHead(500);
      res.end('Internal Error: ' + err.message);
    }
  }
};
