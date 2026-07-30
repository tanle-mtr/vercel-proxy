// api/proxy.js
module.exports = async function (req, res) {
    try {
        // 1. 获取请求的路径，例如 /github.com/owner/repo
        let targetPath = req.url;

        // 2. 安全检查：如果没有路径，直接返回首页
        if (!targetPath || targetPath === "/" || targetPath === "") {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
                <!DOCTYPE html>
                <html>
                <head><title>GitHub Proxy</title></head>
                <body style="font-family: sans-serif; background:#111; color:#eee; text-align:center; padding-top:50px;">
                    <h1>GitHub Download Proxy</h1>
                    输入格式：<code>owner/repo</code> 或完整链接
                    <form onsubmit="handleSubmit(event)">
                        <input type="text" id="repoInput" placeholder="e.g. tanle-mtr/vercel-proxy" style="width: 400px; padding: 10px; border-radius: 5px; border: 1px solid #555; background: #222; color: white;">
                        <button type="submit" style="padding: 10px 20px; margin-left: 10px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">Generate</button>
                    </form>
                    <div id="result" style="margin-top: 20px;"></div>

                    <script>
                        // 前端脚本：处理表单提交，构造代理链接
                        function handleSubmit(e) {
                            e.preventDefault();
                            const input = document.getElementById('repoInput').value.trim();
                            if (!input) return;
                            
                            let fullUrl = input;
                            // 如果输入的不是以 http 开头的完整链接，自动补全为 tree/main 页面
                            if (!input.startsWith('http')) {
                                fullUrl = 'https://github.com/' + input + '/tree/main';
                            }

                            // 构造代理后的下载链接 (指向 /download/...)
                            const downloadUrl = window.location.origin + '/download/' + encodeURIComponent(fullUrl);
                            
                            const resultDiv = document.getElementById('result');
                            resultDiv.innerHTML = 
                                '<h3>✅ 下载链接已生成：</h3>' +
                                '<a href="' + downloadUrl + '" target="_blank" style="color: #4CAF50; font-size: 18px; word-break: break-all;">' + downloadUrl + '</a>' +
                                '<p style="font-size: 12px; color: #888;">右键复制链接地址，使用 IDM 或迅雷下载';
                        }
                    </script>
                </body>
                </html>
            `);
            return;
        }

        // 3. 处理重定向 (301/302)
        if (req.headers['x-vercel-proxy-target']) {
            const location = req.headers['x-vercel-proxy-target'][0];
            res.writeHead(302, { 'Location': location });
            return res.end();
        }

        // 4. 核心代理逻辑
        let upstreamUrl = '';
        const lowerPath = targetPath.toLowerCase();

        if (lowerPath.startsWith('/github.com')) {
            // 直接代理 github.com
            upstreamUrl = 'https://' + targetPath.substring(1);
        } else if (lowerPath.startsWith('/download/')) {
            // 这是一个下载请求，解码出真实的 GitHub URL
            const encodedUrl = targetPath.substring(10); // 去掉 /download/
            try {
                const realUrl = decodeURIComponent(encodedUrl);
                upstreamUrl = realUrl;
            } catch (e) {
                res.writeHead(400);
                return res.end('Invalid URL');
            }
        } else {
            res.writeHead(404);
            return res.end('Not Found');
        }

        // 发起请求
        const fetchOpts = {
            method: req.method,
            headers: req.headers,
        };

        // 如果是 POST 且有 body，带上 body (虽然通常下载是 GET)
        if (req.method === 'POST' && req.body) {
            fetchOpts.body = JSON.stringify(req.body);
        }

        const upstreamRes = await fetch(upstreamUrl, fetchOpts);
        const status = upstreamRes.status;

        // 处理重定向 (防止死循环，去掉 x-vercel-proxy-target)
        if (status >= 300 && status < 400) {
            const loc = upstreamRes.headers.get('location');
            if (loc) {
                // 重新构造一个带 Location 的请求头发给前端
                res.writeHead(status, { 
                    'Location': loc,
                    'x-vercel-proxy-target': loc // 用自定义头传给下一次请求
                });
                return res.end();
            }
        }

        // 复制响应头
        const respHeaders = {};
        upstreamRes.headers.forEach((val, key) => {
            const low = key.toLowerCase();
            // 过滤掉会导致问题的头
            if (low === 'content-encoding' || low === 'transfer-encoding' || low === 'content-security-policy') return;
            respHeaders[key] = val;
        });
        
        // 允许跨域
        respHeaders['Access-Control-Allow-Origin'] = '*';

        // 设置状态码和内容类型
        res.writeHead(status, respHeaders);
        
        // 流式传输数据
        if (upstreamRes.body) {
            const reader = upstreamRes.body.getReader();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(Buffer.from(value));
            }
        }
        res.end();

    } catch (err) {
        console.error(err);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server Error: ' + err.message);
    }
};
