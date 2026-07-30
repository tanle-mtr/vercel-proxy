import fetch from 'node-fetch';

// 允许代理的域名白名单
var ALLOWED = [
  'huggingface.co',
  'github.com',
  'raw.githubusercontent.com',
  'codeload.github.com',
  'objects.githubusercontent.com',
  'vercel.com',
  'dash.cloudflare.com',
  'drive.internxt.com'
];

function isAllowed(hostname) {
  for (var i = 0; i < ALLOWED.length; i++) {
    var domain = ALLOWED[i];
    if (hostname === domain) return true;
    if (hostname.endsWith('.' + domain)) return true;
    // 特殊处理 huggingface.co 的 *.hf.co 子域名
    if (domain === 'huggingface.co') {
      var parts = hostname.split('.');
      if (parts.length >= 3) {
        if (parts.slice(-2).join('.') === 'hf.co') return true;
      }
    }
  }
  return false;
}

export default async function handler(req, res) {
  try {
    var url = new URL(req.url, 'http://' + req.headers.host);
    var target = url.searchParams.get('to');

    // 支持 /huggingface.co/models 快捷格式
    if (!target) {
      var match = url.pathname.match(/^\/([^\/]+)(\/.*)?$/);
      if (match && isAllowed(match[1])) {
        target = 'https://' + match[1] + (match[2] || '/') + url.search;
      }
    }

    // 没有目标 → 导航页
    if (!target) {
      return sendNavPage(res);
    }

    var targetUrl = new URL(target);

    if (!isAllowed(targetUrl.hostname)) {
      return res.status(403).send('Domain not allowed: ' + targetUrl.hostname);
    }

    // 构造请求头
    var headers = new Headers();
    Object.entries(req.headers).forEach(function(entry) {
      var key = entry[0];
      var value = entry[1];
      var lower = key.toLowerCase();
      if (['host', 'cf-connecting-ip', 'x-vercel-id', 'connection', 'content-length'].indexOf(lower) !== -1) {
        return;
      }
      headers.set(key, value);
    });
    headers.set('Host', targetUrl.hostname);
    headers.set('Origin', targetUrl.origin);
    headers.set('User-Agent', req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    // 发起请求
    var fetchOptions = {
      method: req.method,
      headers: headers,
      redirect: 'manual'
    };

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      fetchOptions.body = req.body;
    }

    var upstreamRes = await fetch(targetUrl.toString(), fetchOptions);

    // 处理 3xx 重定向
    if ([301, 302, 303, 307, 308].indexOf(upstreamRes.status) !== -1) {
      var location = upstreamRes.headers.get('location');
      if (location) {
        try {
          var locUrl = new URL(location, targetUrl);
          if (isAllowed(locUrl.hostname)) {
            var newLocation = '/' + locUrl.hostname + locUrl.pathname + locUrl.search;
            res.setHeader('Location', newLocation);
            return res.status(upstreamRes.status).end();
          }
        } catch (e) {}
      }
      return res.status(upstreamRes.status).end();
    }

    // 构造响应头
    var respHeaders = {};
    upstreamRes.headers.forEach(function(value, key) {
      var lower = key.toLowerCase();
      if (['content-encoding', 'transfer-encoding', 'content-security-policy',
           'content-security-policy-report-only', 'cross-origin-resource-policy'].indexOf(lower) !== -1) {
        return;
      }
      respHeaders[key] = value;
    });

    // 删除 CSP，添加 CORS
    delete respHeaders['content-security-policy'];
    delete respHeaders['content-security-policy-report-only'];
    respHeaders['Access-Control-Allow-Origin'] = '*';

    // Set-Cookie 重写（去掉 Domain 限制）
    var setCookie = upstreamRes.headers.get('set-cookie');
    if (setCookie) {
      respHeaders['Set-Cookie'] = setCookie.replace(/Domain=[^;]+;/gi, '');
    }

    // 判断是否为 HTML
    var contentType = (respHeaders['Content-Type'] || '').toLowerCase();
    var isHtml = contentType.indexOf('text/html') !== -1;

    if (isHtml) {
      var text = await upstreamRes.text();

      // 注入 JS 修复相对路径跳转
      var hostname = targetUrl.hostname;
      var fixScript = '<script>(function(){var b=window.location.pathname.split("/").slice(0,2).join("/")+"/";var h="' + hostname + '";document.addEventListener("click",function(e){var a=e.target.closest("a");if(a&&a.href){try{var u=new URL(a.href);if(u.hostname===h||u.hostname.endsWith("."+h.split(".").slice(-2).join("."))){e.preventDefault();window.location.href=b+u.pathname.replace(/^\\//,"")+u.search;}}catch(err){}}});document.addEventListener("submit",function(e){var f=e.target;if(f.action&&f.action.indexOf(h)!==-1){e.preventDefault();var d=new FormData(f);fetch(b+new URL(f.action).pathname,{method:"POST",body:d}).then(function(r){return r.text();}).then(function(htm){document.open("text/html","replace");document.write(htm);document.close();});});})();</script>';

      text = text.replace('</body>', fixScript + '</body>');
      respHeaders['Content-Type'] = 'text/html; charset=utf-8';
      res.writeHead(upstreamRes.status, respHeaders);
      res.end(text);
    } else {
      // 非 HTML 流式传输
      res.writeHead(upstreamRes.status, respHeaders);
      var reader = upstreamRes.body.getReader();
      function pump() {
        reader.read().then(function(result) {
          if (result.done) return res.end();
          res.write(result.value);
          pump();
        }).catch(function() {
          if (!res.writableEnded) res.end();
        });
      }
      pump();
    }

  } catch (err) {
    console.error('PROXY_ERROR:', err);
    if (!res.headersSent) {
      res.status(500).send('Internal Server Error: ' + err.message);
    }
  }
}

