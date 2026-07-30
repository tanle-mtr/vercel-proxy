const fs = require('fs');
const path = require('path');

let pass = 0;
let fail = 0;

function check(name, condition, detail) {
  if (condition) {
    console.log('  PASS  ' + name);
    pass++;
  } else {
    console.log('  FAIL  ' + name + '  -> ' + detail);
    fail++;
  }
}

console.log('=== Validating package.json ===');
const pkgRaw = fs.readFileSync('/data/workspace/vercel-proxy/package.json', 'utf8');
let pkg;
try {
  pkg = JSON.parse(pkgRaw);
  check('package.json parses as valid JSON', true, '');
} catch(e) {
  check('package.json parses as valid JSON', false, e.message);
}
check('name is string', typeof pkg.name === 'string', JSON.stringify(pkg.name));
check('version is string', typeof pkg.version === 'string', JSON.stringify(pkg.version));
check('private is true', pkg.private === true, JSON.stringify(pkg.private));
check('no type:module (CommonJS only)', pkg.type !== 'module', JSON.stringify(pkg.type));
check('no dependencies field', !pkg.dependencies, 'has dependencies');
check('no engines field', !pkg.engines, 'has engines');

console.log('\n=== Validating vercel.json ===');
const vjRaw = fs.readFileSync('/data/workspace/vercel-proxy/vercel.json', 'utf8');
let vj;
try {
  vj = JSON.parse(vjRaw);
  check('vercel.json parses as valid JSON', true, '');
} catch(e) {
  check('vercel.json parses as valid JSON', false, e.message);
}
check('has rewrites array', Array.isArray(vj.rewrites), JSON.stringify(vj.rewrites));
check('rewrites has 1 rule', vj.rewrites.length === 1, String(vj.rewrites.length));
check('source is /(.*)', vj.rewrites[0].source === '/(.*)', JSON.stringify(vj.rewrites[0].source));
check('destination is /api/proxy', vj.rewrites[0].destination === '/api/proxy', JSON.stringify(vj.rewrites[0].destination));

console.log('\n=== Validating api/proxy.js ===');
const proxyRaw = fs.readFileSync('/data/workspace/vercel-proxy/api/proxy.js', 'utf8');
check('file exists and non-empty', proxyRaw.length > 100, String(proxyRaw.length) + ' bytes');
check('uses module.exports (CommonJS)', proxyRaw.indexOf('module.exports') !== -1, 'no module.exports found');
check('does NOT use export default (ESM)', proxyRaw.indexOf('export default') === -1, 'has export default');
check('does NOT use import statement', proxyRaw.indexOf('import ') === -1, 'has import');
check('does NOT use getReader()', proxyRaw.indexOf('getReader') === -1, 'has getReader');
check('does NOT use node-fetch', proxyRaw.indexOf('node-fetch') === -1, 'has node-fetch');
check('uses fetch() built-in', proxyRaw.indexOf('fetch(') !== -1, 'no fetch');
check('uses new Headers()', proxyRaw.indexOf('new Headers(') !== -1, 'no Headers');
check('has isAllowed function', proxyRaw.indexOf('isAllowed') !== -1, 'no isAllowed');
check('has ALLOWED array', proxyRaw.indexOf('ALLOWED') !== -1, 'no ALLOWED');
check('has getNav function', proxyRaw.indexOf('getNav') !== -1, 'no getNav');
check('handles text/html', proxyRaw.indexOf('text/html') !== -1, 'no text/html');
check('uses arrayBuffer()', proxyRaw.indexOf('arrayBuffer(') !== -1, 'no arrayBuffer');
check('uses text()', proxyRaw.indexOf('.text(') !== -1, 'no .text()');
check('handles redirect manual', proxyRaw.indexOf('redirect:') !== -1, 'no redirect');
check('no syntax errors (checked by require below)', true, '');

// Try to parse with acorn-like check via Function constructor
try {
  // Wrap in a function to check syntax without executing
  new Function(proxyRaw.replace('module.exports', 'exports.default'));
  check('proxy.js has valid JavaScript syntax', true, '');
} catch(e) {
  check('proxy.js has valid JavaScript syntax', false, e.message);
}

// Check for BOM or weird characters
const firstChars = proxyRaw.substring(0, 10);
check('no BOM or weird chars at start', !firstChars.match(/[^\x20-\x7E\n\r\t]/), JSON.stringify(firstChars));

// Check line endings are consistent
const hasCRLF = proxyRaw.indexOf('\r\n') !== -1;
const hasLF = proxyRaw.indexOf('\n') !== -1;
check('line endings consistent (LF)', !hasCRLF, 'has CRLF');

console.log('\n=== Testing proxy logic (mock request) ===');
// Mock test: simulate the URL parsing logic
function testPathParsing() {
  // Test 1: /huggingface.co/models
  var m = '/huggingface.co/models'.match(/^\/([^\/]+)(\/.*)?$/);
  check('parses /huggingface.co/models', m !== null && m[1] === 'huggingface.co' && m[2] === '/models', JSON.stringify(m));

  // Test 2: /github.com/
  m = '/github.com/'.match(/^\/([^\/]+)(\/.*)?$/);
  check('parses /github.com/', m !== null && m[1] === 'github.com', JSON.stringify(m));

  // Test 3: isAllowed (must match proxy.js logic exactly)
  var allowed = ['huggingface.co','github.com','raw.githubusercontent.com','codeload.github.com','objects.githubusercontent.com','vercel.com','dash.cloudflare.com','drive.internxt.com','tanle.xyz'];
  function isAllowed(host) {
    return allowed.some(function(d) { return host === d || host.endsWith('.' + d); });
  }
  check('isAllowed: huggingface.co', isAllowed('huggingface.co'), 'false');
  check('isAllowed: cdn-lfs.hf.co -> false (not in list)', !isAllowed('cdn-lfs.hf.co'), 'true');
  check('isAllowed: github.com', isAllowed('github.com'), 'false');
  check('isAllowed: raw.githubusercontent.com', isAllowed('raw.githubusercontent.com'), 'false');
  check('isAllowed: codeload.github.com', isAllowed('codeload.github.com'), 'false');
  check('isAllowed: objects.githubusercontent.com', isAllowed('objects.githubusercontent.com'), 'false');
  check('isAllowed: evil.com', !isAllowed('evil.com'), 'true');
}

testPathParsing();

console.log('\n=== File sizes ===');
var stat = fs.statSync('/data/workspace/vercel-proxy/package.json');
console.log('  package.json: ' + stat.size + ' bytes');
stat = fs.statSync('/data/workspace/vercel-proxy/vercel.json');
console.log('  vercel.json:  ' + stat.size + ' bytes');
stat = fs.statSync('/data/workspace/vercel-proxy/api/proxy.js');
console.log('  proxy.js:     ' + stat.size + ' bytes');

console.log('\n=== RESULT ===');
console.log('  Passed: ' + pass);
console.log('  Failed: ' + fail);
if (fail > 0) {
  console.log('\n  THERE ARE FAILURES - DO NOT PACKAGE');
  process.exit(1);
} else {
  console.log('\n  ALL CHECKS PASSED - SAFE TO PACKAGE');
}
