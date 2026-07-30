// api/proxy.js
// 兼容 Vercel Node.js 和 Edge Runtime 的 GitHub 代理
// 使用最基础语法，不依赖任何特定运行时的 API

const ALLOWED = [
  '/github.com',
  '/api.github.com',
  '/raw.githubusercontent.com',
  '/codeload.github.com',
  '/objects.githubusercontent.com',
  '/camo.githubusercontent.com',
  '/avatars.githubusercontent.com'
];

// ========== 导航页 ==========
function getNavHTML() {
  return '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>GitHub Proxy</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#0d1117;color:#c9d1d9;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}.c{max-width:800px;text-align:center}h1{color:#fff;font-size:2.5rem;margin-bottom:.5rem}h1 span{color:#58a6ff}.sub{color:#8b949e;margin-bottom:2rem}a.card{display:inline-block;margin:8px;padding:20px 24px;background:#161b22;border:1px solid #30363d;border-radius:12px;text-decoration:none;color:#58a6ff;min-width:200px;transition:all .2s}a.card:hover{border-color:#58a6ff;transform:translateY(-2px)}a.card h3{margin-bottom:6px;font-size:1.1rem}a.card p{color:#8b949e;font-size:.85rem}.tips{margin-top:1.5rem;padding:16px 20px;background:#161b22;border:1px solid #30363d;border-radius:8px;text-align:left;color:#8b949e;font-size:.85rem;line-height:1.7}code{background:#0d1117;padding:2px 6px;border-radius:4px;color:#79c0ff}</style></head><body><div class="c"><h1><span>⬇️</span> GitHub Proxy</h1><p class="sub">Vercel Functions · GitHub 高速下载代理</p><a class="card" href="/github.com/"><h3>📦 GitHub.com</h3><p>仓库浏览</p></a><a class="card" href="/api.github.com/"><h3>🔌 API</h3><p>API 访问</p></a><a class="card" href="/raw.githubusercontent.com/"><h3>📄 Raw</h3><p>原始文件</p></a><div class="tips"><strong>💡 使用方式：</strong><br>• 仓库：<code>/github.com/owner/repo</code><br>• Release：<code>/github.com/owner/repo/releases/download/v1.0/file.zip</code><br>• Archive：<code>/github.com/owner/repo/archive/refs/heads/main.zip</code><br>• Raw：<code>/raw.githubusercontent.com/owner/repo/branch/file</code><br>• aria2c：<code>aria2c -x 16 -s 16 -c "https://DOMAIN/github.com/owner/repo/archive/main.zip"</code></div></div></body></html>';
}

// ========== URL 文本替换 ==========
function fixText(text) {
  return text
    .split('https://github.com').join('/github.com')
    .split('https://api.github.com').join('/api.github.com')
    .split('https://raw.githubusercontent.com').join('/raw.githubusercontent.com')
    .split('https://codeload.github.com').join('/codeload.github.com')
    .split('https://objects.githubusercontent.com').join('/objects.githubusercontent.com')
    .split('https://avatars.githubusercontent.com').join('/avatars.githubusercontent.com')
    .split('https://camo.githubusercontent.com').join('/camo.githubusercontent.com');
}

// ========== 注入脚本 ==========
function getFixScript() {
  return '<script>(function(){var m={"https://github.com":"/github.com","https://api.github.com":"/api.github.com","https://raw.githubusercontent.com":"/raw.githubusercontent.com","https://codeload.github.com":"/codeload.github.com"};function p(u){for(var k in m){if(u.indexOf(k)===0)return m[k]+u.substring(k.length);}return u;}var _f=window.fetch;window.fetch=function(i,o){if(typeof i==="string")i=p(i);else if(i instanceof Request)i=new Request(p(i.url),i);return _f.call(this,i,o);};var _o=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(a,b){arguments[1]=p(b);return _o.apply(this,arguments);};})();</script>';
}

// ========== 发送导航页（兼容两种运行时） ==========
function sendNav(res) {
  var html = getNavHTML();
  // Node.js 运行时
  if (res && typeof res.writeHead === 'function') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return true;
  }
  // Edge 运行时
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

