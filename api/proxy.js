// api/proxy.js
export 默认 async function handler(req, res) {
  try {
    // 1. 获取用户请求的完整路径，例如 /github.com/owner/repo
    const targetPath = req.url;

    // 2. 这里暂时只代理 GitHub，防止范围太广出错
    if (targetPath.startsWith('/github.com')) {
      // 构造真实的上游 URL
      const upstreamUrl = `https://${targetPath.substring(1)}`;
      
      const fetchOpts = {
        method: req.method,
        headers: req.headers,
      };
      
      // 如果是 POST 且有 body，带上 body
      if (req.method === 'POST' && req.body) {
        fetchOpts.body = JSON.stringify(req.body);
      }

      const upstreamRes = await fetch(upstreamUrl, fetchOpts);
      const status = upstreamRes.status;

      // 复制响应头
      const respHeaders = {};
      upstreamRes.headers.forEach((val, key) => {
        // 过滤掉会导致问题的响应头
        if (key.toLowerCase() === 'content-encoding' || key.toLowerCase() === 'transfer-encoding') return;
        respHeaders[key] = val;
      });
      
      // 强制允许跨域，防止浏览器拦截
      respHeaders['Access-Control-Allow-Origin'] = '*';

      // 3. 核心修复：如果是 HTML 页面，我们把它当作纯文本读取，再作为文本返回
      // 这样可以避免二进制流处理不当导致的 500 和乱码
      const contentType = (respHeaders['Content-Type'] || '').toLowerCase();
      if (contentType.includes('text/html')) {
        const textBody = await upstreamRes.text();
        res.writeHead(status, respHeaders);
        res.end(textBody);
      } else {
        // 非 HTML（如图片、CSS、JS）直接透传
        res.writeHead(status, respHeaders);
        if (upstreamRes.body) {
          const reader = upstreamRes.body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(Buffer.from(value));
          }
        }
        res.end();
      }
    } else {
      // 非 GitHub 请求，显示一个简易导航页
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head><title>Proxy</title></head>
        <body style="font-family: sans-serif; padding: 50px;">
          <h1>GitHub Proxy</h1>
          请在地址栏输入完整路径，例如：
          <a href="/github.com/tanle-mtr/vercel-proxy">/github.com/tanle-mtr/vercel-proxy</a>
        </body>
        </html>
      `);
    }
  } catch (err) {
    console.error(err);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Error: ' + err.message);
  }
}
