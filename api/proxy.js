// api/proxy.js - 纯导航页，提供下载链接和跳转链接
module.exports = (req, res) => {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GitHub 下载助手</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#0d1117;color:#c9d1d9;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
    .c{max-width:640px;width:100%;text-align:center}
    h1{color:#fff;font-size:2.2rem;margin-bottom:.5rem}
    h1 span{color:#58a6ff}
    .s{color:#8b949e;margin-bottom:1.5rem;font-size:.95rem}
    .box{display:flex;gap:8px;margin-bottom:1.5rem}
    .box input{flex:1;padding:12px 14px;border:1px solid #30363d;border-radius:8px;background:#161b22;color:#c9d1d9;font-size:1rem;outline:0}
    .box input:focus{border-color:#58a6ff}
    .box button{padding:12px 20px;border:0;border-radius:8px;background:#238636;color:#fff;font-size:1rem;font-weight:600;cursor:pointer}
    .box button:hover{background:#2ea043}
    .links{display:none;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:1.5rem}
    .links a{display:block;padding:16px;background:#161b22;border:1px solid #30363d;border-radius:10px;color:#58a6ff;text-decoration:none;font-size:.9rem;transition:border-color .2s}
    .links a:hover{border-color:#58a6ff}
    .links a b{display:block;color:#fff;margin-bottom:4px;font-size:.95rem}
    .tip{text-align:left;padding:14px 16px;background:#161b22;border:1px solid #f0883e;border-radius:8px;margin-bottom:1rem}
    .tip h3{color:#f0883e;font-size:.9rem;margin-bottom:6px}
    .tip p,.tip li{color:#8b949e;font-size:.82rem;line-height:1.6}
    .tip ul{list-style:none;padding:0}
    .tip code{background:#0d1117;padding:2px 6px;border-radius:3px;color:#79c0ff;font-size:.78rem}
    .f{margin-top:1.5rem;font-size:.78rem;color:#484f58}
  </style>
</head>
<body>
<div class="c">
  <h1><span>⬇️</span> GitHub 下载助手</h1>
  <p class="s">输入仓库名，一键获取下载链接和访问入口</p>
  <div class="box">
    <input id="i" placeholder="owner/repo（如 tanle-mtr/vercel-proxy）" />
    <button onclick="generate()">生成</button>
  </div>
  <div class="links" id="links">
    <a id="dlLink" target="_blank"><b>⬇️ 下载源码 (zip)</b><span id="dlSpan"></span></a>
    <a id="visitLink" target="_blank"><b>🌐 访问开源页</b><span id="visitSpan"></span></a>
  </div>
  <div class="tip">
    <h3>💡 说明</h3>
    <ul>
      <li>输入 <code>owner/repo</code> 后点击“生成”</li>
      <li>点击“下载源码”直接下载 zip 压缩包</li>
      <li>点击“访问开源页”跳转到 GitHub 仓库</li>
      <li>aria2c 多线程：<code>aria2c -x 16 -s 16 -c "下载链接"</code></li>
    </ul>
  </div>
  <p class="f">Vercel Hobby · 纯导航页，不代理任何内容</p>
</div>
<script>
function generate() {
  var v = document.getElementById('i').value.trim();
  if (!v) return;
  // 清理输入：去掉协议、域名、首尾斜杠
  v = v.replace(/^https?:\/\//, '').replace(/^github\.com\//, '').replace(/^\/+/, '');
  var parts = v.split('/');
  if (parts.length < 2) { alert('格式错误，应为 owner/repo'); return; }
  var owner = parts[0], repo = parts[1];
  var dl = 'https://github.com/' + owner + '/' + repo + '/archive/refs/heads/main.zip';
  var visit = 'https://github.com/' + owner + '/' + repo;
  document.getElementById('dlLink').href = dl;
  document.getElementById('dlSpan').textContent = dl;
  document.getElementById('visitLink').href = visit;
  document.getElementById('visitSpan').textContent = visit;
  document.getElementById('links').style.display = 'grid';
}
// 回车键触发
document.getElementById('i').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') generate();
});
</script>
</body>
</html>`;

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
};
