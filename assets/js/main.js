// =======================================
//  GitHub Proxy 文档站 - 主脚本
// =======================================

// 主题切换
(function () {
  const toggle = document.getElementById('themeToggle');
  if (!toggle) return;

  const root = document.documentElement;
  const STORAGE_KEY = 'gh-proxy-theme';

  // 初始化主题
  const saved = localStorage.getItem(STORAGE_KEY);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (saved) {
    root.setAttribute('data-theme', saved);
  } else {
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  }

  // 更新按钮图标
  function updateIcon() {
    const theme = root.getAttribute('data-theme');
    toggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
  updateIcon();

  // 点击切换
  toggle.addEventListener('click', function () {
    const current = root.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem(STORAGE_KEY, next);
    updateIcon();
  });
})();

// 导航栏高亮当前页面
(function () {
  const links = document.querySelectorAll('.nav-link');
  const current = location.pathname.split('/').pop() || 'index.html';

  links.forEach(function (link) {
    const href = link.getAttribute('href');
    if (!href) return;
    const filename = href.split('/').pop();
    if (filename === current) {
      link.classList.add('active');
    }
  });
})();

// 侧边栏高亮当前页面
(function () {
  const links = document.querySelectorAll('.docs-sidebar a');
  const current = location.pathname.split('/').pop() || '';

  links.forEach(function (link) {
    const href = link.getAttribute('href');
    if (!href) return;
    const filename = href.split('/').pop();
    if (filename === current) {
      link.classList.add('active');
      // 展开父分类
      const parent = link.closest('.sidebar-group');
      if (parent) {
        parent.classList.add('expanded');
      }
    }
  });
})();

// 复制代码按钮
(function () {
  document.querySelectorAll('pre code, .code-block').forEach(function (block) {
    block.addEventListener('click', function () {
      const text = block.textContent;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function () {
          const original = block.style.opacity;
          block.style.opacity = '0.6';
          setTimeout(function () { block.style.opacity = original; }, 200);
        });
      }
    });
    block.title = '点击复制';
    block.style.cursor = 'pointer';
  });
})();
