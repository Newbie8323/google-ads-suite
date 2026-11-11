// =========================================================================
// SHARED SIDEBAR COLLAPSE CONTROLLER
// Quản lý việc thu gọn / mở rộng thanh menu sidebar dùng chung cho toàn bộ web
// =========================================================================

(function() {
  function getSafeStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function setSafeStorage(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      // Ignored if storage is blocked by tracking prevention
    }
  }

  // 1. Thực thi ngay lập tức để gắn class lên <html> ngăn chặn FOUC/giật animation
  const isCollapsed = getSafeStorage('sidebar_collapsed') === 'true';
  if (isCollapsed) {
    document.documentElement.classList.add('sidebar-is-collapsed');
  }

  // Bật lại transition mượt mà sau khi trang đã render xong trạng thái ban đầu
  window.initSidebarToggleEvent = function() {
    const sidebar = document.querySelector('.sidebar');
    const btnToggle = document.getElementById('btnToggleSidebar');
    if (!sidebar) return;

    if (isCollapsed) {
      sidebar.classList.add('collapsed');
      if (btnToggle) {
        btnToggle.innerHTML = `
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M13 5l7 7-7 7M5 5l7 7-7 7"/>
          </svg>
        `;
      }
    }

    requestAnimationFrame(() => {
      document.documentElement.classList.remove('sidebar-is-collapsed');
    });

    if (btnToggle && !btnToggle.dataset.bound) {
      btnToggle.dataset.bound = 'true';
      btnToggle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        const nowCollapsed = sidebar.classList.contains('collapsed');
        setSafeStorage('sidebar_collapsed', nowCollapsed);

        if (nowCollapsed) {
          btnToggle.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M13 5l7 7-7 7M5 5l7 7-7 7"/>
            </svg>
          `;
        } else {
          btnToggle.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/>
            </svg>
          `;
        }
      });

      // Lắng nghe phím tắt tiện ích: Ctrl + B hoặc phím '[' để thu gọn/mở rộng sidebar
      if (!window.__sidebarShortcutBound) {
        window.__sidebarShortcutBound = true;
        document.addEventListener('keydown', (e) => {
          // Tránh kích hoạt khi người dùng đang gõ phím trong ô input hoặc textarea
          const tag = e.target.tagName;
          if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;

          if ((e.ctrlKey && e.key.toLowerCase() === 'b') || e.key === '[') {
            e.preventDefault();
            btnToggle.click();
          }
        });
      }
    }
  };

  function initSidebarCollapse() {
    window.initSidebarToggleEvent();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSidebarCollapse);
  } else {
    initSidebarCollapse();
  }
})();