function sendNavPage(res) {
  var html = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>反代导航</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:linear-gradient(135deg,#0f172a,#1e293b);min-height:100vh;display:flex;align-items:center;justify-content:center;color:#e2e8f0;padding:20px}.container{max-width:900px;width:100%;text-align:center}h1{font-size:2.2rem;margin-bottom:.5rem;color:#fff}.sub{color:#94a3b8;margin-bottom:2.5rem}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px}.card{background:#1e293b;border:1px solid #334155;border-radius:16px;padding:28px 20px;text-decoration:none;color:#e2e8f0;transition:.25s;border-top:3px solid #6366f1}.card:hover{transform:translateY(-6px);border-color:#6366f1;box-shadow:0 12px 40px rgba(0,0,0,.4)}.icon{font-size:2.8rem;margin-bottom:12px}.card h3{font-size:1.2rem;margin-bottom:6px;color:#fff}.card span{font-size:.85rem;color:#94a3b8}.footer{margin-top:3rem;font-size:.8rem;color:#475569}</style></head><body><div class="container"><h1>🧭 反代导航</h1><p class="sub">Vercel Hobby · 100万请求/月 · 100GB 带宽</p><div class="grid"><a class="card" href="/api/proxy?to=https://huggingface.co/" style="border-top-color:#ff9d00"><div class="icon">🤗</div><h3>Hugging Face</h3><span>huggingface.co</span></a><a class="card" href="/api/proxy?to=https://github.com/" style="border-top-color:#8b949e"><div class="icon">🐙</div><h3>GitHub</h3><span>github.com</span></a><a class="card" href="/api/proxy?to=https://vercel.com/" style="border-top-color:#000"><div class="icon">▲</div><h3>Vercel</h3><span>vercel.com</span></a><a class="card" href="/api/proxy?to=https://drive.internxt.com/" style="border-top-color:#6366f1"><div class="icon">☁️</div><h3>Internxt Drive</h3><span>drive.internxt.com</span></a></div><p class="footer">点击卡片进入对应网站 · 仅限个人使用</p></div></body></html>';
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}
