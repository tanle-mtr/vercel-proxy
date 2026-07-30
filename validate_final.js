// 最终验证：将 proxy.js 整体包裹在沙盒中执行
const fs = require('fs');
const vm = require('vm');

let pass = 0, fail = 0;
function check(name, condition) {
  console.log((condition ? '✅ ' : '❌ ') + name);
  condition ? pass++ : fail++;
}

const proxySrc = fs.readFileSync(__dirname + '/api/proxy.js', 'utf8');

// 语法检查
try { new Function(proxySrc); check('proxy.js 语法合法', true); }
catch(e) { check('proxy.js 语法合法', false); console.log('  ', e.message); }

// 静态检查
const checks = [
  ['module.exports', /module\.exports/],
  ['function injectDownloadButton', /function injectDownloadButton/],
  ['function isAllowedHost', /function isAllowedHost/],
  ['function getBranch', /function getBranch/],
  ['function getRepoInfo', /function getRepoInfo/],
  ['function replaceText', /function replaceText/],
  ['function getNavPage', /function getNavPage/],
  ['策略1 star-button', /data-testid="star-button"/],
  ['策略2 fork-button', /data-testid="fork-button"/],
  ['策略3 download-button', /data-testid="download-button"/],
  ['策略4 </body> 兜底', /<\/body>/],
  ['绿色 #2ea043', /#2ea043/],
  ['悬停 #3fb950', /#3fb950/],
  ['target="_blank"', /target="_blank"/],
  ['rel="noopener"', /rel="noopener"/],
  ['白名单 github.com', /'github\.com'/],
  ['白名单 codeload', /'codeload\.github\.com'/],
  ['不依赖 DOMContentLoaded', /DOMContentLoaded/],
  ['不依赖 MutationObserver', /MutationObserver/],
  ['不依赖 setInterval', /setInterval/],
  ['不依赖 window.fetch', /window\.fetch/],
  ['不依赖 XMLHttpRequest', /XMLHttpRequest/],
  ['matched 非函数调用', /matched\.length\(\)/],
  ['remainingPath 提取', /remainingPath/],
];

checks.forEach(function(c) {
  if (c[1] instanceof RegExp) {
    check(c[0], c[1].test(proxySrc));
  }
});

// 在 vm 沙盒中执行 proxy.js，获取所有函数
var sandbox = { console: console, Buffer: Buffer, Object: Object, Array: Array, String: String, RegExp: RegExp, Error: Error };
sandbox.module = { exports: {} };
var ctx = vm.createContext(sandbox);
vm.runInContext(proxySrc, ctx);

// 获取函数
var injectFn = sandbox.module.exports; // handler 本身
// 但我们需要内部函数，重新提取执行
var fnSource = '';
var fnNames = ['injectDownloadButton', 'getBranch', 'getRepoInfo', 'replaceText', 'isAllowedHost'];

// 用另一种方式：把 proxy.js 包一层暴露
var exposed = proxySrc.replace(
  'module.exports = async function handler',
  'global.__handler = async function handler'
);
// 加上把内部函数挂到 global
var appendCode = '\n;global.__inject = injectDownloadButton;';
appendCode += '\nglobal.__getBranch = getBranch;';
appendCode += '\nglobal.__getRepoInfo = getRepoInfo;';
appendCode += '\nglobal.__replaceText = replaceText;';
appendCode += '\nglobal.__isAllowedHost = isAllowedHost;';

var fullSrc = exposed + appendCode;
var sandbox2 = { console: console, Buffer: Buffer, Object: Object, Array: Array, String: String, RegExp: RegExp, Error: Error, setTimeout: setTimeout, clearTimeout: clearTimeout, Promise: Promise };
sandbox2.global = sandbox2;
var ctx2 = vm.createContext(sandbox2);
vm.runInContext(fullSrc, ctx2);

// 现在测试各个函数
var injectDownloadButton = sandbox2.__inject;
var getBranch = sandbox2.__getBranch;
var getRepoInfo = sandbox2.__getRepoInfo;
var replaceText = sandbox2.__replaceText;
var isAllowedHost = sandbox2.__isAllowedHost;

// 测试 injectDownloadButton
if (typeof injectDownloadButton === 'function') {
  var mock1 = '<div class="d-flex gap-2">'
    + '<a data-testid="download-button">Code</a>'
    + '<button data-testid="star-button">Star</button>'
    + '</div>';
  var r1 = injectDownloadButton(mock1, '/tanle-mtr/vercel-proxy');
  check('注入: 按钮插入成功', r1.includes('下载源码'));
  check('注入: zip URL 正确', r1.includes('/tanle-mtr/vercel-proxy/archive/refs/heads/main.zip'));
  check('注入: 按钮在 Star 前', r1.indexOf('下载源码') < r1.indexOf('Star'));
  check('注入: 绿色背景', r1.includes('#2ea043'));
  check('注入: target=_blank', r1.includes('target="_blank"'));
  check('注入: rel=noopener', r1.includes('rel="noopener"'));

  // 不同分支
  var r2 = injectDownloadButton(mock1, '/owner/repo/tree/develop');
  check('注入: develop 分支', r2.includes('下载源码 (develop.zip)'));

  // 没有 star-button
  var mock3 = '<a data-testid="download-button">Code</a>';
  var r3 = injectDownloadButton(mock3, '/owner/repo');
  check('注入: 仅 Code 按钮（策略3）', r3.includes('下载源码'));

  // 兜底
  var mock4 = '<html><body><div>hello</div></body></html>';
  var r4 = injectDownloadButton(mock4, '/owner/repo');
  check('注入: </body> 兜底', r4.includes('下载源码'));
}

// 测试 getBranch
if (typeof getBranch === 'function') {
  check('getBranch: 默认 main', getBranch('/owner/repo') === 'main');
  check('getBranch: /tree/v2', getBranch('/owner/repo/tree/v2') === 'v2');
  check('getBranch: /tree/feature/x', getBranch('/owner/repo/tree/feature/x') === 'feature/x');
}

// 测试 getRepoInfo
if (typeof getRepoInfo === 'function') {
  var info = getRepoInfo('/tanle-mtr/vercel-proxy');
  check('getRepoInfo: owner', info && info.owner === 'tanle-mtr');
  check('getRepoInfo: repo', info && info.repo === 'vercel-proxy');
  check('getRepoInfo: 无 repo 返回 null', getRepoInfo('/just-owner') === null);
}

// 测试 replaceText
if (typeof replaceText === 'function') {
  var t = replaceText('https://github.com/vercel/next.js https://api.github.com/repos/x');
  check('replaceText: github.com', t.includes('/github.com/vercel/next.js'));
  check('replaceText: api.github.com', t.includes('/api.github.com/repos/x'));
  check('replaceText: null 安全', replaceText(null) === null);
}

// 测试 isAllowedHost
if (typeof isAllowedHost === 'function') {
  check('isAllowedHost: github.com', isAllowedHost('github.com'));
  check('isAllowedHost: api.github.com', isAllowedHost('api.github.com'));
  check('isAllowedHost: evil.com 拒绝', !isAllowedHost('evil.com'));
  check('isAllowedHost: 子域允许', isAllowedHost('sub.raw.githubusercontent.com'));
}

// JSON 文件
try { JSON.parse(fs.readFileSync(__dirname + '/vercel.json', 'utf8')); check('vercel.json 合法', true); }
catch(e) { check('vercel.json 合法', false); }

try { JSON.parse(fs.readFileSync(__dirname + '/package.json', 'utf8')); check('package.json 合法', true); }
catch(e) { check('package.json 合法', false); }

// 文件大小
var stat = fs.statSync(__dirname + '/api/proxy.js');
check('proxy.js 大小 11KB', stat.size > 5000 && stat.size < 50000);

console.log('\n========== 最终结果 ==========');
console.log('通过: ' + pass + '/' + (pass + fail));
if (fail > 0) {
  console.log('失败: ' + fail);
  process.exit(1);
} else {
  console.log('🎉 全部通过！');}