// ========== 发送错误（兼容两种运行时） ==========
function sendError(res, code, msg) {
  if (res && typeof res.writeHead === 'function') {
    res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(msg);
    return true;
  }
  return new Response(msg, { status: code, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

// ========== 主处理函数 ==========
async function main(req, res) {
  // ---- 获取请求路径 ----
  var path = '';
  var method = 'GET';
  var headers = {};
  var queryString = '';

  // Node.js 运行时：req 是 IncomingMessage
  if (req && typeof req.url === 'string') {
    path = req.url;
    method = req.method || 'GET';
    headers = req.headers || {};
    // 分离 query string
    var qIdx = path.indexOf('?');
    if (qIdx !== -1) {
      queryString = path.substring(qIdx);
      path = path.substring(0, qIdx);
    }
  }
  // Edge 运行时：req 是 Request 对象
  else if (req && typeof req.url === 'string' && typeof globalThis.fetch === 'function') {
    // Request 对象有 .url 属性（绝对 URL）
    try {
      var reqUrl = new URL(req.url);
      path = reqUrl.pathname || '/';
      queryString = reqUrl.search || '';
      method = req.method || 'GET';
      // 从 Request headers 构建 headers 对象
      req.headers.forEach(function(v, k) { headers[k] = v; });
    } catch(e) {
      path = '/';
    }
  }
  // 兜底
  else {
    path = '/';
  }

  // ---- 根路径 ----
  if (path === '/' || path === '') {
    return sendNav(res);
  }

  // ---- 匹配白名单前缀 ----
  var matched = null;
  for (var i = 0; i < ALLOWED.length; i++) {
    var prefix = ALLOWED[i];
    if (path === prefix || path.indexOf(prefix + '/') === 0) {
      matched = prefix;
      break;
    }
  }

  if (!matched) {
    // 非代理路径，返回导航页
    return sendNav(res);
  }

  // ---- 构建上游 URL ----
  var targetHost = matched.substring(1); // 去掉开头的 /
  var remainingPath = path.substring(matched.length);
  if (remainingPath === '') remainingPath = '/';

  var upstreamUrl = 'https://' + targetHost + remainingPath + queryString;

  // ---- 构建请求头 ----
  var reqHeaders = {};
  for (var key in headers) {
    if (!headers.hasOwnProperty(key)) continue;
    var lower = key.toLowerCase();
    if (lower === 'host' || lower === 'cf-connecting-ip' ||
        lower === 'x-vercel-id' || lower === 'connection' ||
        lower === 'content-length') continue;
    reqHeaders[key] = headers[key];
  }
  reqHeaders['Host'] = targetHost;
  reqHeaders['Origin'] = 'https://' + targetHost;
  reqHeaders['Referer'] = 'https://' + targetHost + '/';

  // ---- 构建 fetch 选项 ----
  var fetchOpts = {
    method: method,
    headers: reqHeaders,
    redirect: 'manual'
  };

  // 处理请求体（非 GET/HEAD）
  if (method !== 'GET' && method !== 'HEAD') {
    if (req && typeof req.on === 'function') {
      // Node.js: 从 stream 读取 body
      try {
        var bodyBuf = await new Promise(function(resolve, reject) {
          var chunks = [];
          req.on('data', function(c) { chunks.push(c); });
          req.on('end', function() { resolve(Buffer.concat(chunks)); });
          req.on('error', reject);
        });
        fetchOpts.body = bodyBuf;
      } catch(e) {}
    }
    // Edge: req.body 是 ReadableStream
    else if (req && req.body) {
      fetchOpts.body = req.body;
    }
  }

  // ---- 发起上游请求 ----
  var upstreamRes = await fetch(upstreamUrl, fetchOpts);
  var status = upstreamRes.status;

  // ---- 处理重定向 ----
  if (status === 301 || status === 302 || status === 303 || status === 307 || status === 308) {
    var loc = upstreamRes.headers.get ? upstreamRes.headers.get('location') : null;
    if (loc) {
      try {
        var locUrl = new URL(loc);
        var host = locUrl.hostname || '';
        if (host.indexOf('github.com') !== -1 || host.indexOf('githubusercontent.com') !== -1) {
          var newLoc = '/' + host + locUrl.pathname + locUrl.search;
          if (res && typeof res.writeHead === 'function') {
            res.writeHead(status, { 'Location': newLoc });
            res.end();
            return;
          }
          return new Response(null, { status: status, headers: { 'Location': newLoc } });
        }
      } catch(e) {}
    }
    // 非白名单重定向，直接放行
    if (res && typeof res.writeHead === 'function') {
      res.writeHead(status, { 'Location': loc || '' });
      res.end();
      return;
    }
    return new Response(null, { status: status, headers: { 'Location': loc || '' } });
  }

  // ---- 收集响应头 ----
  var respHeaders = {};
  if (upstreamRes.headers.forEach) {
    upstreamRes.headers.forEach(function(value, key) {
      var lk = key.toLowerCase();
      if (lk === 'content-encoding' || lk === 'transfer-encoding' ||
          lk === 'content-security-policy' || lk === 'content-security-policy-report-only' ||
          lk === 'clear-site-data') return;
      respHeaders[key] = value;
    });
  }
  respHeaders['Access-Control-Allow-Origin'] = '*';
  delete respHeaders['access-control-allow-credentials'];

  // ---- 检查 Content-Type ----
  var contentType = (respHeaders['Content-Type'] || respHeaders['content-type'] || '').toLowerCase();

  // ---- HTML 处理 ----
  if (contentType.indexOf('text/html') !== -1) {
    var html = await upstreamRes.text();
    html = fixText(html);
    html = html.split('</head>').join(getFixScript() + '</head>');

    if (res && typeof res.writeHead === 'function') {
      res.writeHead(status, Object.assign({}, respHeaders, { 'Content-Type': 'text/html; charset=utf-8' }));
      res.end(html);
      return;
    }
    respHeaders['Content-Type'] = 'text/html; charset=utf-8';
    return new Response(html, { status: status, headers: respHeaders });
  }

  // ---- 非 HTML：直接返回 ----
  if (res && typeof res.writeHead === 'function') {
    res.writeHead(status, respHeaders);
    if (upstreamRes.body) {
      var reader = upstreamRes.body.getReader();
      var pump = function() {
        return reader.read().then(function(result) {
          if (result.done) { res.end(); return; }
          res.write(result.value);
          return pump();
        }).catch(function() { if (!res.writableEnded) res.end(); });
      };
      return pump();
    }
    res.end();
    return;
  }

  return new Response(upstreamRes.body, { status: status, headers: respHeaders });
}

// ========== 导出（兼容 CommonJS 和 ES Module） ==========
module.exports = async function(req, res) {
  try {
    return await main(req, res);
  } catch (err) {
    console.error('Proxy Error:', err.message, err.stack);
    return sendError(res, 500, 'Internal Server Error: ' + err.message);
  }
};
