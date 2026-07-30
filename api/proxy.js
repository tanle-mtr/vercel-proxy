const { URL } = require('url');

// 核心处理函数
async function handleRequest(req, res) {
    try {
        // 获取用户请求的路径，例如 /github.com/owner/repo
        let targetPath = req.url;

        // 如果访问根目录，返回一个简单的提示页
        if (targetPath === '/' || targetPath === '') {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            return res.end(`
                <!DOCTYPE html>
                <html>
                <head><title>Proxy</title></head>
                <body style="font-family: sans-serif; padding: 50px; text-align: center;">
                    <h1>GitHub Proxy</h1>
                    请在地址栏输入完整路径，例如：
                    <a href="/github.com/tanle-mtr/vercel-proxy">/github.com/tanle-mtr/vercel-proxy</a>
                </body>
                </html>
            `);
        }

        // 验证是否是 github.com 的请求
        if (!targetPath.toLowerCase().startsWith('/github.com')) {
            res.writeHead(404);
            return res.end('Not Found: Only github.com is supported.');
        }

        // 构建真实的上游 URL
        const upstreamUrl = `https://${targetPath.substring(1)}`;
        
        // 发起请求
        const fetchOpts = {
            method: req.method,
            headers: req.headers,
        };
        const upstreamRes = await fetch(upstreamUrl, fetchOpts);
        const status = upstreamRes.status;

        // 处理重定向 (301/302)
        if (status >= 300 && status < 400) {
            const loc = upstreamRes.headers.get('location');
            if (loc) {
                res.writeHead(status, { 'Location': loc });
                return res.end();
            }
        }

        // 读取响应体为文本
        const html = await upstreamRes.text();

        // 修改 HTML：替换域名 + 注入按钮
        let modifiedHtml = html;
        
        // 1. 把所有的 https://github.com 替换为相对路径 /github.com，解决跨域
        modifiedHtml = modifiedHtml.replace(/https:\/\/github\.com/g, '/github.com');
        
        // 2. 在 </body> 标签前注入我们的下载按钮
        const buttonHtml = `
            <div style="position: fixed; bottom: 20px; right: 20px; z-index: 9999; background: #28a745; color: white; padding: 10px 15px; border-radius: 5px; font-family: sans-serif; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
                <a href="/github.com/tanle-mtr/vercel-proxy/archive/refs/heads/main.zip" target="_blank" style="color: white; text-decoration: none; font-weight: bold;">
                    ⬇️ Download Source (main.zip)
                </a>
            </div>
        `;
        modifiedHtml = modifiedHtml.replace('</body>', buttonHtml + '</body>');

        // 设置响应头
        const respHeaders = {};
        upstreamRes.headers.forEach((val, key) => {
            // 过滤掉会导致问题的头
            const lowerKey = key.toLowerCase();
            if (lowerKey === 'content-encoding' || lowerKey === 'transfer-encoding' || lowerKey === 'content-security-policy') return;
            respHeaders[key] = val;
        });
        
        // 允许跨域
        respHeaders['Access-Control-Allow-Origin'] = '*';
        // 确保浏览器知道这是 HTML
        respHeaders['Content-Type'] = 'text/html; charset=utf-8';

        res.writeHead(status, respHeaders);
        res.end(modifiedHtml);

    } catch (err) {
        console.error('Proxy Error:', err);
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Server Error: ' + err.message);
    }
}

// 导出函数
module。exports = handleRequest;
